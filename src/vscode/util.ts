/**
 * This file is adapted from the VS Code PawDraw custome editor sample.
 *   https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample
 */

import * as vscode from "vscode";

//
// Generate a random string to use to whitelist scripts; see RecapEditor.getHtmlForWebview().
//
export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

//
// Expand a relative path to include the workspace root
//
export function getFullLocalPath(fileName: string): string {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const f = fileName || "";
	if (!workspaceFolders) {
		return f;
	}
	return vscode.Uri.joinPath(workspaceFolders[0].uri, f).fsPath;
}

//
// Return the number of distinct characters in a given string. This is used in trying to
// locate a link target in a file that has been changed.
//
export function countDistinctCharacters(s: string) : number {
	return [...new Set(s)].join("").length;
}

//
// Return the last element of an array.
//
export function lastElement(a: Array<any>) {
	return a[a.length - 1];
}

export function parsePath(p: string) {
	const fName = lastElement(p.split("/"));
	const ext = lastElement(fName.split("."));
	return {
		dir: p.substring(0, p.length - fName.length - 1),
		base: fName,
		ext: ext,
		name: fName.substring(0, fName.length - ext.length - 1)
	};
}