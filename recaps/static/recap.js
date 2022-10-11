var Recap;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 732:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const LinkTarget_1 = __webpack_require__(361);
class Extension {
    static isWebContext() {
        return this.vscode === null;
    }
    static inWebDarkMode() {
        return this.isWebContext() && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    initMessages(specs) {
        this.messageSpecs = specs;
        window.addEventListener("message", async (event) => this.handleMessage(event));
    }
    handleMessage(event) {
        const spec = this.messageSpecs[event.data.type];
        if (spec) {
            spec.bind(this)(event.data);
        }
    }
    // Messages to the RecapEditor
    // tell the extension to mark the recap file as modified
    static documentChanged(kind = "content") {
        console.log("documentChanged");
        this.vscode?.postMessage({ type: "change", kind: kind });
    }
    // static exportSourceFiles(fileList: string[], exportPath: string, srcRoot: string) {
    //   this.vscode?.postMessage({ type: "exportFiles", files: fileList, path: exportPath, root: srcRoot });
    // }
    // static getOutputDirectory() {
    //   this.vscode?.postMessage({ type: "getFolder" });
    // }
    static exportRecapFiles() {
        this.vscode?.postMessage({ type: "exportFiles" });
    }
    static publishToGithubPages() {
        this.vscode?.postMessage({ type: "publishToGithubPages" });
    }
    static goToPreviousRecapFile() {
        this.vscode?.postMessage({ type: "goBack" });
    }
    static logWebviewError(args) {
        this.vscode?.postMessage({ type: "logError", args });
    }
    // static quickPickRecapFile() {
    //   if (this.isWebContext()) {
    //     (ZView.rootView as RecapWebRoot).loadNextRecapFile();
    //   } else {
    //     this.vscode?.postMessage({ type: "quickPick" });
    //   }
    // }
    static openOtherRecapFile(path) {
        this.vscode?.postMessage({ type: "open", path: path });
    }
    static returnFileData(data, requestId) {
        this.vscode?.postMessage({
            type: "response",
            requestId: requestId,
            body: Array.from(new TextEncoder().encode(data)),
        });
    }
    static showErrorMessage(text) {
        this.vscode?.postMessage({ type: "error", text: text });
    }
    static showInformationMessage(text) {
        this.vscode?.postMessage({ type: "info", text: text });
    }
    static showLink(linkTarget) {
        if (this.isWebContext()) {
            Extension.showLinkAction?.performWith(linkTarget);
        }
        else {
            this.vscode?.postMessage({ type: "showLink", linkTarget: linkTarget });
        }
    }
    static showWarningMessage(text) {
        this.vscode?.postMessage({ type: "warning", text: text });
    }
    static viewHelp() {
        this.vscode?.postMessage({ type: "viewHelp" });
    }
    static webviewIsReady() {
        this.vscode?.postMessage({ type: "ready" });
    }
    // in web context, markdown links are hrefs with javascript calls to showLink()
    static showMarkdownLink(link) {
        const idx = link.indexOf(":");
        const file = link.substring(2, idx);
        const selections = LinkTarget_1.default.recreateLinkSelections(link.substring(idx + 1));
        Extension.showLinkAction?.performWith(new LinkTarget_1.default(file, selections));
    }
}
exports["default"] = Extension;


/***/ }),

/***/ 779:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const Extension_1 = __webpack_require__(732);
const LinkTarget_1 = __webpack_require__(361);
/*
 * Incoming messages:
 *   addNote
 *   getFileData
 *   goDown
 *   goUp
 *   linkNote
 *   loadDocument
 *   //outputFolder
 *   redo
 *   saved
 *   setLinkDest
 *   showMarkdownLink
 *   toggleEdit
 *   undo
 *   viewChanged
 *   viewHidden
 */
class NotesContainerExtension extends Extension_1.default {
    constructor(params) {
        super();
        this.params = params;
        this.initMessages({
            addNote: this.addNote,
            //exportRecapList: this.exportRecapList,
            getFileData: this.getFileData,
            goDown: this.goDown,
            goUp: this.goUp,
            linkNote: this.linkNote,
            //loadDocument: this.loadDocument,
            //outputFolder: this.exportWebBundle,
            redo: this.redo,
            revert: this.revert,
            saved: this.documentWasSaved,
            setLinkDest: this.setLinkDest,
            showMarkdownLink: this.showMarkdownLink,
            toggleEdit: this.toggleEdit,
            undo: this.undo,
            viewHidden: this.viewHidden,
        });
    }
    static initialize(params) {
        this.instance = new NotesContainerExtension(params);
    }
    addNote() {
        if (this.params.editModeProp.get()) {
            this.params.addNoteAction.perform();
        }
    }
    documentWasSaved() {
        this.params.documentWasSavedAction.perform();
    }
    // exportWebBundle(eventData: any) {
    //   this.params.exportWebBundleToFolderAction.performWith(eventData.body);
    // }
    // exportRecapList(eventData: any) {
    //   //console.log(eventData.body);
    //   this.params.exportRecapListAction.performWith(eventData.body);
    // }
    getFileData(eventData) {
        const doc = this.params.documentProp.get();
        if (!doc) {
            return;
        }
        this.params.prepareToSaveAction.perform();
        const json = doc.getJsonData();
        const data = JSON.stringify(json, null, this.params.outputFileSpacingProp.get());
        Extension_1.default.returnFileData(data, eventData.requestId);
    }
    goDown() {
        this.params.goDownAction.perform();
    }
    goUp() {
        this.params.goUpAction.perform();
    }
    linkNote() {
        this.params.createNoteLinkAction.perform();
    }
    // loadDocument(eventData: any) {
    //   this.params.loadDocumentAction.performWith(eventData.body.content);
    // }
    redo() {
        this.params.redoAction.perform();
    }
    revert(eventData) {
        this.params.revertAction.performWith(eventData.body.content);
    }
    setLinkDest(eventData) {
        const { file, selections, text, offset } = eventData.body;
        this.params.mostRecentSelectionProp.set(new LinkTarget_1.default(file, selections, text, offset));
    }
    // the extension has passed a string of the form src/index.js:1,2,3,4
    showMarkdownLink(eventData) {
        // repackage the string and send back a linkTarget
        const parts = eventData.body.file.split(":");
        const linkTarget = new LinkTarget_1.default(parts[0], LinkTarget_1.default.recreateLinkSelections(parts[1]));
        this.params.showMarkdownLinkAction.performWith(linkTarget);
    }
    toggleEdit() {
        this.params.toggleEditAction.perform();
    }
    undo() {
        this.params.undoAction.perform();
    }
    viewChanged() {
        this.params.viewChangedAction.perform();
    }
    viewHidden() {
        this.params.viewHiddenAction.perform();
    }
}
exports["default"] = NotesContainerExtension;


/***/ }),

/***/ 896:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const Extension_1 = __webpack_require__(732);
/*
 * Incoming messages:
 *   config
 *   init
 *   quickPick
 */
class RootExtension extends Extension_1.default {
    constructor(params) {
        super();
        this.params = params;
        this.initMessages({
            config: this.updateConfig,
            init: this.initWebView,
            quickPick: this.quickPick,
        });
        Extension_1.default.webviewIsReady();
    }
    static initialize(params) {
        this.instance = new RootExtension(params);
    }
    initWebView(eventData) {
        this.params.initWebViewAction.performWith(eventData.body);
    }
    quickPick(eventData) {
        this.params.quickPickAction.perform();
    }
    updateConfig(eventData) {
        this.params.updateConfigAction.performWith(eventData.body);
    }
}
exports["default"] = RootExtension;


/***/ }),

/***/ 361:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LinkTarget = void 0;
const z_1 = __webpack_require__(813);
const ZInterval_1 = __webpack_require__(961);
class LinkTarget {
    constructor(file, selections, targetText = "", targetOffset = 0) {
        this.text = "";
        this.html = "";
        this.file = file;
        this.selections = selections || [];
        this.targetText = targetText;
        this.targetOffset = targetOffset;
    }
    normalizedFile() {
        return this.file.startsWith("./") ? this.file : "./" + this.file;
    }
    asString() {
        if (!this.isValid()) {
            return "";
        }
        if (!this.hasSelections()) {
            return this.file;
        }
        return this.file + ":" + this.selections.flat().join(",");
    }
    describeOneSelection(sel) {
        if (sel[0] === sel[2]) {
            return "line " + (sel[0] + 1);
        }
        return "lines " + (sel[0] + 1) + " - " + (sel[2] + 1);
    }
    describeSelections() {
        if (this.selections.length === 1) {
            return this.describeOneSelection(this.selections[0]);
        }
        return this.describeOneSelection(this.selections[0]) + " + more";
    }
    description(invalidText = "(no link)") {
        if (!this.isValid()) {
            return invalidText;
        }
        if (!this.hasSelections()) {
            return this.file;
        }
        return this.file + ", " + this.describeSelections();
    }
    hasSelections() {
        return this.selections && this.selections.length > 0;
    }
    isValid() {
        return Boolean(this.file);
    }
    matches(linkTarget) {
        return (this.normalizedFile() === linkTarget.normalizedFile() && this.selections.toString() === linkTarget.selections.toString());
    }
    static recreateLinkSelections(s) {
        if (!s || s.length == 0) {
            return [];
        }
        const flatSelections = s.split(",").map((e) => parseInt(e));
        const answer = [];
        while (flatSelections.length > 0) {
            answer.push(flatSelections.splice(0, 4));
        }
        return answer;
    }
    getSelectionInterval(sel) {
        if (!this.text) {
            return ZInterval_1.default.nullInterval;
        }
        const lines = this.text.split("\n");
        const start = z_1.default.sum(lines.slice(0, sel[0]), (val) => val.length + 1) + sel[1];
        const end = z_1.default.sum(lines.slice(0, sel[2]), (val) => val.length + 1) + sel[3];
        return ZInterval_1.default.create(start, end);
    }
}
exports.LinkTarget = LinkTarget;
LinkTarget.emptyLinkTarget = new LinkTarget("", [], "", 0);
exports["default"] = LinkTarget;


/***/ }),

/***/ 694:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const z_1 = __webpack_require__(813);
const RecapNote_1 = __webpack_require__(851);
class RecapDocument {
    constructor(text) {
        this.annotations = [];
        this.changed = false;
        this.nextID = 0;
        this.valid = false;
        this.title = "untitled";
        this.author = "unknown";
        this.creationDate = new Date();
        this.description = "";
        this.load(text);
        this.changed = false;
    }
    isEmpty() {
        return this.isValid() && this.annotations.length === 0;
    }
    isValid() {
        return this.valid;
    }
    setFileName(fileName) {
        this.fileName = fileName;
        if (!this.title) {
            this.title = fileName;
        }
    }
    load(text) {
        this.valid = false;
        try {
            const jsonData = JSON.parse(text || "{}");
            const rawAnnotations = (jsonData.annotations || []);
            this.annotations = rawAnnotations.map((a) => new RecapNote_1.default(a));
            this.annotations.forEach((note, index) => note.id = index);
            this.nextID = this.annotations.length;
            this.valid = true;
            this.title = jsonData.title || "";
            this.author = jsonData.author || "";
            this.creationDate = jsonData.creationDate || (new Date()).toDateString();
            this.description = jsonData.description || "";
        }
        catch {
            //
        }
    }
    getInfoValues() {
        return {
            title: this.title,
            author: this.author,
            description: this.description
        };
    }
    setInfoValues(values) {
        this.title = values.title;
        this.author = values.author;
        this.description = values.description;
    }
    getJsonData() {
        this.updateResources();
        return {
            annotations: this.annotations,
            title: this.title,
            author: this.author,
            creationDate: this.creationDate,
            description: this.description,
        };
    }
    setDocumentChanged(value) {
        this.changed = value;
    }
    addNoteAtIndex(note, index) {
        if (index === -1) {
            this.annotations = [...this.annotations, note];
        }
        else {
            this.annotations = z_1.default.splice(this.annotations, index + 1, 0, note);
        }
        return note;
    }
    createNewNote() {
        return RecapNote_1.default.createEmptyNote(this.nextNoteID());
    }
    indexOfNote(note) {
        return this.annotations.indexOf(note);
    }
    addNoteAfter(selectedNote) {
        const newNote = RecapNote_1.default.createEmptyNote(this.nextNoteID());
        return this.addNoteAtIndex(newNote, selectedNote ? this.annotations.indexOf(selectedNote) : -1);
    }
    deleteNote(note) {
        if (this.annotations.length > 1) {
            this.annotations = this.annotations.filter((n) => n !== note);
        }
    }
    moveNoteDown(note) {
        const index = this.annotations.indexOf(note);
        if (index > 0) {
            this.annotations = z_1.default.moveElementDown(this.annotations, index);
        }
    }
    moveNoteUp(note) {
        const index = this.annotations.indexOf(note);
        if (index > 0) {
            this.annotations = z_1.default.moveElementUp(this.annotations, index);
        }
    }
    nextNoteID() {
        this.nextID = this.nextID + 1;
        return this.nextID;
    }
    numberOfNotes() {
        return this.annotations.length;
    }
    allLinkTargetFileNames() {
        //@ts-ignore
        return [...new Set(this.annotations.reduce((prev, cur) => [...prev, ...cur.allTargetFileNames()], []))];
    }
    updateResources() {
        this.annotations.forEach((note) => note.updateResources());
    }
    allResources() {
        //@ts-ignore
        return [...new Set(this.annotations.reduce((prev, cur) => [...prev, ...cur.resources], []))];
    }
}
RecapDocument.nullDocument = new RecapDocument("{}");
exports["default"] = RecapDocument;


/***/ }),

/***/ 851:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const MarkdownConverter_1 = __webpack_require__(363);
const LinkTarget_1 = __webpack_require__(361);
class RecapNote {
    constructor(annotation) {
        this.changed = false;
        this.markdownLinkTargets = [];
        this.resources = [];
        this.contents = annotation.contents;
        this.id = annotation.id;
        // TODO: does this make sense?
        // this.changed = annotation.changed;
        if ("file" in annotation) {
            // old format
            this.primaryLinkTarget = new LinkTarget_1.default(annotation.file, annotation.selections || []);
        }
        else {
            const linkTarget = annotation.primaryLinkTarget;
            if (linkTarget) {
                this.primaryLinkTarget = new LinkTarget_1.default(linkTarget.file, linkTarget.selections, linkTarget.targetText, linkTarget.targetOffset);
            }
            else {
                this.primaryLinkTarget = LinkTarget_1.default.emptyLinkTarget;
            }
            if (annotation.markdownLinkTargets) {
                this.markdownLinkTargets = annotation.markdownLinkTargets.map((t) => new LinkTarget_1.default(t.file, t.selections, t.targetText, t.targetOffset));
            }
            else {
                this.markdownLinkTargets = [];
            }
            this.resources = annotation.resources || [];
        }
    }
    static createEmptyNote(id) {
        const emptyAnnotation = {
            changed: false,
            contents: this.defaultContents,
            id: id,
            file: '',
            markdownLinkTargets: [],
            primaryLinkTarget: LinkTarget_1.default.emptyLinkTarget,
        };
        return new RecapNote(emptyAnnotation);
    }
    setContents(mdText) {
        this.contents = mdText;
        this.resources = Array.from(MarkdownConverter_1.default.extractResources(this.contents));
    }
    updateResources() {
        this.setContents(this.contents);
    }
    hasPrimaryLinkTarget() {
        return this.primaryLinkTarget && this.primaryLinkTarget.isValid();
    }
    setPrimaryLinkTarget(linkTarget) {
        this.primaryLinkTarget = linkTarget;
    }
    primaryLinkDescription() {
        return this.hasPrimaryLinkTarget() ? this.primaryLinkTarget.description() : "(no link)";
    }
    addMarkdownTarget(linkTarget) {
        this.markdownLinkTargets.push(linkTarget);
    }
    allTargetFileNames() {
        const fileNames = new Set(this.markdownLinkTargets.map((target) => target.file));
        if (this.hasPrimaryLinkTarget()) {
            fileNames.add(this.primaryLinkTarget.file);
        }
        return [...new Set(fileNames)];
    }
}
RecapNote.defaultContents = "## untitled";
exports["default"] = RecapNote;


/***/ }),

/***/ 363:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const z_1 = __webpack_require__(813);
const Extension_1 = __webpack_require__(732);
/*
 * Markdown conversion
 */
class MarkdownConverter {
    constructor() {
        // markdown-it gets loaded as a window attribute
        this.markdownit = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
            highlight: function (str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(str, { language: lang }).value;
                    }
                    catch {
                        //
                    }
                }
                return ""; // use external default escaping
            },
        });
        // pluginFileNames are of the form "markdown-it-deflist.min.js"
        MarkdownConverter.pluginFileNames.forEach((pluginFileName) => {
            const parts = pluginFileName.split(/[-.]+/);
            if (parts.length >= 3) {
                const pluginName = parts[2];
                //@ts-ignore
                const plugin = window["markdownit" + z_1.default.capitalizeFirstLetter(pluginName)];
                if (plugin) {
                    this.markdownit.use(plugin);
                    console.log("Added plugin " + pluginName);
                }
            }
        });
    }
    static convert(text, centerFirstLine, rootPath) {
        if (!this.converter) {
            this.converter = new MarkdownConverter();
        }
        return this.converter.convertText(text, centerFirstLine, rootPath);
    }
    static sanitize(text) {
        return DOMPurify.sanitize(text);
    }
    static highlight(text) {
        return this.sanitize(hljs.highlightAuto(text).value);
    }
    convertText(text, centerFirstLine, rootPath) {
        this.rootPath = rootPath;
        if (centerFirstLine) {
            const firstLine = z_1.default.firstLine(text);
            const rest = text.substring(firstLine.length + 1);
            return `<div class="recap-centered-title">
            ${this.convertOneChunk(firstLine)}
            </div>
            ${this.convertOneChunk(rest)}`;
        }
        else {
            return this.convertOneChunk(text);
        }
    }
    convertOneChunk(text) {
        const html = DOMPurify.sanitize(this.fixAnchorPaths(this.fixImagePaths(this.markdownit.render(text))));
        return this.fixAnchors(html);
    }
    render(text) {
        return this.markdownit.render(text);
    }
    fixAnchors(html) {
        if (!html.includes("<a ")) {
            return html;
        }
        const tempElt = document.createElement("div");
        tempElt.innerHTML = html;
        Array.from(tempElt.querySelectorAll("a")).forEach((a) => {
            const href = a.getAttribute("href");
            if (href) {
                a.href = this.fixAnchorHref(href);
            }
        });
        return tempElt.innerHTML;
    }
    /*
     * Transform each non-HTTP anchor path into a command URI.
     */
    fixAnchorHref(href) {
        if (href.startsWith("http")) {
            return href;
        }
        let file = href;
        let selections = "";
        const idx = href.indexOf(":");
        if (idx !== -1) {
            file = href.substring(0, idx);
            selections = href.substring(idx);
        }
        if (Extension_1.default.isWebContext()) {
            if (file.toLowerCase().endsWith(".recap")) {
                return `index.html?recap=${file}`;
            }
            return `javascript:Recap.showLink("${file}${selections}")`;
        }
        // if the file has a .recap extension, use openrecap, otherwise showLink
        const parts = file.split(".");
        const prefix = parts[parts.length - 1] === "recap" ? "openrecap?" : "showLink?";
        const fspec = encodeURIComponent(`[{"file":"${file}${selections}"}]`);
        return "command:recap." + prefix + fspec;
    }
    /*
     * Make sure that each file path in a link begins with "./" so
     * that it won't be removed by dompurify.
     */
    fixAnchorPath(href) {
        if (href.startsWith("http")) {
            return href;
        }
        const dotSlash = href.startsWith("./") ? "" : "./";
        return dotSlash + href;
    }
    fixAnchorPaths(html) {
        if (!html.includes("<a ")) {
            return html;
        }
        const tempElt = document.createElement("div");
        tempElt.innerHTML = html;
        Array.from(tempElt.querySelectorAll("a")).forEach((a) => {
            const href = a.getAttribute("href");
            if (href) {
                a.href = this.fixAnchorPath(href);
            }
        });
        return tempElt.innerHTML;
    }
    // prefix image src attributes with rootPath so that vscode allows it
    fixImagePaths(html) {
        if (!html.includes("<img")) {
            return html;
        }
        const tempElt = document.createElement("div");
        tempElt.innerHTML = html;
        Array.from(tempElt.querySelectorAll("img")).forEach((img) => {
            // note: img.src returns an absolute path, so use getAttribute()
            const slash = this.rootPath?.endsWith("/") ? "" : "/";
            img.src = this.rootPath + slash + img.getAttribute("src");
        });
        return tempElt.innerHTML;
    }
    static extractResources(mdText) {
        const html = this.converter.fixImagePaths(this.converter.render(mdText));
        const tempElt = document.createElement("div");
        tempElt.innerHTML = html;
        const paths = new Set;
        Array.from(tempElt.querySelectorAll("a")).forEach((a) => {
            let href = a.getAttribute("href");
            if (href && !href.startsWith("http")) {
                if (href.includes(":")) {
                    href = href.substring(0, href.indexOf(":"));
                }
                if (href.startsWith("./")) {
                    href = href.substring(2, href.length);
                }
                paths.add(href);
            }
        });
        Array.from(tempElt.querySelectorAll("img")).forEach((img) => {
            let path = img.getAttribute("src");
            if (path) {
                const root = this.converter.rootPath || "";
                if (path.startsWith(root)) {
                    path = path.substring(root.length + 1);
                }
                paths.add(path);
            }
        });
        return paths;
    }
}
exports["default"] = MarkdownConverter;


/***/ }),

/***/ 892:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const RecapToolbar_1 = __webpack_require__(382);
class EditToolbar extends RecapToolbar_1.default {
    constructor(name, params) {
        super(name, params);
        this.params = params;
    }
    buttonCSS() {
        return "recap-edit-button";
    }
    render() {
        this
            .addButton("addNote", "add", "Add a new note", this.params.addNoteAction)
            .addButton("deleteNote", "remove", "Remove selected note", this.params.deleteNoteAction)
            .addBlank(1)
            .addButton("createNoteLink", "link-external", "Link note to most recent selection", this.params.createNoteLinkAction)
            .addButton("removeNoteLink", "discard", "Remove link", this.params.removeNoteLinkAction)
            .addBlank(2)
            .addButton("moveDown", "chevron-down", "Move note down", this.params.moveDownAction)
            .addButton("moveUp", "chevron-up", "Move note up", this.params.moveUpAction)
            .addText("linkDetail", "recap-link-detail", this.params.linkDetailProp)
            .addButton("copyMarkdown", "markdown", "Copy markdown text", this.params.copyMarkdownAction)
            .addButton("copyHTML", "code", "Copy generated HTML", this.params.copyHTMLAction)
            .addBlank(3)
            .addButton("createMarkdownLink", "link", "Create markdown link", this.params.createMarkdownLinkAction);
        this.addWrapping("group-1", "recap-button-group-grow-1", "addNote", "deleteNote", "blank-1", "createNoteLink", "removeNoteLink", "blank-2", "moveUp", "moveDown", "linkDetail").addWrapping("group-2", "recap-button-group", "copyMarkdown", "copyHTML", "blank-3", "createMarkdownLink");
    }
}
EditToolbar.defaultStyle = "recap-edit-toolbar";
exports["default"] = EditToolbar;


/***/ }),

/***/ 817:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const z_1 = __webpack_require__(813);
class LinkTargetView extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.linkTargetProp = params.linkTargetProp;
    }
    scrollRangeIntoView(range) {
        let node;
        node = range.startContainer;
        if (node.nodeType == 1) {
            node = node.childNodes[range.startOffset];
        }
        while (node && node.nodeType != 1) {
            node = node.previousSibling || node.parentNode;
        }
        if (node instanceof Element) {
            z_1.default.scrollElementIntoViewIfNeeded(node);
        }
    }
    selectTargetRanges(linkTarget) {
        const viewSelection = window.getSelection();
        viewSelection?.removeAllRanges();
        // multiple ranges only appear to be supported on Firefox
        linkTarget.selections.forEach((sel) => {
            const range = this.convertIntervalToRange(linkTarget.getSelectionInterval(sel));
            if (range) {
                viewSelection?.addRange(range);
                this.scrollRangeIntoView(range);
            }
        });
    }
    render() {
        const linkTarget = this.linkTargetProp.get();
        if (linkTarget) {
            this.setInnerHTML(linkTarget.html);
            this.selectTargetRanges(linkTarget);
        }
    }
}
LinkTargetView.defaultStyle = "link-target-view";
exports["default"] = LinkTargetView;


/***/ }),

/***/ 512:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const Extension_1 = __webpack_require__(732);
const RecapToolbar_1 = __webpack_require__(382);
class MainToolbar extends RecapToolbar_1.default {
    constructor(name, params) {
        super(name, params);
        this.params = params;
        this.toggleEditStyle = this.createProp(() => `recap-toolbar-button${params.editModeProp.get() ? "-editable" : ""}`);
        this.toggleViewHoverText = this.createProp(() => `Switch to ${params.presentationProp.get() ? "view" : "presentation"} mode`);
    }
    buttonCSS() {
        return "recap-toolbar-button";
    }
    render() {
        this.addButton("expandAll", "expand-all", "Expand all notes", this.params.expandAllAction)
            .addButton("collapseAll", "collapse-all", "Collapse all notes", this.params.collapseAllAction)
            .addBlank(1)
            .addButton("toggleView", "list-flat", this.toggleViewHoverText, this.params.toggleViewAction)
            .addBlank(2)
            .addButton("increaseSize", "zoom-in", "Increase size", this.params.increaseSizeAction)
            .addButton("decreaseSize", "zoom-out", "Decrease size", this.params.decreaseSizeAction)
            .addButton("goDown", "arrow-down", "Go to next note", this.params.goDownAction)
            .addButton("goUp", "arrow-up", "Go to previous note", this.params.goUpAction)
            .addButton("quickPick", "arrow-circle-right", "Open other recap file", this.params.quickPickAction)
            .addButton("info", "info", "Show recap info", this.params.recapInfoAction);
        if (Extension_1.default.isWebContext()) {
            this.addBlank(3);
            //.addButton("toggleTargetView", "layout-sidebar-right", "Toggle target view", this.params.toggleTargetViewAction);
        }
        else {
            this.addButton("viewHelp", "question", "View Recap help", this.params.viewHelpAction)
                .addButton("export", "export", "Export web bundle", this.params.exportWebBundleAction)
                .addButton("publish", "cloud-upload", "Publish to Github pages", this.params.publishToGithubPagesAction)
                .addBlank(3)
                .addButton("toggleEdit", "edit", "Toggle edit mode", this.params.toggleEditAction, this.toggleEditStyle);
        }
        this.addWrapping("group-1", "recap-button-group", "expandAll", "collapseAll", "blank-1", "toggleView", "blank-2", "increaseSize", "decreaseSize")
            .addWrapping("group-2", "recap-button-group", "goDown", "goUp")
            .addWrapping("group-3", "recap-button-group", "quickPick", "info", "viewHelp", "export", "publish", "blank-3", "toggleEdit");
    }
}
MainToolbar.defaultStyle = "recap-toolbar";
exports["default"] = MainToolbar;


/***/ }),

/***/ 22:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const ZInterval_1 = __webpack_require__(961);
const z_1 = __webpack_require__(813);
const MarkdownConverter_1 = __webpack_require__(363);
const RecapNote_1 = __webpack_require__(851);
class NoteText extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.currentSelectionInterval = ZInterval_1.default.nullInterval;
        this.lastChar = null;
        this.params = params;
        this.note = params.note;
        this.editableProp = this.createProp(() => this.isEditable());
        this.style = this.createProp(this.currentStyle);
        this.setTabIndex(0);
        this.hasFocus = false;
        this.setEventActions({
            "click": this.handleClick,
            "blur": this.handleBlur,
            "focus": this.handleFocus,
            "input": this.handleInput,
            "cut": this.handleCut,
            "paste": this.handlePaste,
            "keydown": this.handleKeyDown,
        });
        // undo setup
        this.previousContents = this.note.contents;
        this.params.textSelectionProp.addAction(this.createAction(this.selectionChanged));
        this.params.textSelectionProp.fireOnAnySet = true;
    }
    inPresentationMode() {
        return this.params.presentationProp.get();
    }
    isEditable() {
        return this.params.editModeProp.get() && this.params.selectedProp.get();
    }
    isExpanded() {
        return this.params.expandedProp.get();
    }
    convertMarkdown(mdText) {
        return MarkdownConverter_1.default.convert(mdText, this.inPresentationMode(), this.params.rootPathProp.get());
    }
    currentHTML() {
        return this.convertMarkdown(this.innerText());
    }
    currentStyle() {
        return this.isEditable()
            ? "recap-text-editable"
            : this.inPresentationMode()
                ? "recap-markdown recap-text-presentation"
                : this.isExpanded()
                    ? "recap-markdown recap-text-expanded"
                    : "recap-markdown recap-text";
    }
    render() {
        if (!this.note) {
            return;
        }
        this.setContentEditable(this.isEditable());
        const markdownText = this.note.contents;
        if (this.isEditable()) {
            this.setInnerText(`${markdownText.trim()}\n\n\n`);
        }
        else {
            const mdText = this.isExpanded() ? markdownText : z_1.default.firstLine(markdownText);
            this.setInnerHTML(this.convertMarkdown(mdText));
        }
    }
    afterRender() {
        if (this.isEditable() && this.note.contents === RecapNote_1.default.defaultContents) {
            this.setSelectionInterval(ZInterval_1.default.create(3, 11));
        }
    }
    saveNoteContents() {
        this.note.contents = this.innerText();
        return true;
    }
    handleBlur(event) {
        this.hasFocus = false;
        if (this.isEditable()) {
            this.saveNoteContents();
        }
    }
    handleFocus(event) {
        this.hasFocus = true;
    }
    ignoreKeyEvent(event) {
        return (event.key === "Clear" ||
            event.key === "CrSel" ||
            event.key === "EraseEof" ||
            event.key === "ExSel" ||
            event.key === "Insert");
    }
    handleKeyDown(event) {
        if (this.ignoreKeyEvent(event)) {
            event.preventDefault();
            return;
        }
        this.lastChar = null;
        if (event.key === "Backspace") {
            event.preventDefault();
            this.processBackspace();
        }
        else if (event.key === "Delete") {
            event.preventDefault();
            this.processDelete();
        }
        else if (event.key === "Tab") {
            event.preventDefault();
            this.processSimpleEntry("Tab", "  ");
        }
        else if (event.key === " ") {
            event.preventDefault();
            this.processSpace();
        }
        else if (event.key === "Enter") {
            event.preventDefault();
            this.processSimpleEntry("Enter", "\n");
        }
        else {
            // let the key fall through, then capture any real change in handleInput()
            this.lastChar = event.key;
        }
        this.previousContents = this.innerText();
        this.updateSelectionInterval();
    }
    handleClick(event) {
        this.focus();
        if (this.hasFocus) {
            this.params.textClickedAction.performWith(event);
        }
    }
    handleInput() {
        if (this.isEditable()) {
            if (this.lastChar) {
                if (this.lastChar.length !== 1) {
                    console.log("weird char: '" + this.lastChar + "'");
                }
                this.processCharacter(this.lastChar);
            }
        }
    }
    updateSelectionInterval() {
        this.currentSelectionInterval = this.getSelectionInterval();
    }
    selectionChanged() {
        if (this.isEditable()) {
            const selection = this.params.textSelectionProp.get();
            const range = selection.getRangeAt(0);
            this.currentSelectionInterval = this.convertRangeToInterval(range);
        }
    }
    handleCut(event) {
        event.preventDefault();
        this.processCut();
    }
    handlePaste(event) {
        event.preventDefault();
        const data = event.clipboardData;
        if (!data || !this.readyForPaste() || !document.getSelection()) {
            return;
        }
        this.processPaste(event.clipboardData.getData("text/plain"));
    }
    readyForPaste() {
        if (!this.isEditable()) {
            return false;
        }
        const selection = document.getSelection();
        if (!selection) {
            return false;
        }
        const range = selection.getRangeAt(0);
        const rangeContainer = range.startContainer;
        if (!rangeContainer) {
            return false;
        }
        if (rangeContainer instanceof Text) {
            return true;
        }
        return rangeContainer === this.elt || rangeContainer.parentElement === this.elt;
    }
    /*
     * Undo/redo: the NoteView parent maintains the undo/redo stacks, but we handle most of the
     * text operations here.
     */
    addNoteTextChange(type, position, deletedText, addedText) {
        this.params.addChangeAction.performWith({
            ownerClass: "NoteText",
            ownerID: this.note.id,
            type: type,
            position: position,
            delete: deletedText,
            add: addedText
        });
    }
    ensureActive() {
        this.params.textClickedAction.perform();
    }
    async undoChange(lastChange) {
        this.ensureActive();
        const position = lastChange.position;
        if (position && lastChange.add && lastChange.add.length > 0) {
            this.deleteTextInInterval(ZInterval_1.default.create(position, position + lastChange.add.length));
        }
        if (position && lastChange.delete && lastChange.delete.length > 0) {
            this.insertText(lastChange.delete, position);
        }
        this.previousContents = this.innerText();
        this.updateSelectionInterval();
    }
    redoChange(lastChange) {
        this.ensureActive();
        const position = lastChange.position;
        if (position && lastChange.add && lastChange.add.length > 0) {
            if (position === this.innerText().length) {
                this.insertText("\n" + lastChange.add, position - 1);
            }
            else {
                this.insertText(lastChange.add, position);
            }
        }
        if (position && lastChange.delete && lastChange.delete.length > 0) {
            this.deleteTextInInterval(ZInterval_1.default.create(position, position + lastChange.delete.length));
        }
        this.previousContents = this.innerText();
        this.updateSelectionInterval();
    }
    currentTextEditingState() {
        if (!this.currentSelectionInterval) {
            console.log("currentState: no selection");
        }
        const { start, end } = this.currentSelectionInterval;
        const selectedText = this.previousContents.substring(start, end);
        const previousChange = this.params.previousChangeProp.get();
        return { start, end, selectedText, previousChange };
    }
    sameChangeOwner(change) {
        return change && change.ownerClass === "NoteText" && change.ownerID === this.note.id;
    }
    mayCoalesceBackspace(previousChange, start, end) {
        return (this.sameChangeOwner(previousChange) &&
            start === end - 1 &&
            previousChange.position === start + 1 &&
            previousChange.type === "backspace");
    }
    processBackspace() {
        const { start, end, selectedText, previousChange } = this.currentTextEditingState();
        if (start === 0 && end === start) {
            return;
        }
        const realStart = start === end ? start - 1 : start;
        const realSelectedText = start === end ? this.previousContents.charAt(start) : selectedText;
        // perform the backspace
        this.deleteTextInInterval(ZInterval_1.default.create(realStart, end));
        if (this.mayCoalesceBackspace(previousChange, realStart, end)) {
            previousChange.position = previousChange.position - 1;
            previousChange.delete = this.previousContents.charAt(realStart) + previousChange.delete;
        }
        else {
            this.addNoteTextChange("backspace", realStart, realSelectedText, "");
        }
        this.setSelectionInterval(ZInterval_1.default.create(realStart, realStart));
    }
    mayCoalesceCharacter(previousChange, start, end) {
        return (this.sameChangeOwner(previousChange) &&
            start === end &&
            previousChange.add &&
            previousChange.position === start - previousChange.add.length &&
            (previousChange.type === "char" || (previousChange.type === "space" && previousChange.add.length === 1)));
    }
    // actual insert of character will be handled by browser
    processCharacter(charString) {
        const { start, end, selectedText, previousChange } = this.currentTextEditingState();
        if (this.mayCoalesceCharacter(previousChange, start, end)) {
            previousChange.type = "char";
            previousChange.add = previousChange.add + charString;
        }
        else {
            this.addNoteTextChange("char", start, selectedText, charString);
        }
    }
    async processCut() {
        const { start, end, selectedText } = this.currentTextEditingState();
        if (selectedText.length === 0) {
            return;
        }
        // perform the cut, and write selected text to clipboard
        this.deleteTextInInterval(ZInterval_1.default.create(start, end));
        await navigator.clipboard.writeText(selectedText);
        this.addNoteTextChange("cut", start, selectedText, "");
        this.setSelectionInterval(ZInterval_1.default.create(start, start));
    }
    mayCoalesceDelete(previousChange, start, end) {
        return (this.sameChangeOwner(previousChange) &&
            start === end - 1 &&
            previousChange.position === start &&
            previousChange.type === "delete");
    }
    processDelete() {
        const { start, end, selectedText, previousChange } = this.currentTextEditingState();
        const prevLength = this.previousContents.length;
        if (start === prevLength && end === start) {
            return;
        }
        const realEnd = start === end ? end + 1 : end;
        const realSelectedText = start === end ? this.previousContents.charAt(start) : selectedText;
        // perform the (forward) delete
        this.deleteTextInInterval(ZInterval_1.default.create(start, realEnd));
        if (this.mayCoalesceDelete(previousChange, start, realEnd)) {
            previousChange.delete = previousChange.delete + this.previousContents.charAt(start);
        }
        else {
            this.addNoteTextChange("delete", start, realSelectedText, "");
        }
        this.setSelectionInterval(ZInterval_1.default.create(start, start));
    }
    processPaste(newText) {
        const { start, end, selectedText } = this.currentTextEditingState();
        // delete any selection, and insert the clipboard text
        this.deleteTextInInterval(ZInterval_1.default.create(start, end));
        this.insertText(newText, start);
        this.addNoteTextChange("paste", start, selectedText, newText);
        this.updateSelectionInterval();
    }
    mayCoalesceSpace(previousChange, start, end) {
        return (this.sameChangeOwner(previousChange) &&
            start === end &&
            previousChange.add &&
            previousChange.position === start - previousChange.add.length &&
            previousChange.type === "space");
    }
    processSpace() {
        const { start, end, selectedText, previousChange } = this.currentTextEditingState();
        // delete any selection, and insert a space
        if (start < end) {
            this.deleteTextInInterval(ZInterval_1.default.create(start, end));
        }
        this.insertText(" ", start);
        // coalesce or create new change record
        if (this.mayCoalesceSpace(previousChange, start, end)) {
            previousChange.add = previousChange.add + " ";
        }
        else {
            this.addNoteTextChange("space", start, selectedText, " ");
        }
        this.setSelectionInterval(ZInterval_1.default.create(start + 1, start + 1));
    }
    // this is used for tab and enter; no coalescing
    processSimpleEntry(type, text) {
        const { start, end, selectedText } = this.currentTextEditingState();
        // delete any selection, and insert the new text
        if (start < end) {
            this.deleteTextInInterval(ZInterval_1.default.create(start, end));
        }
        if (type === "Enter" && start >= this.innerText().length - 1) {
            // weird case of enter at the very end -- needs double newline
            this.insertText("\n\n", start);
        }
        else {
            this.insertText(text, start);
        }
        this.addNoteTextChange(type, start, selectedText, text);
        this.setSelectionInterval(ZInterval_1.default.create(start + 1, start + 1));
    }
}
NoteText.defaultStyle = "recap-text";
exports["default"] = NoteText;


/***/ }),

/***/ 508:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const ZProp_1 = __webpack_require__(904);
const ZDisclosure_1 = __webpack_require__(788);
const NoteText_1 = __webpack_require__(22);
const EditToolbar_1 = __webpack_require__(892);
const LinkTarget_1 = __webpack_require__(361);
const Extension_1 = __webpack_require__(732);
class NoteView extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.params = params;
        this.note = params.note;
        this.selectedProp = this.createProp(false);
        this.expandedProp = this.createProp(this.isOnlyNote());
        this.expandedProp.addAction(this.createAction(this.expansionChanged));
        this.textClickedAction = this.createAction(this.textClicked);
        this.primaryLinkTargetProp = this.createProp(this.note.primaryLinkTarget);
        this.linkDetailProp = this.createProp(this.primaryLinkDescription());
        this.params.selectedNoteViewProp.addAction(this.createAction(this.selectedNoteViewChanged));
        this.setClickAction(this.handleClick);
        this.setEventActions({
            "focus": this.handleFocus,
        });
        this.style = this.createProp(this.currentStyle);
        this.disclosureParams = this.initializeDisclosureParams();
        this.noteTextParams = this.initializeNoteTextParams();
        this.editToolbarParams = this.initializeEditToolbarParams();
    }
    initializeDisclosureParams() {
        return {
            openProp: this.expandedProp,
            toggleAction: this.createAction(this.toggle),
            style: this.createProp(this.currentDisclosureStyle),
        };
    }
    initializeEditToolbarParams() {
        return {
            addNoteAction: this.params.addNoteAction,
            copyHTMLAction: this.createAction(this.copyGeneratedHTML),
            copyMarkdownAction: this.createAction(this.copyMarkdown),
            deleteNoteAction: this.params.deleteNoteAction,
            createNoteLinkAction: this.params.createNoteLinkAction,
            createMarkdownLinkAction: this.params.createMarkdownLinkAction,
            moveUpAction: this.params.moveUpAction,
            moveDownAction: this.params.moveDownAction,
            removeNoteLinkAction: this.createAction(this.removeNoteLink, this.noteIsLinked),
            linkDetailProp: this.linkDetailProp,
        };
    }
    initializeNoteTextParams() {
        return {
            note: this.note,
            expandedProp: this.expandedProp,
            editModeProp: this.params.editModeProp,
            presentationProp: this.params.presentationProp,
            previousChangeProp: this.params.previousChangeProp,
            rootPathProp: this.params.rootPathProp,
            selectedProp: this.selectedProp,
            textSelectionProp: this.params.textSelectionProp,
            addChangeAction: this.params.addChangeAction,
            textClickedAction: this.textClickedAction,
        };
    }
    textClicked(event) {
        this.select().expand();
    }
    expansionChanged() {
        const expandedNoteViewsProp = this.params.expandedNoteViewsProp;
        if (this.isExpanded()) {
            ZProp_1.default.addToSet(expandedNoteViewsProp, this);
        }
        else {
            ZProp_1.default.deleteFromSet(expandedNoteViewsProp, this);
        }
    }
    toggle() {
        this.expandedProp.toggle(true, false);
        this.select();
        return this;
    }
    isSelected() {
        return this.selectedProp.get();
    }
    selectedNoteViewChanged(newVal) {
        this.setSelectedOnly(this === newVal);
    }
    setSelectedOnly(b) {
        this.selectedProp.set(b);
    }
    setSelected(b) {
        if (this.selectedProp.get() === b) {
            return;
        }
        if (b) {
            this.params.selectedNoteViewProp.set(this);
        }
        this.selectedProp.set(b);
        this.scrollIntoViewIfNeeded();
        return this;
    }
    select() {
        this.setSelected(true);
        if (!this.inEditMode()) {
            Extension_1.default.showLink(this.primaryLinkTarget());
        }
        return this;
    }
    deselect() {
        this.setSelected(false);
        return this;
    }
    isExpanded() {
        return this.expandedProp.get();
    }
    setExpanded(b) {
        this.expandedProp.set(b);
        if (!this.inPresentationMode()) {
            this.scrollIntoViewIfNeeded();
        }
        return this;
    }
    expand() {
        this.setExpanded(true);
        return this;
    }
    collapse() {
        this.setExpanded(false);
        return this;
    }
    inPresentationMode() {
        return this.params.presentationProp.get();
    }
    inEditMode() {
        return this.params.editModeProp.get();
    }
    handleClick(event) {
        if (event.target instanceof Element) {
            const tag = event.target.tagName.toUpperCase();
            if (tag !== "A" && tag !== "SUMMARY") {
                this.textClicked(event);
            }
        }
    }
    handleFocus() {
        setTimeout(() => this.textView().focus());
    }
    borderColor() {
        return this.noteIsLinked() ? "recap-note-linked" : "recap-note-unlinked";
    }
    borderStyle() {
        return this.note.changed ? "recap-note-changed" : !this.inEditMode() && this.isOnlyNote() ? "recap-note-noborder" : "recap-note-unchanged";
    }
    baseStyle() {
        return this.inPresentationMode() && this.isSelected()
            ? "recap-note-presentation-selected"
            : this.inPresentationMode()
                ? "recap-note-presentation"
                : this.isSelected()
                    ? "recap-note-selected"
                    : "recap-note";
    }
    currentStyle() {
        return [this.baseStyle(), this.borderColor(), this.borderStyle()].join(" ");
    }
    isOnlyNote() {
        return this.params.annotationsProp.get().length === 1;
    }
    currentDisclosureStyle() {
        return this.isOnlyNote()
            ? "disclosure-single"
            : this.inEditMode() && this.isSelected()
                ? "disclosure-editable"
                : this.inPresentationMode()
                    ? "disclosure-presentation"
                    : "disclosure";
    }
    render() {
        this.addChild({ name: "disclosure", viewClass: ZDisclosure_1.ZDisclosure, params: this.disclosureParams });
        this.addChild({ name: "text", viewClass: NoteText_1.default, params: this.noteTextParams });
        if (this.isSelected() && this.inEditMode() && !this.inPresentationMode()) {
            this.addChild({ name: "edit-toolbar", viewClass: EditToolbar_1.default, params: this.editToolbarParams });
        }
        this.addWrapping("container", "recap-text-container", "disclosure", "text");
    }
    textView() {
        return this.children.find((c) => c instanceof NoteText_1.default);
    }
    copyGeneratedHTML() {
        navigator.clipboard.writeText(this.textView().currentHTML());
    }
    copyMarkdown() {
        navigator.clipboard.writeText(this.note.contents);
    }
    createMarkdownLink() {
        const selection = window.getSelection();
        const linkTarget = this.params.mostRecentSelectionProp.get();
        if (!selection || !linkTarget.isValid()) {
            return;
        }
        // modify the selection to turn the selection into a link
        // e.g., "sometext" => "[sometext](src/somefile.js:1,0,5,4)"
        const interval = this.textView().getSelectionInterval();
        const range = selection.getRangeAt(0);
        const text = range.extractContents().textContent;
        const newText = `[${text}](${linkTarget.asString()})`;
        const newNode = document.createTextNode(newText);
        range.insertNode(newNode);
        // update the note
        this.note.addMarkdownTarget(linkTarget);
        // add a change to the text view for undo
        this.textView().addNoteTextChange("createMarkdownLink", interval.start, text, newText);
    }
    primaryLinkTarget() {
        return this.primaryLinkTargetProp.get();
    }
    setPrimaryLinkTarget(linkTarget) {
        this.primaryLinkTargetProp.set(linkTarget);
        this.note.setPrimaryLinkTarget(linkTarget);
        this.linkDetailProp.set(linkTarget.description());
    }
    primaryLinkDescription() {
        return "Link: " + (this.noteIsLinked() ? this.primaryLinkTarget().description() : "(none)");
    }
    noteIsLinked() {
        return this.primaryLinkTarget().isValid();
    }
    createNoteLink() {
        const newTarget = this.params.mostRecentSelectionProp.get();
        if (!newTarget.isValid()) {
            Extension_1.default.showWarningMessage("No selection has been made");
            return;
        }
        const previousTarget = this.primaryLinkTarget();
        if (previousTarget && previousTarget.matches(newTarget)) {
            return;
        }
        this.setPrimaryLinkTarget(newTarget);
        this.addNoteViewChange("createLink", previousTarget, newTarget);
    }
    removeNoteLink() {
        const previousTarget = this.primaryLinkTarget();
        if (!previousTarget || !previousTarget.isValid()) {
            return;
        }
        const newTarget = LinkTarget_1.default.emptyLinkTarget;
        this.setPrimaryLinkTarget(newTarget);
        this.addNoteViewChange("removeLink", previousTarget, newTarget);
    }
    // callback from extension when we're about to save
    prepareToSave() {
        if (this.textView().isContentEditable()) {
            this.saveNoteContents();
        }
    }
    saveNoteContents() {
        this.textView().saveNoteContents();
    }
    addNoteViewChange(type, oldTarget, newTarget) {
        const change = {
            ownerClass: "NoteView",
            ownerID: this.note.id,
            type: type,
            oldTarget: oldTarget,
            newTarget: newTarget,
        };
        change.ownerClass = "NoteView";
        change.ownerID = this.note.id;
        this.params.addChangeAction.performWith(change);
    }
    ensureActive() {
        this.select().expand();
    }
    undoChange(lastChange) {
        this.ensureActive();
        if (lastChange.type === "createLink" || lastChange.type === "removeLink") {
            this.setPrimaryLinkTarget(lastChange.oldTarget);
        }
    }
    redoChange(lastChange) {
        this.ensureActive();
        if (lastChange.type === "createLink" || lastChange.type === "removeLink") {
            this.setPrimaryLinkTarget(lastChange.newTarget);
        }
    }
}
NoteView.defaultStyle = "recap-note";
exports["default"] = NoteView;


/***/ }),

/***/ 412:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const ZLabel_1 = __webpack_require__(974);
const ZStyle_1 = __webpack_require__(738);
const z_1 = __webpack_require__(813);
const NoteView_1 = __webpack_require__(508);
const MainToolbar_1 = __webpack_require__(512);
const LinkTarget_1 = __webpack_require__(361);
const RecapDocument_1 = __webpack_require__(694);
const NotesContainerExtension_1 = __webpack_require__(779);
const Extension_1 = __webpack_require__(732);
const RecapToolbar_1 = __webpack_require__(382);
const RecapInfo_1 = __webpack_require__(252);
class NotesContainer extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.undoStack = [];
        this.redoStack = [];
        this.inUndoOrRedo = false;
        this.params = params;
        this.style = this.createProp(this.currentStyle);
        this.scaleFactor = this.createProp(1.0);
        this.presentationProp = this.createProp(false);
        this.expandedNoteViewsProp = this.createProp(new Set());
        this.indexOfSelectedNoteViewProp = this.createProp(-1);
        this.mostRecentSelectionProp = this.createProp(LinkTarget_1.default.emptyLinkTarget);
        this.selectedNoteViewProp = this.createProp(null);
        this.selectedNoteViewChangedAction = this.createAction(this.selectedNoteViewChanged);
        this.selectedNoteViewProp.addAction(this.selectedNoteViewChangedAction);
        this.selectionDetailProp = this.createProp(this.selectionDetailText);
        this.selectionDetailStyle = this.createStyleProp("recap-selection-detail", [[params.editModeProp, "editable"]]);
        this.textSelectionProp = this.createProp(null);
        this.recapInfoVisibleProp = this.createProp(false);
        //this.recapInfoModalStyle = this.createProp(this.currentRecapInfoModalStyle);
        this.notesContainerStyle = this.createStyleProp("recap-notes-container", [
            [params.editModeProp, "editable"],
            [this.presentationProp, "presentation"],
        ]);
        this.params.documentProp.addAction(this.createAction(this.documentChanged));
        document.addEventListener("selectionchange", (event) => this.selectionChanged(event));
        // undo setup
        this.changedProp = this.createProp(false);
        this.previousChangeProp = this.createProp(null);
        this.addChangeAction = this.createAction(this.addChange);
        this.mainToolbarParams = this.initializeMainToolbarParams();
        this.editToolbarContainerParams = this.initializeEditToolbarContainerParams();
        this.noteViewParams = this.initializeNoteViewParams();
        this.selectionDetailParams = this.initializeSelectionDetailParams();
        this.extensionParams = this.initializeExtensionParams();
        this.initializeRecapInfoParams();
        NotesContainerExtension_1.default.initialize(this.extensionParams);
    }
    documentChanged() {
        this.selectedNoteViewProp.set(null);
        this.indexOfSelectedNoteViewProp.set(-1);
    }
    selectionChanged(event) {
        this.textSelectionProp.set(window.getSelection());
    }
    initializeMainToolbarParams() {
        return {
            collapseAllAction: this.createAction(this.collapseAll, this.someViewsAreExpanded),
            decreaseSizeAction: this.createAction(this.decreaseSize, this.scaleFactorMayDecrease),
            expandAllAction: this.createAction(this.expandAll, this.someViewsAreCollapsed),
            goDownAction: this.createAction(this.goDown, this.moreViewsAreBelow),
            goUpAction: this.createAction(this.goUp, this.moreViewsAreAbove),
            increaseSizeAction: this.createAction(this.increaseSize, this.scaleFactorMayIncrease),
            quickPickAction: this.params.quickPickAction,
            recapInfoAction: this.createAction(this.showRecapInfo),
            toggleEditAction: this.createAction(this.toggleEdit),
            toggleTargetViewAction: this.params.toggleTargetViewAction,
            toggleViewAction: this.createAction(this.toggleView),
            viewHelpAction: this.createAction(this.viewHelp),
            exportWebBundleAction: this.createAction(this.exportWebBundle),
            publishToGithubPagesAction: this.createAction(this.publishToGithubPages),
            editModeProp: this.params.editModeProp,
            presentationProp: this.presentationProp,
            style: RecapToolbar_1.default.defaultStyle,
        };
    }
    initializeEditToolbarContainerParams() {
        return {
            addNoteAction: this.createAction(this.addNote),
            deleteNoteAction: this.createAction(this.deleteNote),
            createMarkdownLinkAction: this.createAction(this.createMarkdownLink),
            createNoteLinkAction: this.createAction(this.createNoteLink, this.mostRecentSelectionIsValid),
            moveDownAction: this.createAction(this.moveDown, this.moreViewsAreBelow),
            moveUpAction: this.createAction(this.moveUp, this.moreViewsAreAbove),
        };
    }
    initializeNoteViewParams() {
        return {
            ...this.editToolbarContainerParams,
            editModeProp: this.params.editModeProp,
            expandedNoteViewsProp: this.expandedNoteViewsProp,
            presentationProp: this.presentationProp,
            rootPathProp: this.params.rootPathProp,
            selectedNoteViewProp: this.selectedNoteViewProp,
            mostRecentSelectionProp: this.mostRecentSelectionProp,
            textSelectionProp: this.textSelectionProp,
            changedProp: this.changedProp,
            previousChangeProp: this.previousChangeProp,
            addChangeAction: this.addChangeAction,
            annotationsProp: this.params.annotationsProp,
        };
    }
    initializeSelectionDetailParams() {
        return {
            style: this.selectionDetailStyle,
            label: this.selectionDetailProp,
        };
    }
    initializeExtensionParams() {
        return {
            documentProp: this.params.documentProp,
            editModeProp: this.params.editModeProp,
            mostRecentSelectionProp: this.mostRecentSelectionProp,
            outputFileSpacingProp: this.params.outputFileSpacingProp,
            addNoteAction: this.editToolbarContainerParams.addNoteAction,
            createNoteLinkAction: this.editToolbarContainerParams.createNoteLinkAction,
            documentWasSavedAction: this.createAction(this.documentWasSaved),
            //exportRecapListAction: this.createAction(this.exportRecapList),
            exportWebBundleToFolderAction: this.createAction(this.exportWebBundle),
            publishToGithubPagesAction: this.createAction(this.publishToGithubPages),
            goDownAction: this.mainToolbarParams.goDownAction,
            goUpAction: this.mainToolbarParams.goUpAction,
            //loadDocumentAction: this.params.loadDocumentAction,
            prepareToSaveAction: this.createAction(this.prepareToSave),
            redoAction: this.createAction(this.redo),
            revertAction: this.params.revertAction,
            showMarkdownLinkAction: this.createAction(this.showMarkdownLink),
            toggleEditAction: this.mainToolbarParams.toggleEditAction,
            undoAction: this.createAction(this.undo),
            viewChangedAction: this.createAction(this.viewChanged),
            viewHiddenAction: this.createAction(this.viewHidden),
        };
    }
    initializeRecapInfoParams() {
        this.recapInfoParams = {
            style: "recap-info",
            documentProp: this.params.documentProp,
            closeAction: this.createAction(this.hideRecapInfo),
            updateAction: this.createAction(this.updateRecapInfo),
            visibleProp: this.recapInfoVisibleProp,
            editModeProp: this.params.editModeProp,
        };
    }
    noteViews() {
        return this.children.filter((c) => c instanceof NoteView_1.default);
    }
    document() {
        return this.params.documentProp.get();
    }
    rootPath() {
        return z_1.default.valueof(this.params.rootPathProp);
    }
    documentIsEmpty() {
        return this.documentIsValid() && this.document().isEmpty();
    }
    documentIsValid() {
        return this.document()?.isValid();
    }
    currentStyle() {
        return this.documentIsValid() ? "recap-top" : "recap-top-invalid";
    }
    // currentRecapInfoModalStyle() {
    //   return this.recapInfoVisibleProp.get() ? "recap-info-modal" : "hidden";
    // }
    hideRecapInfo() {
        this.recapInfoVisibleProp.set(false);
    }
    showRecapInfo(event) {
        this.recapInfoVisibleProp.set(true);
    }
    updateRecapInfo(oldInfoValues, newInfoValues) {
        const change = {
            ownerClass: "NotesContainer",
            ownerID: 0,
            type: "info",
            oldInfoValues: oldInfoValues,
            newInfoValues: newInfoValues,
        };
        this.addChange(change);
    }
    render() {
        const doc = this.document();
        if (!doc) {
            // too early - we haven't received the document yet
            return;
        }
        if (!doc.isValid()) {
            this.setInnerText("Error: Document is not a valid recap file");
            return;
        }
        this.params.annotationsProp.get().forEach((note, index) => {
            this.addChild({
                name: "noteview-" + note.id,
                viewClass: NoteView_1.default,
                params: { ...this.noteViewParams, note: note },
            });
        });
        this.addChild({ name: "selection-panel", viewClass: ZLabel_1.default, params: this.selectionDetailParams });
        this.addChild({ name: "main-toolbar", viewClass: MainToolbar_1.default, params: this.mainToolbarParams });
        if (ZStyle_1.default.deviceIsIOS()) {
            // put toolbar at the top
            this.addWrapping("toolbar-container", "", "main-toolbar");
            this.addWrapping("notes-container", this.notesContainerStyle, /noteview-*/);
        }
        else {
            this.addWrapping("notes-container", this.notesContainerStyle, /noteview-*/);
            this.addWrapping("toolbar-container", "", "main-toolbar");
        }
        this.addChild({ name: "recap-info", viewClass: RecapInfo_1.RecapInfo, params: this.recapInfoParams });
        this.addModalWrapping("info-wrapper", "recap-modal", this.recapInfoVisibleProp, "recap-info");
    }
    afterRender() {
        if (Extension_1.default.isWebContext()) {
            return;
        }
        if (this.document() === RecapDocument_1.default.nullDocument) {
            // we're in the process of reverting or loading a new document
            this.clearUndo();
            return;
        }
        if (this.documentIsEmpty()) {
            this.addNote().toggleEdit();
            //this.showRecapInfo();
        }
        else if (!this.selectedNoteViewProp.get()) {
            setTimeout(() => this.firstNoteView()?.select().expand(), 500);
        }
    }
    selectedNoteView() {
        return this.selectedNoteViewProp.get();
    }
    noteViewCount() {
        return this.noteViews().length;
    }
    someViewsAreCollapsed() {
        return !this.inPresentationMode() && this.expandedNoteViewsProp.get().size < this.noteViewCount();
        //  this.noteViews().some((noteView) => !noteView.expandedProp.get());
    }
    someViewsAreExpanded() {
        return !this.inPresentationMode() && this.expandedNoteViewsProp.get().size > 0;
        //return !this.inPresentationMode() && this.noteViews().some((noteView) => noteView.expandedProp.get());
    }
    scaleFactorMayDecrease() {
        return this.scaleFactor.get() > NotesContainer.minScaleFactor;
    }
    scaleFactorMayIncrease() {
        return this.scaleFactor.get() < NotesContainer.maxScaleFactor;
    }
    moreViewsAreAbove() {
        return this.selectedNoteView() && this.indexOfSelectedNoteViewProp.get() > 0;
    }
    moreViewsAreBelow() {
        return this.selectedNoteView() && this.indexOfSelectedNoteViewProp.get() < this.noteViewCount() - 1;
    }
    selectedNoteViewChanged() {
        this.indexOfSelectedNoteViewProp.set(this.noteViews().indexOf(this.selectedNoteView()));
        //Extension.showLink(this.selectedNoteView()?.note.primaryLinkTarget);
    }
    mostRecentSelectionIsValid() {
        return this.mostRecentSelectionProp.get().isValid();
    }
    selectionDetailText() {
        return "Selection: " + this.mostRecentSelectionProp.get().description("none");
    }
    showSelectedNoteView() {
        this.selectedNoteView()?.scrollIntoViewIfNeeded();
        return this;
    }
    collapseAll() {
        this.noteViews().forEach((noteView) => noteView.collapse());
        this.showSelectedNoteView();
    }
    expandAll() {
        this.noteViews().forEach((noteView) => noteView.expand());
        this.showSelectedNoteView();
    }
    changeSize(amount) {
        this.scaleFactor.set(this.scaleFactor.get() + amount);
        this.setCSSProperty("--scaled-font-size", this.scaleFactor.get() * 100 + "%");
        return this;
    }
    decreaseSize() {
        if (this.scaleFactorMayDecrease()) {
            this.changeSize(-0.1);
        }
    }
    increaseSize() {
        if (this.scaleFactorMayIncrease()) {
            this.changeSize(0.1);
        }
    }
    goDown(event) {
        if (event?.altKey) {
            this.lastNoteView().select().expand();
        }
        else if (this.moreViewsAreBelow()) {
            this.selectedNoteView().nextSiblingView().select().expand();
        }
    }
    goUp(event) {
        if (event?.altKey) {
            this.firstNoteView().select().expand();
        }
        else if (this.moreViewsAreAbove()) {
            this.selectedNoteView().previousSiblingView().select().expand();
        }
    }
    exportWebBundle() {
        Extension_1.default.exportRecapFiles();
    }
    publishToGithubPages() {
        Extension_1.default.publishToGithubPages();
    }
    viewHelp() {
        Extension_1.default.viewHelp();
    }
    toggleView() {
        if (this.inEditMode()) {
            this.toggleEdit();
        }
        this.presentationProp.toggle(true, false);
    }
    firstNoteView() {
        return z_1.default.firstOrNull(this.noteViews());
    }
    lastNoteView() {
        return z_1.default.last(this.noteViews());
    }
    inEditMode() {
        return this.params.editModeProp.get();
    }
    inPresentationMode() {
        return this.presentationProp.get();
    }
    handleClick(event) {
        if (this.eventTargetIsSelf(event) && !this.inPresentationMode()) {
            this.selectedNoteView()?.deselect();
        }
    }
    toggleEdit() {
        if (this.inPresentationMode()) {
            this.toggleView();
        }
        if (this.inEditMode()) {
            this.prepareToSave();
        }
        this.params.editModeProp.toggle(true, false);
        this.showSelectedNoteView();
    }
    addNote() {
        const doc = this.document();
        const newNote = doc.createNewNote();
        return this.addNoteAtIndex(newNote, this.indexOfSelectedNoteViewProp.get());
    }
    addNoteAtIndex(note, index) {
        if (index !== -1) {
            this.noteViews()[index].select();
        }
        const doc = this.document();
        const newNote = doc.addNoteAtIndex(note, index);
        this.params.annotationsProp.set(doc.annotations);
        const newNoteView = this.noteViews().find((noteView) => noteView.note === newNote);
        newNoteView.moveAfter(this.selectedNoteView());
        setTimeout(() => newNoteView.select().expand(), 100);
        this.addNotesContainerChange("addNote", newNote, index);
        return this;
    }
    createMarkdownLink() {
        this.selectedNoteView()?.createMarkdownLink();
    }
    createNoteLink() {
        this.selectedNoteView()?.createNoteLink();
    }
    deleteNote() {
        const doc = this.document();
        const note = this.selectedNoteView().note;
        const index = doc.annotations.indexOf(note);
        doc.deleteNote(note);
        this.params.annotationsProp.set(doc.annotations);
        this.selectedNoteViewChanged();
        this.addNotesContainerChange("deleteNote", note, index);
    }
    moveUp() {
        const doc = this.document();
        const note = this.selectedNoteView().note;
        doc.moveNoteUp(note);
        this.params.annotationsProp.set(doc.annotations);
        this.selectedNoteView().moveBeforePreviousSibling();
        this.selectedNoteViewChanged();
        this.addNotesContainerChange("moveUp", note);
    }
    moveDown() {
        const doc = this.document();
        const note = this.selectedNoteView().note;
        doc.moveNoteDown(this.selectedNoteView()?.note);
        this.params.annotationsProp.set(doc.annotations);
        this.selectedNoteView().moveAfterNextSibling();
        this.selectedNoteViewChanged();
        this.addNotesContainerChange("moveDown", note);
    }
    prepareToSave() {
        this.selectedNoteView()?.prepareToSave();
    }
    showMarkdownLink(linkTarget) {
        // if there is a matching entry in the markdownLinkTargets for the current note, add the text and offset
        const selectedNote = this.selectedNoteView()?.note;
        if (selectedNote) {
            const match = selectedNote.markdownLinkTargets.find((t) => t.matches(linkTarget));
            if (match) {
                linkTarget.targetText = match.targetText;
                linkTarget.targetOffset = match.targetOffset;
            }
        }
        Extension_1.default.showLink(linkTarget);
    }
    // reselect when we switch documents in vscode
    viewChanged() {
        this.selectedNoteView()?.select();
    }
    viewHidden() {
        // save state here if we don't <retainContextWhenHidden>
    }
    /*
     * Undo strategy: each change is represented by an object with (owner, type, position, deletedText, addedText).
     * Some changes may be coalesced.
     */
    clearUndo() {
        this.undoStack = [];
        this.redoStack = [];
    }
    isChanged() {
        return this.changedProp.get();
    }
    setChanged(b) {
        this.changedProp.set(b);
        this.document().changed = b;
    }
    documentWasSaved() {
        this.clearUndo();
        this.setChanged(false);
    }
    getChangeOwner(change) {
        if (change.ownerClass === "NotesContainer") {
            return this;
        }
        const noteView = this.childNamed("noteview-" + change.ownerID);
        return change.ownerClass === "NoteView" ? noteView : noteView?.textView();
    }
    addNotesContainerChange(type, note, index = 0) {
        const change = {
            ownerClass: "NotesContainer",
            ownerID: 0,
            type: type,
            note: note,
            index: index,
        };
        this.addChange(change);
    }
    addChange(change) {
        // if (this.undoStack.length === 0) {
        //   this.redoStack = [];
        // }
        if (this.inUndoOrRedo) {
            return;
        }
        this.undoStack.push(change);
        Extension_1.default.documentChanged();
        this.setChanged(true);
        this.previousChangeProp.set(change);
    }
    undo() {
        if (this.undoStack.length === 0) {
            // TODO: should not happen
            // here we need to trick vscode; it thought we had a change to undo, but that
            // change was from another noteview; we don't want the change count to be decremented,
            // so we bump it back up.
            //Extension.documentChanged();
            return;
        }
        const lastChange = this.undoStack.pop();
        this.inUndoOrRedo = true;
        this.getChangeOwner(lastChange).undoChange(lastChange);
        this.inUndoOrRedo = false;
        this.redoStack.push(lastChange);
        this.setChanged(this.undoStack.length > 0);
    }
    redo() {
        if (this.redoStack.length === 0) {
            return;
        }
        const lastChange = this.redoStack.pop();
        this.inUndoOrRedo = true;
        this.getChangeOwner(lastChange).redoChange(lastChange);
        this.inUndoOrRedo = false;
        this.addChange(lastChange);
    }
    undoChange(lastChange) {
        if (lastChange.type === "deleteNote") {
            this.addNoteAtIndex(lastChange.note, lastChange.index);
            return;
        }
        if (lastChange.type === "info") {
            this.document().setInfoValues(lastChange.oldInfoValues);
            return;
        }
        const noteView = this.noteViews().find((noteView) => noteView.note === lastChange.note);
        if (!noteView) {
            return;
        }
        noteView.select();
        if (lastChange.type === "addNote") {
            this.deleteNote();
        }
        else if (lastChange.type === "moveUp") {
            this.moveDown();
        }
        else if (lastChange.type === "moveDown") {
            this.moveUp();
        }
    }
    redoChange(lastChange) {
        if (lastChange.type === "addNote") {
            this.addNoteAtIndex(lastChange.note, lastChange.index);
            return;
        }
        if (lastChange.type === "info") {
            this.document().setInfoValues(lastChange.newInfoValues);
            return;
        }
        const noteView = this.noteViews().find((noteView) => noteView.note === lastChange.note);
        if (!noteView) {
            return;
        }
        noteView.select();
        if (lastChange.type === "deleteNote") {
            this.deleteNote();
        }
        else if (lastChange.type === "moveUp") {
            this.moveUp();
        }
        else if (lastChange.type === "moveDown") {
            this.moveDown();
        }
    }
}
NotesContainer.defaultStyle = "recap-top";
NotesContainer.minScaleFactor = 0.8;
NotesContainer.maxScaleFactor = 2.0;
exports["default"] = NotesContainer;


/***/ }),

/***/ 697:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const z_1 = __webpack_require__(813);
class RecapButton extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.clickAction = params.clickAction;
        this.codicon = params.codicon;
        this.hoverText = params.hoverText;
        if (z_1.default.isString(params.style) && params.clickAction) {
            this.style = this.createStyleProp(params.style, [[params.clickAction.disabledProp(), "disabled"]]);
        }
        if (params.clickAction) {
            this.setClickAction(this.handleClick);
        }
    }
    render() {
        this.setTitle(z_1.default.valueof(this.hoverText));
        this.addDecoration("codicon", "codicon " + z_1.default.valueof(this.codicon));
    }
    handleClick(event) {
        if (this.clickAction?.isEnabled()) {
            this.makeInvisibleForMilliseconds(200);
            this.clickAction.performWith(event);
            event.stopPropagation();
        }
    }
}
RecapButton.defaultStyle = "recap-toolbar-button";
exports["default"] = RecapButton;


/***/ }),

/***/ 252:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RecapInfo = void 0;
const ZView_1 = __webpack_require__(928);
const ZInput_1 = __webpack_require__(816);
const ZLabel_1 = __webpack_require__(974);
class RecapInfo extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.params = params;
        this.params.visibleProp.addAction(this.createAction(this.visibilityChanged));
        this.setEventActions({
            "keydown": this.handleKeyDown,
        });
        this.tabOrder = ["title", "author", "creationDate", "description"];
        this.setTabIndex(0);
    }
    inputNamed(name) {
        return this.childNamed(name);
    }
    focusIndex() {
        return this.tabOrder.findIndex((name) => this.inputNamed(name).hasFocus);
    }
    handleKeyDown(event) {
        if (event.key === "Tab") {
            event.preventDefault();
            this.inputNamed(this.tabOrder[(this.focusIndex() + 1) % this.tabOrder.length]).focusAndSelect();
        }
        else if (event.key === "Escape") {
            this.close();
        }
    }
    visibilityChanged(visible) {
        const doc = this.params.documentProp.get();
        if (visible && doc) {
            this.setInputValue("title", doc.title);
            this.setInputValue("author", doc.author);
            this.setInputValue("creationDate", doc.creationDate);
            this.setInputValue("description", doc.description);
            if (this.params.editModeProp.get()) {
                const title = this.childNamed("title");
                title.focusAndSelect();
            }
            else {
                this.focus();
            }
        }
    }
    addInputField(name, label, value, placeholder = "", readOnly = false, multiline = false) {
        this.addChild({
            name: name + "-label",
            viewClass: ZLabel_1.default,
            params: {
                label: label,
                style: "recap-info-label",
            },
        });
        this.addChild({
            name: name,
            viewClass: ZInput_1.default,
            params: {
                style: "recap-info-input",
                value: value,
                readOnly: readOnly ? true : this.params.editModeProp.negated(),
                multiline: multiline,
                placeholder: placeholder,
            },
        });
    }
    addButton(name, label, onClick) {
        this.addChild({
            name: name,
            viewClass: ZLabel_1.default,
            params: {
                style: "recap-info-button",
                label: label,
                clickAction: onClick,
            },
        });
    }
    render() {
        const doc = this.params.documentProp.get();
        if (doc) {
            this.addInputField("title", "Title", doc.title, "title");
            this.addInputField("author", "Author", doc.author, "author");
            this.addInputField("creationDate", "Created", doc.creationDate, "", true);
            this.addInputField("description", "Description", doc.description, "description", false, true);
            if (this.params.editModeProp.get()) {
                this.addButton("cancelButton", "Cancel", this.createAction(this.close));
                this.addButton("updateButton", "Update", this.createAction(this.updateInfo));
            }
            else {
                this.addButton("closeButton", "Close", this.createAction(this.close));
            }
            this.addWrapping("fields", "recap-info-fields", / *-label/, "title", "author", "creationDate", "description");
            this.addWrapping("buttons", "recap-info-button-panel", / *Button/);
        }
    }
    afterRender() {
        this.focus();
    }
    close() {
        this.params.closeAction.perform();
    }
    getInputValue(name) {
        const input = this.childNamed(name);
        return input.value();
    }
    setInputValue(name, value) {
        const input = this.childNamed(name);
        input.setValue(value);
        return this;
    }
    updateInfo() {
        const doc = this.params.documentProp.get();
        const oldInfoValues = doc.getInfoValues();
        doc.title = this.getInputValue("title");
        doc.author = this.getInputValue("author");
        doc.description = this.getInputValue("description");
        const newInfoValues = doc.getInfoValues();
        this.params.updateAction.performWith(oldInfoValues, newInfoValues);
        this.close();
    }
}
exports.RecapInfo = RecapInfo;
RecapInfo.defaultStyle = "";
exports["default"] = RecapInfo;


/***/ }),

/***/ 574:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RecapPopUp = exports.PopUpPositionType = void 0;
const ZView_1 = __webpack_require__(928);
const ZLabel_1 = __webpack_require__(974);
var PopUpPositionType;
(function (PopUpPositionType) {
    PopUpPositionType[PopUpPositionType["cursor"] = 0] = "cursor";
    PopUpPositionType[PopUpPositionType["center"] = 1] = "center";
})(PopUpPositionType = exports.PopUpPositionType || (exports.PopUpPositionType = {}));
class RecapPopUp extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.params = params;
        this.params.visibleProp.addAction(this.createAction(this.visibilityChanged));
        this.windowClickHandler = this.handleWindowClick.bind(this);
        this.setEventActions({
            "keydown": this.handleKeyDown,
        });
        this.setTabIndex(0);
    }
    handleWindowClick() {
        this.close();
    }
    handleKeyDown(event) {
        if (event.key === "Escape") {
            this.close();
        }
    }
    visibilityChanged(visible) {
        if (visible) {
            window.addEventListener("click", this.windowClickHandler);
            this.focus();
        }
        else {
            window.removeEventListener("click", this.windowClickHandler);
        }
    }
    applyStyle() {
        super.applyStyle();
        const rect = this.clientRect();
        const pos = this.params.positionProp.get();
        switch (this.params.positionTypeProp.get()) {
            case PopUpPositionType.cursor:
                this.setPosition(pos.x - rect.width + 10, Math.max(10, pos.y - rect.height + 10));
                return;
            case PopUpPositionType.center:
                this.setPosition((window.innerWidth - rect.width) / 2, (window.innerHeight - rect.height) / 2);
                return;
        }
    }
    render() {
        this.params.itemsProp.get().forEach((item, index) => {
            this.addChild({
                name: "item-" + index,
                viewClass: ZLabel_1.default,
                params: {
                    label: item,
                    style: this.params.itemStyle,
                    clickAction: this.params.clickAction,
                },
            });
        });
        this.addWrapping("popup-container", "recap-quick-pick-item-container", /item-*/);
    }
    close() {
        this.params.closeAction.perform();
    }
}
exports.RecapPopUp = RecapPopUp;
RecapPopUp.defaultStyle = "";
exports["default"] = RecapPopUp;


/***/ }),

/***/ 866:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZStyle_1 = __webpack_require__(738);
const Extension_1 = __webpack_require__(732);
class RecapStyle {
    static initialize() {
        ZStyle_1.default.initialize();
        this.initializeCSSVariables();
        this.initializeAtomicClasses();
        this.initializeRecapStyles();
        // TODO
        //window.addEventListener('change', (event) => this.setDarkMode(event.matches));
    }
    static setDarkMode(b) {
        // TODO
        console.log("RecapStyle.setDarkMode: " + b);
    }
    static initializeRecapStyles() {
        const allStyles = {
            "recap-web-root": "flex w-100 vh-100 bg-vse items-center",
            "webview": "w50 vh-100 bg-vse vh-100-s relative",
            "link-target-view": "w50 vh-100 ml2 pre bg-vse color-vsf font-family-vse overflow-y-scroll",
            "recap-top": "flex flex-column vh-100 bg-vse color-vsf font-size-vse font-family-vse ma0 pa0 overflow-hidden font-size-scaled",
            "recap-top-invalid": "flex flex-column justify-center f4 w-75 vh-100 maa ml4 orange",
            "recap-notes-container-base": "flex-grow-1 db overflow-y-scroll",
            "recap-notes-container": "{recap-notes-container-base} pb4 h100-20",
            "recap-notes-container-editable": "{recap-notes-container-base} pb5 h100-35",
            "recap-notes-container-presentation": "flex flex-column overflow-y-scroll h100-20",
            "recap-selection-detail": "dn",
            "recap-selection-detail-editable": "f6 db w-100 fixed bottom-2 bt bb b--gray pa1 tc overflow-hidden color-selection bg-color-button",
            "recap-selection-detail-editable-alert": "{recap-selection-detail-editable} red",
            "recap-edit-toolbar": "f5 w-100 flex flex-row justify-between bt b--gray mt3 pl2 bg-color-button overflow-hidden",
            "recap-link-detail": "f6 tl pa1 pl4 pr4 pt1 truncate dn-s",
            "recap-text-container": "flex flex-row pb1 outline-0 focus-none",
            "recap-text": "cursor-pointer w-100 truncate outline-0 focus-none",
            "recap-text-expanded": "cursor-pointer w-100 ws-normal overflow-break-word w100 outline-0 focus-none",
            "recap-text-editable": "cursor-auto ml2 pre ws-pre-wrap w100 maxh70 outline-0 focus-none",
            "recap-text-presentation": "cursor-pointer ws-normal maa pa3 outline-0 focus-none ",
            "disclosure": "ma1",
            "disclosure-single": "dn",
            "disclosure-editable": "dn",
            "disclosure-presentation": "dn",
            "recap-note-base": "ma2 pt1 tl relative overflow-hidden cursor-pointer",
            "recap-note": "{recap-note-base} db o-70 bn",
            "recap-note-presentation": "dn",
            "recap-note-presentation-selected": "pt1 tl relative  cursor-pointer db bn o-100 maa",
            "recap-note-selected": "{recap-note-base} ba br3 bw1 o-100",
            "recap-note-linked": "b--solid",
            "recap-note-unlinked": "b--dotted",
            "recap-note-changed": "b--selection bl--edited",
            "recap-note-unchanged": "b--selection",
            "recap-note-noborder": "b--none",
            "recap-toolbar": "f5 bottom-0 flex flex-row justify-between pa1 pl2 ba b--gray bg-color-button overflow-hidden w-100 ",
            //"recap-toolbar": "f5 flex flex-row justify-between pa1 pl2 bt b--gray bg-color-button overflow-hidden w-100 ",
            "recap-toolbar-container": "pa0",
            "recap-button-group": "flex flex-row pr2",
            "recap-button-group-grow-1": "flex-grow-1 flex flex-row",
            "recap-button-base": "w15 bg-inherit bn mr1 pt1 color-vsf",
            "recap-toolbar-button": "{recap-button-base} scale-12 hover-pointer hover-green",
            "recap-edit-button": "{recap-button-base} hover-pointer hover-green",
            "recap-toolbar-button-editable": "{recap-button-base} red",
            "recap-toolbar-button-disabled": "{recap-button-base} scale-12 cursor-auto o-30",
            "recap-centered-title": "db w-100 tc mb3",
            "hidden": "dn",
            "recap-quick-pick": "db z-999 fixed top-0 left-100 bg-lightgray ba br3",
            "recap-quick-pick-item-container": "maxh30 ma1",
            "recap-quick-pick-item": "hover-pointer f5 black-90 hover-bg-blue ma1",
            "recap-info": "w50 br3 ba b--gray center-child z-999 bg-vse bw1 bg-color-button shadow-3",
            "recap-info-fields": "ma1 form-grid",
            "recap-info-label": "f5 mt2",
            "recap-info-input": "br3 pa2 f5 overflow-hidden system-sans-serif bg-lightgray",
            "recap-info-button": "hover-pointer w50px ml2 mr2 ba br3 hover-bg-blue tc bg-lightgray black-90 mb3 mt3 pa1",
            "recap-info-button-panel": "flex flex-row justify-right",
            "recap-modal": "fixed left-0 top-0 w-100 vh-100 z-1 bg-gray-30"
        };
        Object.keys(allStyles).forEach((selector) => {
            ZStyle_1.default.addCompositeStyle(selector, allStyles[selector]);
        });
    }
    static initializeAtomicClasses() {
        // webDefaults are for the case where we don't have the vscode css variables defined
        const webDefaults = Extension_1.default.inWebDarkMode() ? this.darkThemeDefaults : this.lightThemeDefaults;
        const atomicClasses = {
            ".font-family-vse": `font-family:var(--vscode-editor-font-family, ${webDefaults.fontFamily})`,
            ".font-size-vse": `font-size:var(--vscode-editor-font-size, ${webDefaults.fontSize})`,
            ".color-vsf": `color:var(--vscode-foreground, ${webDefaults.foregroundColor})`,
            ".color-selection": `color:var(--vscode-editorLink-activeForeground, ${webDefaults.selectionColor})`,
            ".b--selection": `border-color:var(--vscode-editor-foreground, ${webDefaults.borderColor})`,
            ".bg-vse": `background-color:var(--vscode-editor-background, ${webDefaults.backgroundColor})`,
            ".bg-color-button": `background-color:var(--vscode-editorWidget-background, ${webDefaults.buttonBackgroundColor})`,
            ".font-size-scaled": "font-size:var(--scaled-font-size, 100%)",
            ".bg-lightgray": "background-color:#E8E8E8",
            ".bg-gray-30": "background-color:rgba(128,128,128,0.3)",
            ".bg-slate": "background-color:#A0A0A0",
            ".bg-red": "background-color:red",
            ".center-child": "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)",
            ".w800": "width:800px",
            ".h800": "height:800px",
            ".h2": "height:2rem",
            ".form-grid": "display:grid;padding:1rem;grid-template-columns:1fr 5fr;grid-gap:1em 1em",
            ".scale-12": "transform:scale(1.2)",
            ".maa": "margin:auto",
            ".maxh30": "max-height:30vh;overflow-y:scroll",
            ".maxh50": "max-height:50vh;overflow-y:scroll",
            ".maxh70": "max-height:70vh;overflow-y:scroll",
            ".h100-20": "height:calc(100vh - 2.2rem)",
            ".h100-35": "height:calc(100vh - 3.5rem)",
            ".w50px": "width:50px",
            ".w200px": "width:200px",
            ".w15": "width:1.5em",
            ".w100": "width:100%",
            ".w50": "width:50%",
            ".cursor-pointer": "cursor:pointer",
            ".cursor-auto": "cursor:auto",
            ".overflow-break-word": "overflow-wrap:break-word",
            ".hover-pointer:hover": "cursor:pointer",
            // Safari doesn't like this one
            //".focus-none:focus-visible": "outline:0px",
            ".recap-centered-title": "display:block;width:100%;text-align:center;margin-bottom:1.5rem",
            // tachyons
            ".absolute": "position: absolute",
            ".align-items-right": "align-items: right",
            ".ba": "border-style: solid; border-width: 1px",
            ".bb": "border-bottom-style: solid; border-bottom-width: 1px",
            ".b--dotted": "border-style: dotted",
            ".b--gray": "border-color: #777",
            ".b--red": "border-color: #ff4136",
            ".b--none": "border-style: none",
            ".b--solid": "border-style: solid",
            ".bg-inherit": "background-color: inherit",
            ".black-90": "color: rgba(0,0,0,0.9)",
            ".bn": "border-style: none; border-width: 0",
            ".bottom-0": "bottom: 0",
            ".bottom-2": "bottom: 2rem",
            ".br3": "border-radius: .5rem",
            ".bt": "border-top-style: solid; border-top-width: 1px",
            ".bw1": "border-width: .125rem",
            ".db": "display: block",
            ".dn": "display: none",
            ".f4": "font-size: 1.25rem",
            ".f5": "font-size: 1rem",
            ".f6": "font-size: 0.875rem",
            ".fixed": "position: fixed",
            ".flex": "display: flex",
            ".flex-column": "flex-direction:column",
            ".flex-grow-1": "flex-grow:1",
            ".flex-row": "flex-direction:row",
            ".hover-bg-blue:hover": "background-color:#aed1fe",
            ".hover-green:hover": "color:#19a974",
            ".justify-between": "justify-content:space-between",
            ".justify-center": "justify-content:center",
            ".justify-right": "justify-content:right",
            ".left-0": "left:0",
            ".left-100": "left:100px",
            ".ma0": "margin:0",
            ".ma1": "margin:0.25rem",
            ".ma2": "margin:0.5rem",
            ".mb3": "margin-bottom:1rem",
            ".ml2": "margin-left:0.5rem",
            ".ml4": "margin-left:2rem",
            ".mr1": "margin-right:.25rem",
            ".mr2": "margin-right:0.5rem",
            ".mt2": "margin-top:0.5rem",
            ".mt3": "margin-top:1rem",
            ".o-30": "opacity:0.3",
            ".o-70": "opacity:0.7",
            ".o-100": "opacity:1.0",
            ".orange": "color: #ff6300",
            ".outline-0": "outline:0",
            ".overflow-hidden": "overflow:hidden",
            ".overflow-y-scroll": "overflow-y:scroll",
            ".pa3px": "padding: 3px",
            ".pa0": "padding: 0",
            ".pa1": "padding: 0.25rem",
            ".pa2": "padding: 0.5rem",
            ".pa3": "padding: 1rem",
            ".pb1": "padding-bottom: 0.25rem",
            ".pb4": "padding-bottom: 2rem",
            ".pb5": "padding-bottom: 4rem",
            ".pl2": "padding-left: 0.5rem",
            ".pl4": "padding-left: 2rem",
            ".pr2": "padding-right: 0.5rem",
            ".pr4": "padding-right: 2rem",
            ".pre": "white-space: pre",
            ".pt1": "padding-top: .25rem",
            ".red": "color: #ff4136",
            ".relative": "position: relative",
            ".shadow-1": "box-shadow: 0 0 4px 2px rgba(0,0,0,0.2)",
            ".shadow-3": "box-shadow: 2px 2px 4px 2px rgba(0,0,0,0.2)",
            ".system-sans-serif": "font-family: sans-serif",
            ".system-serif": "font-family: serif",
            ".tc": "text-align: center",
            ".tl": "text-align: left",
            ".top-0": "top: 0",
            ".truncate": "white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
            ".vh-100": "height:100vh",
            ".w-100": "width: 100%",
            ".w-75": "width: 75%",
            ".ws-normal": "white-space: normal",
            ".ws-pre-wrap": "white-space: pre-wrap",
            ".z-1": "z-index: 1",
            ".z-999": "z-index: 999",
            "@media screen and (max-width: 45em)": ".dn-s { display: none } .vh-100-s { height: calc(100vh - 44px) }",
            "mark": "background-color:#3BC2EB;color:black",
            ".bl--edited": "border-left-color:#ff4136;border-left-width:2px;border-left-style:solid",
        };
        Object.keys(atomicClasses).forEach((selector) => {
            ZStyle_1.default.addRule(selector, atomicClasses[selector]);
        });
    }
    static initializeCSSVariables() {
        document.body.style.setProperty("--scaled-font-size", "100%");
        ZStyle_1.default.addRule("h1, h2", "padding-bottom: 10px");
    }
}
RecapStyle.allStyles = {};
RecapStyle.darkThemeDefaults = {
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: "14px",
    foregroundColor: "#cccccc",
    selectionColor: "#4e94ce",
    borderColor: "#d4d4d4",
    backgroundColor: "#1e1e1e",
    buttonBackgroundColor: "#252526",
};
RecapStyle.lightThemeDefaults = {
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: "14px",
    foregroundColor: "#616161",
    selectionColor: "#0000ff",
    borderColor: "#000000",
    backgroundColor: "#ffffff",
    buttonBackgroundColor: "#f3f3f3",
};
exports["default"] = RecapStyle;


/***/ }),

/***/ 382:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const ZLabel_1 = __webpack_require__(974);
const RecapButton_1 = __webpack_require__(697);
class RecapToolbar extends ZView_1.default {
    buttonStyle() {
        return "recap-toolbar-button";
    }
    addButton(name, codicon, hoverText, clickAction, style = "") {
        const params = {
            style: style || this.buttonStyle(),
            codicon: "codicon-" + codicon,
            hoverText: hoverText,
            clickAction: clickAction,
        };
        this.addChild({ name: name, viewClass: RecapButton_1.default, params: params });
        return this;
    }
    addBlank(index) {
        return this.addButton("blank-" + index, "blank", "", undefined, undefined);
    }
    addText(name, style, initialText = "") {
        const parms = {
            style: style,
            label: initialText,
        };
        this.addChild({ name: name, viewClass: ZLabel_1.default, params: parms });
        return this;
    }
}
RecapToolbar.defaultStyle = "recap-toolbar";
exports["default"] = RecapToolbar;


/***/ }),

/***/ 935:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const Webview_1 = __webpack_require__(602);
const LinkTarget_1 = __webpack_require__(361);
const LinkTargetView_1 = __webpack_require__(817);
const Extension_1 = __webpack_require__(732);
const MarkdownConverter_1 = __webpack_require__(363);
class RecapWebRoot extends ZView_1.default {
    constructor(name, params, tagName = "body") {
        super(name, params, tagName);
        this.linkTargetProp = this.createProp(null);
        this.recapList = [];
        this.currentRecapIndex = 0;
        this.params = params;
        this.webviewParams = {
            style: Webview_1.default.defaultStyle,
            switchRecapAction: this.createAction(this.loadRecapFile),
            toggleTargetViewAction: this.createAction(this.toggleTargetView),
        };
        this.linkTargetParams = { linkTargetProp: this.linkTargetProp };
        Extension_1.default.showLinkAction = this.createAction(this.showLink);
    }
    static openOn(initialFile, recapList) {
        const params = { style: this.defaultStyle };
        const root = ZView_1.default.createRootView(RecapWebRoot, params);
        root.openWithRecapList(initialFile, recapList);
    }
    toggleTargetView() {
        // TODO
    }
    // loadNextRecapFile() {
    //   const nextEntry = this.recapList[(this.currentRecapIndex + 1) % this.recapList.length];
    //   this.loadRecapFile(nextEntry.path);
    //   this.currentRecapIndex = this.currentRecapIndex + 1;
    // }
    openWithRecapList(initialFile, recapList) {
        this.recapList = recapList;
        const indexRecap = recapList.find((entry) => entry.path.endsWith("index.recap"));
        if (initialFile) {
            this.loadRecapFile(initialFile);
        }
        else if (indexRecap) {
            this.loadRecapFile(indexRecap.path);
        }
        else {
            this.loadRecapFile(recapList[0].path);
        }
    }
    async showLink(linkTarget) {
        if (!linkTarget.file) {
            this.linkTargetProp.set(LinkTarget_1.default.emptyLinkTarget);
            return;
        }
        const data = await fetch("../" + linkTarget.file);
        if (data.ok) {
            linkTarget.text = await data.text();
            linkTarget.html = MarkdownConverter_1.default.highlight(linkTarget.text);
        }
        else {
            linkTarget.html = "Target file not found: " + linkTarget.file;
        }
        this.linkTargetProp.set(linkTarget);
    }
    render() {
        this.addChild({ name: "webview", viewClass: Webview_1.default, params: this.webviewParams });
        this.addChild({ name: "linkTargetView", viewClass: LinkTargetView_1.default, params: this.linkTargetParams });
    }
    async loadRecapFile(recapPath) {
        const response = await fetch("../" + recapPath);
        const recapContents = await response.text();
        this.loadRecap(recapContents);
    }
    async loadRecap(contents) {
        const pluginFileNames = [
            "markdown-it-deflist.min.js",
            "markdown-it-emoji.min.js",
            "markdown-it-footnote.min.js",
            "markdown-it-sub.min.js",
            "markdown-it-sup.min.js",
        ];
        const data = {
            includeTargetText: false,
            allRecapFiles: this.recapList.map((entry) => entry.path),
            outputFileSpacing: 2,
            rootPath: "../",
            runtime: false,
            targetTextLength: 40,
            pluginFileNames: pluginFileNames,
            contents: contents,
        };
        // in vscode this message is sent from RecapEditorProvider.initWebView()
        window.postMessage({ type: "init", body: data }, window.location.origin);
    }
}
RecapWebRoot.defaultStyle = "recap-web-root";
exports["default"] = RecapWebRoot;


/***/ }),

/***/ 602:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const NotesContainer_1 = __webpack_require__(412);
const RecapDocument_1 = __webpack_require__(694);
const Extension_1 = __webpack_require__(732);
const RootExtension_1 = __webpack_require__(896);
const MarkdownConverter_1 = __webpack_require__(363);
const RecapPopUp_1 = __webpack_require__(574);
class Webview extends ZView_1.default {
    constructor(name, params, tagName) {
        super(name, params, tagName);
        this.params = params;
        this.documentProp = this.createProp(null);
        this.editModeProp = this.createProp(false);
        this.annotationsProp = this.createProp([]);
        this.mayQuickPickProp = this.createProp(false);
        this.allRecapFilesProp = this.createProp([]);
        this.rootPathProp = this.createProp("");
        this.runtimeProp = this.createProp(false);
        this.quickPickItemsProp = this.createProp([]);
        this.quickPickVisibleProp = this.createProp(false);
        this.quickPickPositionProp = this.createProp({ x: 0, y: 0 });
        this.quickPickPositionTypeProp = this.createProp(RecapPopUp_1.PopUpPositionType.cursor);
        this.quickPickStyle = this.createProp(this.currentRecapQuickPickStyle);
        this.includeTargetTextProp = this.createProp(false);
        this.targetTextLengthProp = this.createProp(40);
        this.outputFileSpacingProp = this.createProp(0);
        this.initializeNotesContainerParams();
        this.initializeExtensionParams();
        this.initializeRecapQuickPickParams();
        RootExtension_1.default.initialize(this.rootExtensionParams);
    }
    initializeNotesContainerParams() {
        this.notesContainerParams = {
            annotationsProp: this.annotationsProp,
            documentProp: this.documentProp,
            editModeProp: this.editModeProp,
            outputFileSpacingProp: this.outputFileSpacingProp,
            quickPickAction: this.createAction(this.quickPickRecapFile, this.mayQuickPickProp),
            revertAction: this.createAction(this.revert),
            rootPathProp: this.rootPathProp,
        };
    }
    initializeExtensionParams() {
        this.rootExtensionParams = {
            initWebViewAction: this.createAction(this.initWebView),
            updateConfigAction: this.createAction(this.updateConfig),
            quickPickAction: this.createAction(this.quickPickRecapFile),
        };
    }
    initializeRecapQuickPickParams() {
        this.recapQuickPickParams = {
            style: this.quickPickStyle,
            itemsProp: this.quickPickItemsProp,
            itemStyle: "recap-quick-pick-item",
            clickAction: this.createAction(this.handleRecapQuickPick),
            closeAction: this.createAction(this.hideRecapQuickPick),
            positionProp: this.quickPickPositionProp,
            positionTypeProp: this.quickPickPositionTypeProp,
            visibleProp: this.quickPickVisibleProp,
        };
    }
    render() {
        this.addChild({ name: "notes-container", viewClass: NotesContainer_1.default, params: this.notesContainerParams });
        this.addChild({ name: "recap-quickpick", viewClass: RecapPopUp_1.RecapPopUp, params: this.recapQuickPickParams });
        this.addModalWrapping("quickpick-wrapper", "recap-modal", this.quickPickVisibleProp, "recap-quickpick");
        //this.addWrapping("info-wrapper", this.recapInfoModalStyle, "recap-quickpick");
    }
    initWebView(data) {
        this.includeTargetTextProp.set(data.includeTargetText);
        this.allRecapFilesProp.set(data.allRecapFiles);
        this.mayQuickPickProp.set(data.allRecapFiles.length > 1);
        this.outputFileSpacingProp.set(data.outputFileSpacing);
        this.rootPathProp.set(data.rootPath);
        this.runtimeProp.set(data.runtime);
        this.targetTextLengthProp.set(data.targetTextLength);
        MarkdownConverter_1.default.pluginFileNames = data.pluginFileNames || [];
        this.loadRecapDocument(data.contents, data.fileName);
    }
    documentWasLoaded(document) {
        this.documentProp.set(document);
    }
    goBack() {
        Extension_1.default.goToPreviousRecapFile();
    }
    updateConfig({ includeTargetText, targetTextLength, outputFileSpacing }) {
        this.includeTargetTextProp.set(includeTargetText);
        this.targetTextLengthProp.set(targetTextLength);
        this.outputFileSpacingProp.set(outputFileSpacing);
    }
    currentRecapQuickPickStyle() {
        return this.quickPickVisibleProp.get() ? "recap-quick-pick" : "hidden";
    }
    quickPickRecapFile(event) {
        this.quickPickItemsProp.set(this.allRecapFilesProp.get());
        if (event) {
            this.showRecapQuickPickAtCursor(event);
        }
        else {
            this.showRecapQuickPick();
        }
    }
    showRecapQuickPickAtCursor(event) {
        this.quickPickVisibleProp.set(true);
        this.quickPickPositionTypeProp.set(RecapPopUp_1.PopUpPositionType.cursor);
        this.quickPickPositionProp.set({ x: event.clientX, y: event.clientY });
    }
    showRecapQuickPick() {
        this.quickPickVisibleProp.set(true);
        this.quickPickPositionTypeProp.set(RecapPopUp_1.PopUpPositionType.center);
    }
    handleRecapQuickPick(recapPath) {
        this.hideRecapQuickPick();
        if (Extension_1.default.isWebContext()) {
            this.params.switchRecapAction?.performWith(recapPath);
        }
        else {
            Extension_1.default.openOtherRecapFile(recapPath);
        }
    }
    hideRecapQuickPick() {
        this.quickPickVisibleProp.set(false);
    }
    loadRecapDocument(text, fileName) {
        this.documentProp.set(RecapDocument_1.default.nullDocument);
        this.annotationsProp.set([]);
        const doc = new RecapDocument_1.default(text);
        if (fileName) {
            doc.setFileName(fileName);
        }
        this.documentProp.set(doc);
        this.annotationsProp.set(doc.annotations);
    }
    revert(text) {
        this.loadRecapDocument(text);
    }
}
Webview.defaultStyle = "webview";
exports["default"] = Webview;


/***/ }),

/***/ 407:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZProp_1 = __webpack_require__(904);
const z_1 = __webpack_require__(813);
class ZAction {
    constructor(owner, callback, enabled = true) {
        this.valid = true;
        this.owner = owner;
        this.enabled = enabled instanceof ZProp_1.default ? enabled : ZProp_1.default.create(enabled, owner);
        this.callback = callback.bind(owner);
        this.args = [];
        this.valid = true;
        this.dependentProps = new Set();
    }
    static create(owner, callback, enabled) {
        return new ZAction(owner, callback, enabled);
    }
    release() {
        this.valid = false;
        this.enabled.release();
        this.dependentProps.forEach((p) => p.removeAction(this));
        this.dependentProps = new Set();
    }
    addDependentProp(prop) {
        this.dependentProps.add(prop);
    }
    removeDependentProp(prop) {
        this.dependentProps.delete(prop);
    }
    setEnabled(val) {
        if (z_1.default.isFunction(val)) {
            this.enabled.set(val.bind(this.owner));
        }
        else {
            this.enabled.set(val);
        }
    }
    enabledProp() {
        return this.enabled;
    }
    disabledProp() {
        return this.enabled.negated();
    }
    enable() {
        this.setEnabled(true);
    }
    disable() {
        this.setEnabled(false);
    }
    isEnabled() {
        return this.enabled.get();
    }
    isDisabled() {
        return !this.isEnabled();
    }
    disableWhile(fn) {
        const wasEnabled = this.enabled;
        if (wasEnabled) {
            this.disable();
        }
        fn();
        this.setEnabled(wasEnabled.value());
    }
    perform() {
        this.performWith(...this.args);
    }
    performWith(...args) {
        if (this.valid && this.isEnabled()) {
            this.callback(...this.args, ...args);
        }
    }
    with(...args) {
        const clone = z_1.default.clone(this);
        clone.args = args;
        return clone;
    }
}
exports["default"] = ZAction;


/***/ }),

/***/ 788:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ZDisclosure = void 0;
const ZView_1 = __webpack_require__(928);
const z_1 = __webpack_require__(813);
class ZDisclosure extends ZView_1.default {
    constructor(name, params) {
        super(name, params, ZDisclosure.defaultTagName);
        this.toggleHandler = this.handleToggle.bind(this);
        this.openProp = params.openProp;
        this.toggleAction = params.toggleAction;
        this.style = params.style;
        this.openProp.addAction(this.createAction(this.update));
        this.addEventListener("toggle", this.toggleHandler);
    }
    // update the disclosure triangle to reflect the openProp, without triggering a toggle event
    update() {
        this.removeEventListener("toggle", this.toggleHandler);
        if (z_1.default.valueof(this.openProp)) {
            this.setAttribute("open", "");
        }
        else {
            this.removeAttribute("open");
        }
        setTimeout(() => this.addEventListener("toggle", this.toggleHandler), 100);
    }
    handleToggle() {
        this.toggleAction?.performWith(this.openProp?.get());
    }
    createSummary() {
        this.summary = document.createElement("summary");
        this.summary.innerText = "";
        this.elt.appendChild(this.summary);
    }
    render() {
        //this.update();
        if (!this.summary) {
            this.createSummary();
        }
    }
}
exports.ZDisclosure = ZDisclosure;
ZDisclosure.defaultStyle = "";
ZDisclosure.defaultTagName = "details";
exports["default"] = ZDisclosure;


/***/ }),

/***/ 816:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
//import ZAction from "./ZAction";
const z_1 = __webpack_require__(813);
class ZInput extends ZView_1.default {
    constructor(name, params) {
        super(name, params, params.multiline ? "textarea" : "input");
        this.hasFocus = false;
        this.params = params;
        this.setEventActions({
            "blur": this.handleBlur,
            "focus": this.handleFocus,
        });
    }
    handleBlur() {
        this.hasFocus = false;
    }
    handleFocus() {
        this.hasFocus = true;
    }
    inputElement() {
        return this.params.multiline ? this.elt : this.elt;
    }
    render() {
        const inputElement = this.inputElement();
        inputElement.value = z_1.default.valueof(this.params.value);
        inputElement.readOnly = z_1.default.valueof(this.params.readOnly);
        inputElement.tabIndex = 0;
        if (!inputElement.readOnly && this.params.placeholder) {
            inputElement.placeholder = this.params.placeholder;
        }
    }
    setValue(value) {
        this.inputElement().value = value;
    }
    value() {
        return this.inputElement().value;
    }
    focusAndSelect() {
        const inputElement = this.inputElement();
        setTimeout(() => {
            inputElement.focus();
            inputElement.select();
        }, 200);
    }
}
ZInput.defaultStyle = "";
exports["default"] = ZInput;


/***/ }),

/***/ 961:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
class ZInterval {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    static create(start, end) {
        return new ZInterval(start, end);
    }
    isNull() {
        return this.start === -1 && this.end === -1;
    }
    boundedBy(min, max) {
        if (min > this.end || max < this.start) {
            return ZInterval.nullInterval;
        }
        return new ZInterval(Math.max(this.start, min), Math.min(this.end, max));
    }
}
ZInterval.nullInterval = new ZInterval(-1, -1);
exports["default"] = ZInterval;


/***/ }),

/***/ 974:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const z_1 = __webpack_require__(813);
class ZLabel extends ZView_1.default {
    constructor(name, params) {
        super(name, params);
        this.label = "";
        this.params = params;
        if (params.clickAction) {
            this.setClickAction(this.handleClick); // params.clickAction);
        }
    }
    render() {
        this.setInnerText(this.value());
    }
    handleClick() {
        this.params.clickAction?.performWith(this.value());
    }
    value() {
        return z_1.default.valueof(this.params.label);
    }
}
ZLabel.defaultStyle = "";
exports["default"] = ZLabel;


/***/ }),

/***/ 904:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
const z_1 = __webpack_require__(813);
class ZProp {
    constructor(val, owner) {
        this.fireOnAnySet = false;
        this.fn = null;
        this.id = ZProp.nextID();
        if (z_1.default.isFunction(val)) {
            this.fn = val;
            this.fn = this.fn.bind(owner);
            this.val = this.fn();
        }
        else {
            this.val = val;
        }
        this.owner = owner;
        this.actions = new Set();
        this.fireOnAnySet = false;
    }
    static create(val, owner) {
        return new ZProp(val, owner);
    }
    static addToSet(setProp, val) {
        const set = setProp.get();
        if (!set.has(val)) {
            const arr = [...Array.from(set), val];
            setProp.set(new Set(arr));
        }
    }
    static deleteFromSet(setProp, val) {
        const set = setProp.get();
        if (set.has(val)) {
            set.delete(val);
            const arr = Array.from(set);
            setProp.set(new Set(arr));
        }
    }
    static nextID() {
        this._nextID = this._nextID + 1;
        return this._nextID;
    }
    release() {
        this.actions.forEach((a) => a.removeDependentProp(this));
        this.actions = new Set();
    }
    value() {
        return this.val;
    }
    addActions() {
        const renderView = ZView_1.default.renderingView();
        if (renderView) {
            this.addAction(renderView.renderAction);
        }
    }
    get() {
        this.addActions();
        return this.fn ? this.fn() : this.val;
    }
    set(value) {
        if (value !== this.val || this.fireOnAnySet) {
            this.val = value;
            this.performActions();
        }
        return this;
    }
    fullID() {
        return this.owner.fullName() + "." + this.id;
    }
    performActions() {
        if (!this.actions) {
            console.log("no actions");
        }
        this.actions.forEach((a) => a.performWith(this.val));
    }
    toggle(value1, value2) {
        this.set(this.value() === value1 ? value2 : value1);
        return this;
    }
    addAction(action) {
        if (!action) {
            console.log("null action");
        }
        if (action) {
            if (!this.actions) {
                console.log("empty actions");
            }
            this.actions.add(action);
            action.addDependentProp(this);
        }
    }
    removeAction(action) {
        this.actions.delete(action);
    }
    asSimpleProp() {
        return {
            id: this.id,
            value: this.val,
        };
    }
    negated() {
        return new ZProp(() => !this.get(), this.owner);
    }
}
ZProp._nextID = 1;
exports["default"] = ZProp;


/***/ }),

/***/ 738:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZView_1 = __webpack_require__(928);
class ZStyle {
    static stylesheet() {
        if (!this.zstylesheet) {
            // try {
            //   this.zstylesheet = new CSSStyleSheet();
            //   document.adoptedStyleSheets! = [this.zstylesheet];
            // } catch {
            //   this.zstylesheet = document.styleSheets[0];
            // }
            this.zstylesheet = document.styleSheets[0];
        }
        return this.zstylesheet;
    }
    // add a rule to the end of the default stylesheet
    static addRule(selector, properties) {
        this.stylesheet().insertRule(`${selector}{${properties}}`, this.stylesheet().cssRules.length);
    }
    static expandMixins(style) {
        // replace any occurrences of {style} with its expansion
        const parts = style.split(" ");
        const mixins = parts.filter((p) => p.match(/\{*\}/));
        if (mixins.length === 0) {
            return style;
        }
        const atoms = parts.filter((p) => !mixins.includes(p));
        return [...mixins.map((m) => this.compositeStyles.get(m.substring(1, m.length - 1))), ...atoms].join(" ");
    }
    static addCompositeStyle(name, rules) {
        this.compositeStyles.set(name, this.expandMixins(rules));
    }
    static setProperty(elt, varName, value) {
        elt.style.setProperty(varName, value);
    }
    static getProperty(elt, varName) {
        return getComputedStyle(elt).getPropertyValue(varName);
    }
    static getRootProperty(varName) {
        return this.getProperty(ZView_1.default.rootView.elt, varName);
    }
    static setRootProperty(varName, value) {
        this.setProperty(ZView_1.default.rootView.elt, varName, value);
    }
    // styleName must be one or more composite names
    static styleFor(styleName) {
        const parts = styleName.split(" ");
        if (parts.length === 1) {
            const comp = this.compositeStyles.get(styleName);
            // start with the composite name to help with debugging
            return comp ? `${styleName} ${comp}` : styleName;
        }
        else {
            return parts.map((part) => this.styleFor(part)).join(" ");
        }
    }
    static initialize() {
        // reset; Safari requires these to be set separately
        ["html", "body", "h1", "h2", "h3", "h4", "h5", "h6", "p"].forEach((tag) => this.addRule(tag, "margin: 0; padding: 0; border: 0; box-sizing: border-box"));
    }
    static deviceIsIOS() {
        if (/iPad|iPhone|iPod/.test(navigator.platform)) {
            return true;
        }
        return navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform);
    }
}
ZStyle.compositeStyles = new Map();
exports["default"] = ZStyle;


/***/ }),

/***/ 928:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ZView = void 0;
const ZStyle_1 = __webpack_require__(738);
const ZAction_1 = __webpack_require__(407);
const ZProp_1 = __webpack_require__(904);
const ZInterval_1 = __webpack_require__(961);
const z_1 = __webpack_require__(813);
/*
 * Base class for UI components. A ZView is a simple wrapper around
 * an HTMLElement.
 */
class ZView {
    constructor(name, params = {}, tagName = "div") {
        this.actions = [];
        this.children = [];
        this.childSpecs = [];
        this.decorations = [];
        this.decorationSpecs = [];
        this.eventActions = {};
        this.isDecoration = false;
        this.isWrapping = false;
        this.parent = null;
        this.props = [];
        this.valid = true;
        this.wrappedViewNames = [];
        this.wrappings = [];
        this.wrappingSpecs = [];
        this.name = name;
        this.params = params;
        this.elt = tagName === "body" ? document.body : document.createElement(tagName);
        this.style = params?.style || "";
        if (params.tabIndex) {
            this.elt.tabIndex = params.tabIndex; // should be zero for aria
        }
        // stash this instance in the DOM for debugging
        // @ts-ignore
        this.elt["data-zaffre"] = this;
        this.valid = true;
        this.renderAction = this.createAction(ZView.useScheduler ? this.scheduleRender : this.fullRender);
        this.children = [];
        this.parent = null;
        this.props = [];
        this.actions = [];
        this.eventActions = {};
        this.childSpecs = [];
        this.wrappings = [];
        this.wrappingSpecs = [];
        this.isWrapping = false;
        this.wrappedViewNames = [];
        this.decorations = [];
        this.decorationSpecs = [];
        this.isDecoration = false;
        if (!this.renderAction) {
            this.renderAction = this.createAction(ZView.useScheduler ? this.scheduleRender : this.fullRender);
        }
    }
    static renderingView() {
        return z_1.default.last(this.renderStack);
    }
    static pushRenderView(view) {
        this.renderStack.push(view);
    }
    static popRenderView() {
        return this.renderStack.pop();
    }
    scheduleRender() {
        if (ZView.viewsToRender.length === 0) {
            setTimeout(() => ZView.renderPendingViews(), 10);
        }
        ZView.viewsToRender.push(this);
    }
    static renderPendingViews() {
        this.viewsToRender.forEach((v) => v.fullRender());
        this.viewsToRender = [];
    }
    static createRootView(viewClass, params = {}) {
        const inst = new viewClass("root", params, "div");
        document.body.appendChild(inst.elt);
        inst.fullRender();
        this.rootView = inst;
        return inst;
    }
    addParams(params) {
        Object.assign(this, params);
    }
    childNames() {
        return this.children.map((child) => child.name);
    }
    childNamed(name) {
        return this.children.find((child) => child.name === name);
    }
    rootView() {
        return this.parent ? this.parent.rootView() : this;
    }
    ancestorPath() {
        return this.parent ? [...this.parent.ancestorPath(), this] : [this];
    }
    fullName() {
        return this.ancestorPath()
            .map((v) => v.name)
            .join(".");
    }
    release() {
        // deallocation hook
        this.valid = false;
        this.props.forEach((p) => p.release());
        this.children.forEach((c) => c.release());
    }
    /*
     * Events
     */
    convertCallbackOrAction(callbackOrAction) {
        return callbackOrAction instanceof ZAction_1.default ? callbackOrAction : this.createAction(callbackOrAction);
    }
    eventHandler(eventType, event) {
        const action = this.eventActions[eventType];
        action.performWith(event);
    }
    setClickAction(callbackOrAction) {
        if (callbackOrAction) {
            this.setEventAction("click", this.convertCallbackOrAction(callbackOrAction));
        }
    }
    setEventAction(eventType, callbackOrAction) {
        if (eventType && callbackOrAction) {
            this.eventActions[eventType] = this.convertCallbackOrAction(callbackOrAction);
            this.addEventListener(eventType, this.eventHandler.bind(this, eventType));
        }
        return this;
    }
    setEventActions(actionMap) {
        Object.keys(actionMap).forEach((type) => this.setEventAction(type, actionMap[type]));
    }
    enableOrDisableEventAction(eventType, enable) {
        const action = this.eventActions[eventType];
        if (!action) {
            return;
        }
        if (enable) {
            this.addEventListener(eventType, this.eventHandler.bind(this, eventType));
        }
        else {
            this.removeEventListener(eventType, this.eventHandler.bind(this, eventType));
        }
    }
    /*
     * Props
     */
    createProp(val) {
        const prop = new ZProp_1.default(val, this);
        this.props.push(prop);
        return prop;
    }
    /*
     *  Saving and restoring props
     */
    localPropValues() {
        return this.props.map((p) => p.asSimpleProp());
    }
    allProps() {
        //@ts-ignore
        return [...this.props, ...this.children.reduce((acc, next) => [...acc, ...next.allProps()], [])];
    }
    getPropWithFullID(fullID) {
        return this.rootView()
            .allProps()
            .find((p) => p.fullID() === fullID);
    }
    allPropValues() {
        return Object.fromEntries(this.allProps().map((p) => [p.fullID(), p.get()]));
    }
    applyPropValues(newVals) {
        this.allProps().forEach((p) => {
            const fullPropID = p.fullID();
            if (fullPropID in newVals) {
                p.set(newVals[fullPropID]);
            }
        });
    }
    /*
     * Actions
     */
    createAction(callback, enabled = true) {
        const action = ZAction_1.default.create(this, callback, enabled);
        this.actions.push(action);
        return action;
    }
    /*
     * Styles
     */
    applyStyle() {
        if (this.style) {
            this.setCSSClass(ZStyle_1.default.styleFor(z_1.default.valueof(this.style)));
        }
    }
    applyDecorationAndWrapperStyles() {
        this.decorations.forEach((d) => d.applyStyle());
        this.wrappings.forEach((w) => w.applyStyle());
    }
    setCSSProperty(varName, value) {
        ZStyle_1.default.setProperty(this.elt, varName, value);
    }
    concatStyleProps(baseName, propPairs) {
        return [baseName, ...propPairs.map((pair) => (pair[0].get() ? pair[1] : "")).filter((x) => x)].join("-");
    }
    createStyleProp(baseName, propPairs) {
        return this.createProp(() => this.concatStyleProps(baseName, propPairs));
    }
    makeInvisibleForMilliseconds(ms) {
        const opacity = this.elt.style.opacity;
        if (opacity !== "0") {
            this.elt.style.opacity = "0";
            setTimeout(() => (this.elt.style.opacity = opacity), ms);
        }
    }
    setHeight(h) {
        this.elt.style.height = h.toString();
    }
    setPosition(x, y) {
        this.elt.style.left = `${x}px`;
        this.elt.style.top = `${y}px`;
    }
    /*
     *  Rendering
     */
    render() {
        // subclass responsibililty
    }
    afterRender() {
        // hook for subclasses
    }
    fullRender() {
        if (!this.valid) {
            return this;
        }
        ZView.pushRenderView(this);
        this.childSpecs = [];
        this.render();
        this.checkChildren();
        this.applyStyle();
        this.applyDecorationAndWrapperStyles();
        ZView.popRenderView();
        this.afterRender();
        return this;
    }
    /*
     * Decorations
     */
    addDecoration(name, cssClass, tagName = "div") {
        this.decorationSpecs.push({
            name: name,
            tagName: tagName,
            cssClass: cssClass,
        });
        return this;
    }
    appendDecoration(decoration) {
        this.elt.appendChild(decoration.elt);
        decoration.parent = this;
        return this;
    }
    decorationNamed(name) {
        return this.decorations.find((decoration) => decoration.name === name);
    }
    createDecoration(decorationSpec) {
        const params = { style: decorationSpec.cssClass };
        const decoration = new ZView(decorationSpec.name, params, decorationSpec.tagName);
        decoration.isDecoration = true;
        this.decorations.push(decoration);
        return decoration;
    }
    checkDecoration(decorationSpec) {
        const existingDecoration = this.decorationNamed(decorationSpec.name);
        if (!existingDecoration) {
            this.appendDecoration(this.createDecoration(decorationSpec));
        }
    }
    /*
     * Wrapping methods
     */
    includesViewNamed(viewName) {
        return this.wrappedViewNames.some((vn) => viewName.match(vn));
    }
    addWrapping(name, cssClass, ...viewNames) {
        this.wrappingSpecs.push({
            name: name,
            cssClass: cssClass,
            viewNames: viewNames,
        });
        return this;
    }
    addModalWrapping(name, cssClass, visibleProp, ...viewNames) {
        this.addWrapping(name, () => (visibleProp.get() ? cssClass : "hidden"), ...viewNames);
    }
    appendWrapping(wrapping) {
        this.elt.appendChild(wrapping.elt);
        wrapping.parent = this;
        return this;
    }
    wrappingForChild(childName) {
        return this.wrappings.find((wrapping) => wrapping.includesViewNamed(childName));
    }
    wrappingNamed(name) {
        return this.wrappings.find((wrapping) => wrapping.name === name);
    }
    createWrapping(wrappingSpec) {
        const params = { style: wrappingSpec.cssClass };
        const wrapping = new ZView(wrappingSpec.name, params, "div");
        wrapping.isDecoration = true;
        wrapping.isWrapping = true;
        wrapping.wrappedViewNames = wrappingSpec.viewNames;
        this.wrappings.push(wrapping);
        return wrapping;
    }
    checkWrapping(wrappingSpec) {
        const existingWrapping = this.wrappingNamed(wrappingSpec.name);
        if (!existingWrapping) {
            this.appendWrapping(this.createWrapping(wrappingSpec));
        }
    }
    /*
     * Creating and adding child views
     */
    createChild(childSpec) {
        const viewClass = childSpec.viewClass;
        if (!childSpec.params.style) {
            childSpec.params.style = viewClass.defaultStyle;
        }
        const inst = new viewClass(childSpec.name, childSpec.params, viewClass.defaultTagName || "div");
        inst.fullRender();
        return inst;
    }
    checkChild(childSpec) {
        const existingChild = this.childNamed(childSpec.name);
        if (!existingChild) {
            const wrapping = this.wrappingForChild(childSpec.name);
            const child = this.createChild(childSpec);
            if (wrapping) {
                wrapping.appendChild(child);
            }
            else {
                this.appendChild(child);
            }
        }
    }
    checkChildren() {
        this.wrappingSpecs.forEach((wrappingSpec) => this.checkWrapping(wrappingSpec));
        this.decorationSpecs.forEach((decorationSpec) => this.checkDecoration(decorationSpec));
        const newChildNames = this.childSpecs.map((spec) => spec.name);
        this.children.slice().forEach((child) => {
            if (!newChildNames.includes(child.name)) {
                this.removeChild(child);
            }
        });
        this.childSpecs.forEach((childSpec) => {
            this.checkChild(childSpec);
        });
        this.fixChildren();
    }
    addChild({ name, viewClass, params }) {
        this.childSpecs.push({
            name,
            viewClass,
            params,
        });
        return this;
    }
    getChildren(elt, childNames) {
        if (!elt.children) {
            return [];
        }
        let answer = [];
        Array.from(elt.children).forEach((c) => {
            //@ts-ignore
            const v = c["data-zaffre"];
            if (v && childNames.includes(v.name)) {
                //@ts-ignore
                answer.push(c["data-zaffre"]);
            }
            else {
                answer = [...answer, ...this.getChildren(c, childNames)];
            }
        });
        return answer;
    }
    fixChildren() {
        this.children = this.getChildren(this.elt, this.childSpecs.map((spec) => spec.name));
    }
    /*
     * DOM methods
     */
    addClass(cssClass) {
        this.elt.classList.add(cssClass);
        return this;
    }
    addEventListener(type, callback) {
        if (callback) {
            this.elt.addEventListener(type, callback);
        }
        return this;
    }
    addOrRemoveEventListener(type, callback, add) {
        if (callback) {
            if (add) {
                this.elt.addEventListener(type, callback);
            }
            else {
                this.elt.removeEventListener(type, callback);
            }
        }
        return this;
    }
    addOrRemoveClass(cssClass, add) {
        if (add) {
            this.addClass(cssClass);
        }
        else {
            this.removeClass(cssClass);
        }
        return this;
    }
    appendChild(child) {
        if (child.elt) {
            this.elt.appendChild(child.elt);
        }
        if (this.isWrapping) {
            child.parent = this.parent;
            this.parent?.children.push(child);
        }
        else {
            child.parent = this;
            this.children.push(child);
        }
        return this;
    }
    classList() {
        return this.elt.classList;
    }
    clear() {
        this.elt.innerHTML = "";
        this.children = [];
        return this;
    }
    clientRect() {
        return this.elt.getBoundingClientRect();
    }
    containsClass(cssClass) {
        return this.elt.classList.contains(cssClass);
    }
    eventTargetIsSelf(event) {
        return event.target === this.elt;
    }
    focus() {
        setTimeout(() => this.elt.focus(), 200);
        return this;
    }
    hasNextSibling() {
        return this.elt.nextElementSibling;
    }
    hasParent() {
        return this.elt.parentElement;
    }
    hasPreviousSibling() {
        return this.elt.previousElementSibling;
    }
    innerHTML() {
        return this.elt.innerText;
    }
    innerText() {
        return this.elt.innerText;
    }
    isContentEditable() {
        // may be true, false, or inherit
        return this.elt.contentEditable == "true";
    }
    moveAfter(view) {
        if (view) {
            this.elt.parentNode?.insertBefore(this.elt, view.elt.nextElementSibling);
            this.parent?.fixChildren();
        }
    }
    moveBefore(view) {
        if (view) {
            this.elt.parentNode?.insertBefore(this.elt, view.elt);
            this.parent?.fixChildren();
        }
    }
    moveAfterNextSibling() {
        if (this.elt.nextElementSibling) {
            this.elt.parentNode?.insertBefore(this.elt.nextElementSibling, this.elt);
            this.parent?.fixChildren();
        }
    }
    moveBeforePreviousSibling() {
        if (this.elt.previousElementSibling) {
            this.elt.parentNode?.insertBefore(this.elt, this.elt.previousElementSibling);
            this.parent?.fixChildren();
        }
    }
    nextSibling() {
        return this.elt.nextElementSibling;
    }
    nextSiblingView() {
        if (!this.nextSibling()) {
            return null;
        }
        //@ts-ignore
        return this.nextSibling()["data-zaffre"];
    }
    previousSibling() {
        return this.elt.previousElementSibling;
    }
    previousSiblingView() {
        if (!this.previousSibling()) {
            return null;
        }
        //@ts-ignore
        return this.previousSibling()["data-zaffre"];
    }
    removeAttribute(attrName) {
        this.elt.removeAttribute(attrName);
    }
    removeChild(child) {
        child.elt?.remove();
        child.parent = null;
        child.release();
        this.fixChildren();
    }
    removeClass(cssClass) {
        this.elt.classList.remove(cssClass);
        return this;
    }
    removeEventListener(type, callback) {
        this.elt.removeEventListener(type, callback);
        return this;
    }
    replaceClass(oldCSSClass, newCSSClass) {
        this.elt.classList.replace(oldCSSClass, newCSSClass);
        return this;
    }
    scrollIntoViewIfNeeded() {
        if (!this.elt.parentElement) {
            return this;
        }
        const r = this.clientRect();
        const h = this.elt.parentElement.getBoundingClientRect().height - 25;
        if (r.bottom > h) {
            this.elt.parentElement.scrollBy(0, r.bottom - h + 8);
        }
        const rr = this.clientRect();
        if (rr.top < 0) {
            this.elt.parentElement.scrollBy(0, rr.top - 2);
        }
        return this;
    }
    setAttribute(attrName, value) {
        this.elt.setAttribute(attrName, value);
        return this;
    }
    setBorderStyle(borderStyle) {
        this.elt.style.borderStyle = borderStyle;
    }
    setCSSClass(clsName) {
        this.elt.className = clsName;
        return this;
    }
    setContentEditable(editable) {
        this.elt.contentEditable = editable.toString();
    }
    setInnerHTML(html) {
        this.elt.innerHTML = html;
        return this;
    }
    setInnerText(text) {
        this.elt.innerText = text;
        return this;
    }
    setTabIndex(index) {
        this.setAttribute("tabindex", index.toString());
    }
    setTextContent(text) {
        this.elt.textContent = text;
        return this;
    }
    setTitle(text) {
        this.elt.title = text;
        return this;
    }
    toggleClass(cssClass) {
        this.elt.classList.toggle(cssClass);
        return this;
    }
    toString() {
        return this.constructor.name;
    }
    /*
     * Methods on plain text elements.
     */
    lengthOfNode(node) {
        const nodeName = node.nodeName.toLowerCase();
        return nodeName === "br" ? 1 : nodeName === "#text" ? node.length : 0;
    }
    getNodeAtPosition(position) {
        const nodeIterator = document.createNodeIterator(this.elt, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let pos = 0;
        let node;
        let lastNode = null;
        while ((node = nodeIterator.nextNode())) {
            const len = this.lengthOfNode(node);
            if (pos + len > position) {
                return node;
            }
            pos = pos + len;
            lastNode = node;
        }
        return lastNode;
    }
    getPositionOfNode(nodeToFind) {
        const nodeIterator = document.createNodeIterator(this.elt, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let position = 0;
        let node;
        while ((node = nodeIterator.nextNode())) {
            if (node === nodeToFind) {
                return position;
            }
            position = position + this.lengthOfNode(node);
        }
        return position;
    }
    convertRangeToInterval(range) {
        this.elt.normalize();
        const startNode = range.startContainer === this.elt ? this.elt.childNodes[range.startOffset] : range.startContainer;
        const endNode = range.endContainer === this.elt ? this.elt.childNodes[range.endOffset] : range.endContainer;
        let start = this.getPositionOfNode(startNode);
        let end = this.getPositionOfNode(endNode);
        if (range.startContainer !== this.elt) {
            start = start + range.startOffset;
            end = end + range.endOffset;
        }
        return ZInterval_1.default.create(start, end);
    }
    convertIntervalToRange(interval) {
        if (interval.isNull()) {
            return null;
        }
        this.elt.normalize();
        const range = document.createRange();
        const startNode = this.getNodeAtPosition(interval.start);
        if (!startNode) {
            return null;
        }
        const startPosition = this.getPositionOfNode(startNode);
        if (interval.start === interval.end && startPosition === interval.start && startNode !== this.elt) {
            // use this.elt as the container
            const pos = Array.prototype.indexOf.call(this.elt.childNodes, startNode);
            range.setStart(this.elt, pos);
            range.setEnd(this.elt, pos);
        }
        else {
            const endNode = this.getNodeAtPosition(interval.end);
            if (!endNode) {
                return null;
            }
            const endPosition = this.getPositionOfNode(endNode);
            range.setStart(startNode, interval.start - startPosition);
            range.setEnd(endNode, interval.end - endPosition);
        }
        return range;
    }
    setSelectionInterval(interval) {
        if (interval) {
            const selection = window.getSelection();
            const range = this.convertIntervalToRange(interval);
            if (selection && range) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }
    getSelectionInterval() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return ZInterval_1.default.nullInterval;
        }
        return this.convertRangeToInterval(selection.getRangeAt(0));
    }
    deleteTextInInterval(interval) {
        const intvl = interval.boundedBy(0, this.innerText().length);
        const range = this.convertIntervalToRange(intvl);
        if (!range) {
            return;
        }
        if (intvl.end === intvl.start + 1 && range.startContainer.nodeName === "BR") {
            range.startContainer.remove();
            return;
        }
        if (intvl.end === intvl.start + 1 && range.endContainer.nodeName === "BR") {
            range.endContainer.remove();
            return;
        }
        range.deleteContents();
    }
    insertText(text, position) {
        const pos = Math.max(0, Math.min(position, this.innerText().length));
        const node = this.getNodeAtPosition(pos);
        if (!node) {
            console.log("insertText: null node");
            return;
        }
        const range = this.convertIntervalToRange(ZInterval_1.default.create(pos, pos));
        if (range) {
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            range.collapse(false);
            const end = position + text.length;
            this.setSelectionInterval(ZInterval_1.default.create(end, end));
        }
    }
}
exports.ZView = ZView;
ZView.renderStack = [];
ZView.useScheduler = false;
ZView.viewsToRender = [];
exports["default"] = ZView;


/***/ }),

/***/ 813:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const ZProp_1 = __webpack_require__(904);
class z {
    static valueof(x) {
        return z.isProp(x) ? x.get() : z.isFunction(x) ? x() : x;
    }
    static isFunction(f) {
        return typeof f === "function";
    }
    static functionName(f) {
        // accomodate bound functions
        return z.isFunction(f) ? z.last(f.name.split(" ")) : null;
    }
    static isArray(x) {
        return Array.isArray(x);
    }
    static isObject(x) {
        return x && !z.isArray(x) && typeof x === "object";
    }
    static isString(s) {
        return typeof s === "string";
    }
    static isRegExp(x) {
        return x instanceof RegExp;
    }
    static isProp(x) {
        return x instanceof ZProp_1.default;
    }
    /*
     * Object utilities
     */
    static mapObjectValues(obj, fn) {
        return z.isEmptyObject(obj) ? {} : Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value)]));
    }
    static isEmptyObject(obj) {
        return obj && Object.keys(obj).length === 0 && Object.getPrototypeOf(obj) === Object.prototype;
    }
    static clone(instance) {
        return instance ? Object.assign(Object.create(Object.getPrototypeOf(instance)), instance) : null;
    }
    static selectKeys(obj, keys) {
        const result = {};
        for (const key of keys) {
            if (key in obj) {
                result[key] = obj[key];
            }
        }
    }
    /*
     * Array utilities
     */
    static indexes(start, end) {
        return Array(end - start + 1)
            .fill(null)
            .map((_val, idx) => start + idx);
    }
    static deleteAtIndex(array, index) {
        return z.splice(array, index, 1);
    }
    static deleteValue(array, value) {
        return z.splice(array, array.indexOf(value), 1);
    }
    static duplicate(array) {
        return array.slice();
    }
    static insertAtIndex(array, index, ...vals) {
        return z.splice(array, index, 0, ...vals);
    }
    static splice(array, start, deleteCount, ...additions) {
        const clone = z.duplicate(array);
        clone.splice(start, deleteCount, ...additions);
        return clone;
    }
    static firstOrNull(array) {
        if (!array || array.length === 0) {
            return null;
        }
        return array[0];
    }
    static last(array) {
        if (!array || array.length === 0) {
            return null;
        }
        return array[array.length - 1];
    }
    static moveElementDown(array, index) {
        if (index < 0 || index >= array.length - 1) {
            return array;
        }
        return [...array.slice(0, index), array[index + 1], array[index], ...array.slice(index + 2)];
    }
    static moveElementUp(array, index) {
        if (index === 0 || index >= array.length) {
            return array;
        }
        return [...array.slice(0, index - 1), array[index], array[index - 1], ...array.slice(index + 1)];
    }
    static count(array, fn) {
        return array.filter(fn).length;
    }
    static sum(array, fn) {
        return array.reduce((sum, val) => sum + fn(val), 0);
    }
    static allButFirst(array, n = 1) {
        return array.slice(n);
    }
    static allButLast(array, n = 1) {
        return array.slice(0, array.length - n);
    }
    static allButFirstAndLast(array) {
        return array.slice(1, array.length - 1);
    }
    static isNonEmptyArray(obj) {
        return z.isArray(obj) && obj.length > 0;
    }
    /*
     * String
     */
    static firstLine(text) {
        return text.split("\n", 1)[0];
    }
    static sameAs(str1, str2) {
        return str1.toLowerCase() === str2.toLowerCase();
    }
    static capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    /*
     * DOM functions
     */
    static insertElementAfter(newNode, referenceNode) {
        referenceNode.parentNode?.insertBefore(newNode, referenceNode?.nextSibling);
    }
    static indexOfChildElement(elt) {
        return elt ? Array.prototype.indexOf.call(elt.parentElement, elt) : -1;
    }
    // adapted from the npm package element.scrollIntoViewIfNeeded polyfill (Kilian Schefer / Hubert Salonniere)
    static scrollElementIntoViewIfNeeded(elt, centerIfNeeded = true) {
        const parent = elt.parentElement;
        if (!parent) {
            return;
        }
        const parentComputedStyle = window.getComputedStyle(parent, null);
        const parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue("border-top-width"));
        const parentBorderLeftWidth = parseInt(parentComputedStyle.getPropertyValue("border-left-width"));
        const overTop = elt.offsetTop - parent.offsetTop < parent.scrollTop, overBottom = elt.offsetTop - parent.offsetTop + elt.clientHeight - parentBorderTopWidth >
            parent.scrollTop + parent.clientHeight, overLeft = elt.offsetLeft - parent.offsetLeft < parent.scrollLeft, overRight = elt.offsetLeft - parent.offsetLeft + elt.clientWidth - parentBorderLeftWidth >
            parent.scrollLeft + parent.clientWidth, alignWithTop = overTop && !overBottom;
        if ((overTop || overBottom) && centerIfNeeded) {
            parent.scrollTop =
                elt.offsetTop - parent.offsetTop - parent.clientHeight / 2 - parentBorderTopWidth + elt.clientHeight / 2;
        }
        if ((overLeft || overRight) && centerIfNeeded) {
            parent.scrollLeft =
                elt.offsetLeft - parent.offsetLeft - parent.clientWidth / 2 - parentBorderLeftWidth + elt.clientWidth / 2;
        }
        if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
            elt.scrollIntoView(alignWithTop);
        }
    }
}
exports["default"] = z;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.showLink = void 0;
const ZView_1 = __webpack_require__(928);
const Extension_1 = __webpack_require__(732);
const Webview_1 = __webpack_require__(602);
const RecapStyle_1 = __webpack_require__(866);
const RecapWebRoot_1 = __webpack_require__(935);
try {
    Extension_1.default.vscode = acquireVsCodeApi();
}
catch {
    Extension_1.default.vscode = null;
}
RecapStyle_1.default.initialize();
async function openOnRecapJSON(initialFile) {
    const response = await fetch("./recaps.json");
    if (!response.ok) {
        // TODO: show error page
        return;
    }
    const json = await response.json();
    RecapWebRoot_1.default.openOn(initialFile, json.recaps);
}
if (Extension_1.default.vscode) {
    ZView_1.default.createRootView(Webview_1.default);
}
else {
    const params = (new URL(document.location.toString())).searchParams;
    openOnRecapJSON(params.get("recap") || "");
    // const recapFile = params.get("recap");
    // if (recapFile) {
    //   RecapWebRoot.openOn([{ title: "", path: recapFile }]);
    // } else {
    //   openOnRecapJSON();
    // }
}
//
// Exports for web context
//
// export function openRecapFile(recapFile: string) {
//   RecapWebRoot.openOn([{ title: "", path: recapFile }]);
// }
function showLink(linkTarget) {
    Extension_1.default.showMarkdownLink(linkTarget);
}
exports.showLink = showLink;

})();

Recap = __webpack_exports__;
/******/ })()
;