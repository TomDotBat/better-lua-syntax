
import * as vscode from "vscode";

/* eslint-disable curly */
export function activate(context: vscode.ExtensionContext) {
	console.log("Better Lua Syntax: Activated.");

	vscode.workspace.onDidSaveTextDocument(function(document: vscode.TextDocument) {
		if ((document.languageId !== "lua" && document.languageId !== "glua")
			|| document.uri.scheme !== "file") return;

		const documentText = document.getText();
		const editor = vscode.window.activeTextEditor;

		editor?.edit(editBuilder => { //Replace != with ~=
			const rxNotEquals = new RegExp("!=", "gi");

			while (rxNotEquals.exec(documentText)) {
				editBuilder.replace(new vscode.Range(
					document.positionAt(rxNotEquals.lastIndex - 2),
					document.positionAt(rxNotEquals.lastIndex)
				), "~=");
			};
		});
	});
};