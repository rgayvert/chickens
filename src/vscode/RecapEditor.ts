/**
 * This file is adapted from the VS Code PawDraw custome editor sample.
 *   https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample
 */

import * as vscode from "vscode";
import { Disposable, disposeAll } from "./dispose";
import { getNonce, getFullLocalPath, countDistinctCharacters, parsePath } from "./util";
import { window } from "vscode";
//import { mkdirSync, existsSync } from "fs";


/**
 * Recap edits are tracked within the webview, so we just stub out the edit records.
 */
interface RecapEdit {
  readonly kind: string;
}

/**
 *  The delegate which gets data from the webview for backups and saves.
 *  See RecapEditorProvider.openCustomDocument for how this is implemented.
 */
interface RecapDocumentDelegate {
  getFileData(): Promise<Uint8Array>;
}

/**
 *  LinkTargets are the destinations for links from notes or markdown to
 *  other text files in the project. The RecapEditorProvider is responsible for 
 *  showing the text files (see #showLink) and for passing along the latest
 *  selection to the webview (see #changeSelectionSubscription and #extractTargetText).
 *  In addition to the selection position, some text content may be saved with the 
 *  link to adjust the selection if the file has been modified.
 */
interface LinkTarget {
  file: string;
  selections: Array<Array<number>>;
  targetText: string;
  targetOffset: number;
}

/**
 * Define the document used for recap files.
 * Most of this class is taken directly from the PawDraw example.
 */
class RecapDocument extends Disposable implements vscode.CustomDocument {
  static async create(
    uri: vscode.Uri,
    backupId: string | undefined,
    delegate: RecapDocumentDelegate
  ): Promise<RecapDocument | PromiseLike<RecapDocument>> {
    // If we have a backup, read that. Otherwise read the resource from the workspace
    const dataFile = typeof backupId === "string" ? vscode.Uri.parse(backupId) : uri;
    const fileData = await RecapDocument.readFile(dataFile);
    return new RecapDocument(uri, fileData, delegate);
  }

  private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.scheme === "untitled") {
      return new Uint8Array();
    }
    return vscode.workspace.fs.readFile(uri);
  }

  private readonly _uri: vscode.Uri;

  private _documentData: Uint8Array;
  private _edits: Array<RecapEdit> = [];
  private _savedEdits: Array<RecapEdit> = [];

  private readonly _delegate: RecapDocumentDelegate;

  private constructor(uri: vscode.Uri, initialContent: Uint8Array, delegate: RecapDocumentDelegate) {
    super();
    this._uri = uri;
    this._documentData = initialContent;
    this._delegate = delegate;
  }

  public get uri() {
    return this._uri;
  }

  public get documentData(): Uint8Array {
    return this._documentData;
  }

  private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());
  /**
   * Fired when the document is disposed.
   */
  public readonly onDidDispose = this._onDidDispose.event;

  private readonly _onDidChangeDocument = this._register(
    new vscode.EventEmitter<{
      readonly content?: string;
      readonly edits: readonly RecapEdit[];
    }>()
  );
  /**
   * Fired to notify webviews that the document has changed.
   */
  public readonly onDidChangeContent = this._onDidChangeDocument.event;

  private readonly _onDidChange = this._register(
    new vscode.EventEmitter<{
      readonly label: string;
      undo(): void;
      redo(): void;
    }>()
  );
  /**
   * Fired to tell VS Code that an edit has occurred in the document.
   *
   * This updates the document's dirty indicator.
   */
  public readonly onDidChange = this._onDidChange.event;

  /**
   * Called by VS Code when there are no more references to the document.
   *
   * This happens when all editors for it have been closed.
   */
  dispose(): void {
    this._onDidDispose.fire();
    super.dispose();
  }

  /**
   * Called when the user edits the document in a webview.
   *
   * This fires an event to notify VS Code that the document has been edited.
   */
  makeEdit(_edit: RecapEdit) {
    this._onDidChange.fire({
      label: "edit",
      undo: async () => {
        this._onDidChangeDocument.fire({
          edits: [{ kind: "undo" }],
        });
      },
      redo: async () => {
        this._onDidChangeDocument.fire({
          edits: [{ kind: "redo" }],
        });
      },
    });
  }

  /**
   * Called by VS Code when the user saves the document.
   */
  async save(cancellation: vscode.CancellationToken): Promise<void> {
    await this.saveAs(this.uri, cancellation);
    this._savedEdits = Array.from(this._edits);
  }

  /**
   * Called by VS Code when the user saves the document to a new location.
   * Note that this is called periodically by the backup process.
   */
  async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
    const fileData = await this._delegate.getFileData();
    if (cancellation.isCancellationRequested) {
      return;
    }
    await vscode.workspace.fs.writeFile(targetResource, fileData);
  }

  /**
   * Called by VS Code when the user calls `revert` on a document.
   */
  async revert(_cancellation: vscode.CancellationToken): Promise<void> {
    const diskContent = await RecapDocument.readFile(this.uri);
    this._documentData = diskContent;
    this._edits = this._savedEdits;
    this._onDidChangeDocument.fire({
      content: new TextDecoder().decode(diskContent),
      edits: [{ kind: "revert" }],
    });
  }

  /**
   * Called by VS Code to backup the edited document.
   *
   * These backups are used to implement hot exit.
   */
  async backup(destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
    try {
      // input in the extension may cause a cancellation, so we need to put this in a try block
      await this.saveAs(destination, cancellation);
    } catch {
      // no-op
    }

    return {
      id: destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(destination);
        } catch {
          // noop
        }
      },
    };
  }
}

/**
 * Provider for recap editors.
 *
 * This provider is based on the PawDrawEditorProvider in the custom-editor-sample project, with
 * the following modifications:
 *   - we track the active webview using onDidChangeViewState;
 *   - we register a set of commands that apply to the active webview
 *   - we handle messages to show links
 *
 */
export class RecapEditorProvider implements vscode.CustomEditorProvider<RecapDocument> {
  // singleton instance of this provider
  public static providerInstance: RecapEditorProvider;

  // which webview panel has most recently been active
  private currentWebviewPanel: vscode.WebviewPanel | undefined;

  // the Recap document
  private currentDocument: RecapDocument | undefined;

  // history list of recap files (experimental), used by the #goBack command
  private recapHistory: Array<string> = [];

  // the list of all recap files in the project folder, used for quickPick
  private allRecapFiles: Array<string> = [];

  // the list of names of markdown-it plugins in the extension folder "markdown-it-plugins" 
  private markdownitPlugins: Array<string> = [];

  // defaults for target text saved in LinkTargets
  private DEFAULT_TARGET_TEXT_LENGTH = 40;
  private MIN_TARGET_TEXT_LEN = 10;

  private errorLog = vscode.window.createOutputChannel("recap-errors");

  public appendToErrorChannel(s: string) {
    this.errorLog.append("\n" + s);
  }

  // configuration options
  private includeTargetText = (vscode.workspace.getConfiguration("recap").get("includeTargetText") as boolean) || false;
  private targetTextLength =
    (vscode.workspace.getConfiguration("recap").get("targetTextLength") as number) || this.DEFAULT_TARGET_TEXT_LENGTH;
  private outputFileSpacing = vscode.workspace.getConfiguration("recap").get("outputFileSpacing") as number;

  // the commands made available to VS Code
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    vscode.commands.registerCommand("recap.addNote", () => {
      if (this.providerInstance.currentWebviewPanel) {
        this.providerInstance.postMessage(this.providerInstance.currentWebviewPanel, "addNote", {});
      }
    });

    vscode.commands.registerCommand("recap.linkNote", () => {
      if (this.providerInstance.currentWebviewPanel) {
        this.providerInstance.postMessage(this.providerInstance.currentWebviewPanel, "linkNote", {});
      }
    });

    vscode.commands.registerCommand("recap.goUp", () => {
      if (this.providerInstance.currentWebviewPanel) {
        this.providerInstance.postMessage(this.providerInstance.currentWebviewPanel, "goUp", {});
      }
    });

    vscode.commands.registerCommand("recap.goDown", () => {
      if (this.providerInstance.currentWebviewPanel) {
        this.providerInstance.postMessage(this.providerInstance.currentWebviewPanel, "goDown", {});
      }
    });

    vscode.commands.registerCommand("recap.toggleEdit", () => {
      if (this.providerInstance.currentWebviewPanel) {
        this.providerInstance.postMessage(this.providerInstance.currentWebviewPanel, "toggleEdit", {});
      }
    });

    // command uris- these gets invoked when a markdown link in a note is clicked

    vscode.commands.registerCommand("recap.showLink", (args) => {
      if (this.providerInstance.currentWebviewPanel) {
        this.providerInstance.postMessage(this.providerInstance.currentWebviewPanel, "showMarkdownLink", args);
      }
    });

    vscode.commands.registerCommand("recap.openrecap", async (args) => {
      if (this.providerInstance.currentWebviewPanel) {
        this.providerInstance.openRecapFile(args.file);
      }
    });

    this.providerInstance = new RecapEditorProvider(context);

    return vscode.window.registerCustomEditorProvider(RecapEditorProvider.viewType, this.providerInstance, {
      // Keep the webview alive when not visible. Not recommended to do this, so we may want to
      // remove this in the future.
      webviewOptions: {
        retainContextWhenHidden: true,
      },
      supportsMultipleEditorsPerDocument: false,
    });
  }

  private static readonly viewType = "recap.recap";

  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection();

  constructor(private readonly _context: vscode.ExtensionContext) {}

  //#region CustomEditorProvider

  // push the relative path to this file onto the history
  addToRecapHistory(uri: vscode.Uri) {
    this.recapHistory.push(uri.fsPath.substring(getFullLocalPath("").length + 1));
  }

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    _token: vscode.CancellationToken
  ): Promise<RecapDocument> {
    const document: RecapDocument = await RecapDocument.create(uri, openContext.backupId, {
      getFileData: async () => {
        const webviewsForDocument = Array.from(this.webviews.get(document.uri));
        if (!webviewsForDocument.length) {
          throw new Error("Could not find webview to save for");
        }
        const panel = webviewsForDocument[0];
        const response = await this.postMessageWithResponse<number[]>(panel, "getFileData", {});
        return new Uint8Array(response);
      },
    });

    this.addToRecapHistory(uri);

    this.allRecapFiles = await this.allRecapFilesInWorkspace();

    const listeners: vscode.Disposable[] = [];

    listeners.push(
      document.onDidChange((e) => {
        // Tell VS Code that the document has been edited by the user.
        this._onDidChangeCustomDocument.fire({
          document,
          ...e,
        });
      })
    );

    listeners.push(
      document.onDidChangeContent((e) => {
        // Send an undo or redo message
        for (const webviewPanel of this.webviews.get(document.uri)) {
          this.postMessage(webviewPanel, e.edits[0].kind, { content: e.content });
        }
      })
    );

    document.onDidDispose(() => disposeAll(listeners));

    return document;
  }

  /*
   * Target text extraction. The idea here is to pick a meaningful substring within
   * the given text.
   * First, we look for the first line that contains a reasonable number of distinct
   * characters (i.e., try to eliminate separator lines). If this fails, return the
   * first targetTextLength characters.
   *
   * Return the substring along with its line offset within the text.
   */
  extractTargetText(text: string): [string, number] {
    const threshold = 10;
    const maxLen = this.targetTextLength;
    const lines = text.split(/\r?\n/);
    const lineIndex = lines.findIndex((line) => countDistinctCharacters(line) > threshold);
    if (lineIndex !== -1) {
      return [lines[lineIndex].trim().substring(0, maxLen), lineIndex];
    }
    return [text.substring(0, this.targetTextLength as number), 0];
  }

  async resolveCustomEditor(
    document: RecapDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // update the active webview and document
    this.currentWebviewPanel = webviewPanel;
    this.currentDocument = document;

    // update the active webview when the view state changes
    webviewPanel.onDidChangeViewState(({ webviewPanel }) => {
      if (webviewPanel.active) {
        this.currentWebviewPanel = webviewPanel;
        this.currentDocument = document;
        this.postMessage(webviewPanel, "viewChanged", {});
      } else {
        this.postMessage(webviewPanel, "viewHidden", {});
      }
    });

    // always put the webview in the first column
    webviewPanel.reveal(vscode.ViewColumn.One, false);

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
      enableCommandUris: true,
    };

    // if there is a recap.css file in 
    const hasCustomCSS = await this.fileExists(this.customStylesURI(this.currentWebviewPanel!.webview));

    const pluginDir = this.currentWebviewPanel!.webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "markdown-it-plugins")
    );
    this.markdownitPlugins = await this.pluginsFilesInFolder(vscode.Uri.parse(pluginDir.path));

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, hasCustomCSS, this.markdownitPlugins);

    // set up the handler for messages from the webview
    webviewPanel.webview.onDidReceiveMessage((e) => this.onMessage(document, e, webviewPanel));

    // Note: at this point we wait to hear from the webview ("ready") before initializing

    //
    // Catch a change to the text selection in a text editor, and pass this along to the webview.
    //
    const changeSelectionSubscription = vscode.window.onDidChangeTextEditorSelection((e) => {
      const selections = e.textEditor.selections.map((sel) => [
        sel.start.line,
        sel.start.character,
        sel.end.line,
        sel.end.character,
      ]);
      const root = getFullLocalPath("");
      const filename = e.textEditor.document.uri.fsPath.slice(root.length + 1);

      // ignore selections made in the output view
      if (filename.endsWith("-recap-errors")) {
        return;
      }

      const [targetText, targetOffset] = this.extractTargetText(
        e.textEditor.document.getText(e.textEditor.selections[0])
      );

      this.postMessage(webviewPanel, "setLinkDest", {
        file: filename,
        selections: selections,
        text: targetText,
        offset: targetOffset,
      });
    });

    // Catch changes to the configuration
    const changeConfigurationSubscription = vscode.workspace.onDidChangeConfiguration((e) => {
      this.includeTargetText = vscode.workspace.getConfiguration("recap").get("includeTargetText") as boolean;
      this.targetTextLength = vscode.workspace.getConfiguration("recap").get("targetTextLength") as number;
      this.outputFileSpacing = vscode.workspace.getConfiguration("recap").get("outputFileSpacing") as number;
      if (this.targetTextLength < this.MIN_TARGET_TEXT_LEN) {
        this.targetTextLength = this.MIN_TARGET_TEXT_LEN;
      }

      // notify the webview of the new values
      this.postMessage(webviewPanel, "config", {
        includeTargetText: this.includeTargetText,
        targetTextLength: this.targetTextLength,
        outputFileSpacing: this.outputFileSpacing,
      });
    });

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeSelectionSubscription.dispose();
      changeConfigurationSubscription.dispose();
    });
  }

  /*
   * Called when we receive a "ready" message from the webview.
   * We read the entire contents of the recap file as a JSON object, and pass this
   * back to the webview along with the workspace root path.
   */
  private initWebView(document: RecapDocument, webviewPanel: vscode.WebviewPanel) {
    const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = (workspaceFolders ? webviewPanel.webview.asWebviewUri(workspaceFolders[0].uri) : "").toString();
    const runtime = this._context.extensionMode !== vscode.ExtensionMode.Development;

    this.postMessage(webviewPanel, "init", {
      contents: new TextDecoder().decode(document.documentData),
      editMode: editable,
      rootPath: rootPath,
      mayQuickPick: this.allRecapFiles.length > 1,
      mayGoBack: this.recapHistory.length > 1,
      includeTargetText: this.includeTargetText,
      targetTextLength: this.targetTextLength,
      outputFileSpacing: this.outputFileSpacing,
      runtime: runtime,
      markdownitPlugins: this.markdownitPlugins,
    });
  }

  /*
   * This is used to open another recap file via the recap:openrecap command uri
   */
  private async openRecapFile(file: string) {
    const opts = {
      viewColumn: this.currentWebviewPanel!.viewColumn,
    };
    const uri = vscode.Uri.file(getFullLocalPath(file));
    await vscode.commands.executeCommand("vscode.open", uri, opts);
  }

  private async allRecapFilesInWorkspace(): Promise<Array<string>> {
    const names = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }
    const rootPath = getFullLocalPath("");
    for (const uri of await vscode.workspace.findFiles("**/*.recap", "node_modules")) {
      names.push("." + uri.fsPath.substring(rootPath.length));
    }
    return names.sort();
  }

  private async pluginsFilesInFolder(folder: vscode.Uri): Promise<Array<string>> {
    const names = [];
    try {
      for (const [name, type] of await vscode.workspace.fs.readDirectory(folder)) {
        if (name.toLowerCase().endsWith(".js")) {
          names.push(name);
        }
      }
      return names;
    } catch (error) {
      return [];
    }
  }

  private goBack() {
    this.recapHistory.pop();
    this.openRecapFile("" + this.recapHistory[this.recapHistory.length - 1]);
  }

  private async quickPickOtherRecap() {
    const recapItems = this.allRecapFiles.map((n) => ({ label: n }));
    const result = await window.showQuickPick(recapItems);
    if (result) {
      this.openRecapFile(result.label);
    }
  }

  private async viewHelp() {
    const webview = this.currentWebviewPanel!.webview;
    const helpUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "media", "recap-help.recap"));
    const opts = {
      viewColumn: this.currentWebviewPanel!.viewColumn,
    };
    await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(helpUri.fsPath), opts);
  }

  private async fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(uri.path));
      return stat.type === vscode.FileType.File;
    } catch (error) {
      return false;
    }
  }

  private async filesInDirectory(uri: vscode.Uri): Promise<string[]> {
    try {
      const result = await vscode.workspace.fs.readDirectory(vscode.Uri.file(uri.path));
      return result.map((x) => x[0]);
    } catch (error) {
      return [];
    }
  }

  private async adjustRange(
    textDoc: vscode.TextDocument,
    range: vscode.Range,
    targetText: string,
    targetOffset: number
  ) {
    const lastLine = textDoc.lineAt(textDoc.lineCount - 1);
    const allText = textDoc.getText(new vscode.Range(0, 0, textDoc.lineCount, lastLine.text.length));
    const offset = allText.indexOf(targetText);
    if (offset !== -1) {
      // we found the target text
      const start = textDoc.positionAt(offset).translate(-targetOffset);
      const endLine = start.line + (range.end.line - range.start.line);
      const end = new vscode.Position(endLine, range.end.character);
      const adjustedRange = new vscode.Range(start, end);
      return adjustedRange;
    }
    return range;
  }

  /*
   * When requested by the webview, show the given link by opening the associated text document and
   * selecting the associated region.
   */
  private async showLink(_document: RecapDocument, linkTarget: LinkTarget, viewColumn: any) {
    const path = getFullLocalPath(linkTarget.file);
    const pathExists = await this.fileExists(vscode.Uri.file(path));
    if (!pathExists) {
      if (linkTarget.file) {
        window.showWarningMessage("Failed to read file: " + path);
      }
      return;
    }
    vscode.workspace.openTextDocument(path).then(
      (textDoc: vscode.TextDocument) => {
        // show the document in the tab to the right, keeping focus on the recap document
        vscode.window.showTextDocument(textDoc, viewColumn + 1, true).then(async (editor) => {
          if (!linkTarget.selections || linkTarget.selections.length === 0) {
            return;
          }

          const sel = linkTarget.selections[0];
          let range = new vscode.Range(sel[0], sel[1], sel[2], sel[3]);

          // compare the text in the document with the target text
          const text = textDoc.getText(range);

          if (linkTarget.targetText && text !== linkTarget.targetText) {
            // doesn't match, so try to find a better range
            range = await this.adjustRange(textDoc, range, linkTarget.targetText, linkTarget.targetOffset);
            editor.selection = new vscode.Selection(range.start, range.end);
          } else {
            // matches, so show all of the selections
            editor.selections = linkTarget.selections.map((s) => new vscode.Selection(s[0], s[1], s[2], s[3]));
          }
          // make the primary selection visible
          editor.revealRange(range);
        });
      },
      (error: any) => {
        window.showWarningMessage("Error reading file: " + path);
      }
    );
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<RecapDocument>
  >();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  public saveCustomDocument(document: RecapDocument, cancellation: vscode.CancellationToken): Thenable<void> {
    this.postMessage(this.currentWebviewPanel!, "saved", {});
    return document.save(cancellation);
  }

  public saveCustomDocumentAs(
    document: RecapDocument,
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken
  ): Thenable<void> {
    return document.saveAs(destination, cancellation);
  }

  public async revertCustomDocument(document: RecapDocument, cancellation: vscode.CancellationToken): Promise<void> {
    return document.revert(cancellation);
  }

  public backupCustomDocument(
    document: RecapDocument,
    context: vscode.CustomDocumentBackupContext,
    cancellation: vscode.CancellationToken
  ): Thenable<vscode.CustomDocumentBackup> {
    return document.backup(context.destination, cancellation);
  }

  //#endregion

  /**
   * 
   * Return the URI of the custom CSS file (if there is one). This file must be in the same folder
   * as the recap document.
   */
  private customStylesURI(webview: vscode.Webview): vscode.Uri {
    const documentPath = this.currentWebviewPanel!.webview.asWebviewUri(this.currentDocument!.uri).fsPath;
    const index = documentPath.lastIndexOf("/") + 1;
    const cssPath = documentPath.substring(0, index) + "recap.css";
    return webview.asWebviewUri(vscode.Uri.parse(cssPath));
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview, hasCustomCSS: boolean, mdPlugins: string[]): string {
    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    // Local script paths; these will also get a nonce
    const recapFile = this._context.extensionMode === vscode.ExtensionMode.Development ? "recap.js" : "recap.min.js";
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "media", recapFile));
    const markdownItUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "markdown-it.13.0.1.min.js")
    );
    const highlightJSUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "highlight.min.js")
    );
    let pluginList = "";
    mdPlugins.forEach((pluginFileName) => {
      const pluginUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._context.extensionUri, "media", "markdown-it-plugins", pluginFileName)
      );
      pluginList += `<script nonce="${nonce}" src="${pluginUri}"></script>\n`;
    });
    const purifyUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "media", "purify.min.js"));

    // Local css paths
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "media", "codicon.css"));
    const markdownCSSUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "markdown.css")
    );

    // include the custom CSS file (recap.css) if it exists
    let customStylesLink = "";
    if (hasCustomCSS && this.currentDocument) {
      const uri = this.customStylesURI(webview);
      customStylesLink = `<link href="${uri}" rel="stylesheet" />`;
    }

    return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Recap</title>

				<!--
        Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
        -->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

        <link href="${codiconsUri}" rel="stylesheet" />
        <link href="${markdownCSSUri}" rel="stylesheet" />
        ${customStylesLink}
			</head>

			<body>
      <script nonce="${nonce}" src="${highlightJSUri}"></script>
      <script nonce="${nonce}" src="${markdownItUri}"></script>
      ${pluginList}
      <script nonce="${nonce}" src="${purifyUri}"></script>
          <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
			
		  </html>`;
  }

  /*
   * Message communication with the webview
   */

  private _requestId = 1;
  private readonly _callbacks = new Map<number, (response: any) => void>();

  private postMessageWithResponse<R = unknown>(panel: vscode.WebviewPanel, type: string, body: any): Promise<R> {
    const requestId = this._requestId++;
    const p = new Promise<R>((resolve) => this._callbacks.set(requestId, resolve));
    panel.webview.postMessage({ type, requestId, body });
    return p;
  }

  private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
    panel.webview.postMessage({ type, body });
  }

  private defaultTargetFolderUri: vscode.Uri | undefined;

  /*
   * Message handlers
   */
  private onMessage(document: RecapDocument, message: any, webviewPanel: vscode.WebviewPanel) {
    switch (message.type) {
      case "ready":
        this.initWebView(document, webviewPanel);
        return;

      case "change":
        document.makeEdit(message as RecapEdit);
        return;

      // case "exportFiles":
      //   this.exportFiles(message.files, message.path, message.root);
      //   return;

      case "logError": {
        const [msg, url, line, col] = message.args;
        this.errorLog.appendLine(`Error: ${msg}\nScript: ${url}\nLine: ${line}\nColumn:${col}\n`);
        this.errorLog.show();
        return;
      }

      case "response": {
        const callback = this._callbacks.get(message.requestId);
        callback?.(message.body);
        return;
      }

      case "showLink":
        this.showLink(document, message.linkTarget, webviewPanel.viewColumn);
        return;

      case "exportFiles":
        this.exportRecapFiles(webviewPanel);
        return;

      case "quickPick":
        this.quickPickOtherRecap();
        return;

      case "viewHelp":
        this.viewHelp();
        return;

      case "goBack":
        this.goBack();
        return;

      case "warning":
        window.showWarningMessage(message.text);
        return;

      case "error":
        window.showErrorMessage(message.text);
        return;

      case "info":
        window.showInformationMessage(message.text);
        return;
    }
  }

  //
  // Prompt for an output directory, then prompt for a list of recap files.
  //
  private exportRecapFiles(webviewPanel: vscode.WebviewPanel) {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      openLabel: "Select output folder",
      canSelectFiles: false,
      canSelectFolders: true,
      defaultUri: this.defaultTargetFolderUri,
    };
    vscode.window.showOpenDialog(options).then((fileUriList) => {
      if (fileUriList && fileUriList[0]) {
        const recapItems = this.allRecapFiles.map((n) => ({ label: n }));
        vscode.window.showQuickPick(recapItems, { title: "Choose recaps to export", canPickMany: true }).then((recapList) => {
          if (recapList && recapList.length > 0) { 
            this.exportRecapFilesToFolder(fileUriList[0], recapList.map((entry) => entry.label));
          }
        });
      }
    });
  }

  //
  // Create the following file structure:
  //   <output directory>
  //     recaps.json
  //     static/
  //       index.html
  //       recap.min.js
  //       markdown.css
  //       codicon.css
  //       codicon.ttf
  //       recap-help.recap
  //
  // If the output directory is not inside the project root, export the recap files into 
  // a recaps folder, and the linked source files to a source folder.
  //   <output directory>
  //     recaps/
  //       recap1.recap
  //       recap2.recap
  //       ...
  //     source/
  //       <source files with relative paths preserved>
  //       
  private async exportRecapFilesToFolder(outputFolder: vscode.Uri, recapList: Array<string>) {

    await this.createRecapsJson(outputFolder, recapList);
    await this.copyStaticFiles(outputFolder);
    const rootPath = getFullLocalPath("");
    if (!outputFolder.fsPath.startsWith(rootPath)) {
      await this.copyRecapFiles(outputFolder, recapList);
      await this.copySourceFiles(outputFolder, recapList);
    }
    window.showInformationMessage("Done copying files to " + outputFolder);
  }

  // 
  // Create a recaps.json file in the output folder
  //
  private async createRecapsJson(outputFolder: vscode.Uri, recapList: Array<string>) {
    const jsonUri = vscode.Uri.joinPath(outputFolder, "recaps.json");
    const recaps = { "recaps": recapList.map((recapPath) => [parsePath(recapPath).name, recapPath]) };
    vscode.workspace.fs.writeFile(jsonUri, new TextEncoder().encode(JSON.stringify(recaps, null, 2)));
  }

  //
  // Copy the required static files to <output folder>/static
  //
  private async copyStaticFiles(outputFolder: vscode.Uri) {
    const mediaUri = vscode.Uri.file(vscode.Uri.joinPath(this._context.extensionUri, "media").path);
    const copyOptions = { overwrite: true };
    const staticFolderUri = vscode.Uri.joinPath(outputFolder, "static");
    const staticFiles = [
      "codicon.css",
      "codicon.ttf",
      "index.html",
      "markdown.css",
      "recap.min.js",
      "recap-help.recap"
    ];
    staticFiles.forEach(async (file) => {
      const srcUri = vscode.Uri.joinPath(mediaUri, file);
      const targetUri = vscode.Uri.joinPath(staticFolderUri, file);
      await vscode.workspace.fs.copy(srcUri, targetUri, copyOptions);
    });
  }

  private async copyRecapFiles(outputFolder: vscode.Uri, recapList: Array<string>) {
    // TODO
  }

  private async copySourceFiles(outputFolder: vscode.Uri, recapList: Array<string>) {
    // TODO
  }


  /*
   * Recap Export
   *
   * Populate the given output folder with files that will provide a view of the current
   * recap file from the web when loaded onto a webserver. The structure of this folder is:
   *    <output_dir>
   *      static/
   *         <all of the js & css files needed>
   *      <recap name>
   *         index.html
   *         <recap file>
   *         <src files>
   */

  /*

  private async exportFiles(fileList: Array<string>, outputPath: string, srcRoot: string) {
    const docUri = this.currentDocument!.uri;
    const docFileName = lastElement(docUri.path.split("/"));
    const docBaseName = docFileName.split(".")[0];
    const mediaUri = vscode.Uri.file(vscode.Uri.joinPath(this._context.extensionUri, "media").path);

    const rootUri = vscode.Uri.file(vscode.Uri.parse(srcRoot).path);
    const targetFolderUri = vscode.Uri.file(outputPath);
    this.defaultTargetFolderUri = targetFolderUri;
    const targetFilesFolderUri = vscode.Uri.joinPath(targetFolderUri, docBaseName);
    const copyOptions = { overwrite: true };

    // copy the source files (link targets) into the <recap name> folder
    fileList.forEach(async (srcPath) => {
      const fullSrcUri = vscode.Uri.joinPath(rootUri, srcPath);
      const fullTargetUri = vscode.Uri.joinPath(targetFilesFolderUri, srcPath);
      await vscode.workspace.fs.copy(fullSrcUri, fullTargetUri, copyOptions);
    });
    // copy the recap file into the <recap name> folder
    const targetRecapUri = vscode.Uri.joinPath(targetFilesFolderUri, docFileName);
    await vscode.workspace.fs.copy(docUri, targetRecapUri, copyOptions);

    // copy and modify index.html
    const indexSrcUri = vscode.Uri.joinPath(mediaUri, "web", "index.html");
    const indexFileData = await vscode.workspace.fs.readFile(indexSrcUri);
    const indexFileContents = new TextDecoder().decode(indexFileData);
    const newIndexFileContents = indexFileContents.replace("{RECAPFILE}", docFileName);
    const indexTargetUri = vscode.Uri.joinPath(targetFilesFolderUri, "index.html");
    vscode.workspace.fs.writeFile(indexTargetUri, new TextEncoder().encode(newIndexFileContents));

    // copy the required static files into the <output_dir>/static folder
    const staticFiles = [
      "codicon.css",
      "codicon.ttf",
      "highlight.min.js",
      "markdown-it.13.0.1.min.js",
      "markdown.css",
      "purify.min.js",
      "recap.js",
      "recap-help.recap",
      "recap-icon.png",
      "markdown-it-plugins/markdown-it-deflist.min.js",
      "markdown-it-plugins/markdown-it-emoji.min.js",
      "markdown-it-plugins/markdown-it-footnote.min.js",
      "markdown-it-plugins/markdown-it-sub.min.js",
      "markdown-it-plugins/markdown-it-sup.min.js",
    ];
    const staticFolderUri = vscode.Uri.joinPath(targetFolderUri, "static");

    staticFiles.forEach(async (file) => {
      const srcUri = vscode.Uri.joinPath(mediaUri, file);
      const targetUri = vscode.Uri.joinPath(staticFolderUri, file);
      await vscode.workspace.fs.copy(srcUri, targetUri, copyOptions);
    });

    window.showInformationMessage("Done copying files to " + outputPath);
  }

  */



}

/**
 * Tracks all webviews.
 */
class WebviewCollection {
  private readonly _webviews = new Set<{
    readonly resource: string;
    readonly webviewPanel: vscode.WebviewPanel;
  }>();

  public size() {
    return this._webviews.size;
  }

  /**
   * Get all known webviews for a given uri.
   */
  public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
    const key = uri.toString();
    for (const entry of this._webviews) {
      if (entry.resource === key) {
        yield entry.webviewPanel;
      }
    }
  }

  /**
   * Add a new webview to the collection.
   */
  public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
    const entry = { resource: uri.toString(), webviewPanel };
    this._webviews.add(entry);

    webviewPanel.onDidDispose(() => {
      this._webviews.delete(entry);
    });
  }
}
