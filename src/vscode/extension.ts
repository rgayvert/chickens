/**
 * This file is adapted from the VS Code PawDraw custome editor sample.
 *   https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample
 */

import * as vscode from "vscode";
import { RecapEditorProvider } from "./RecapEditor";

export function activate(context: vscode.ExtensionContext) {
  // Register our custom editor provider
  context.subscriptions.push(RecapEditorProvider.register(context));
}
