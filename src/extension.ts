
/* eslint-disable curly */
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	let extension = new BetterLuaSyntax(context);
	vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => extension.onDocumentSave(doc));
};

const specials = [
	"/", ".", "*", "+", "?", "|",
	"(", ")", "[", "]", "{", "}", "\\"
];
const rxSpecials = new RegExp("(\\" + specials.join("|\\") + ")", "g");

function regexEscape(text: string) { //Credit: https://simonwillison.net/2006/Jan/20/escape/
	return text.replace(rxSpecials, "\\$1");
}

/**
 * The main class for the Better Lua Syntax extension.
 */
class BetterLuaSyntax {
	#context: vscode.ExtensionContext;
	#editor: vscode.TextEditor | null | undefined;
	#editsMade: number;

	/**
	 * Better Lua Syntax extension constructor.
	 * 
	 * @param context {vscode.ExtensionContext} - The extension context.
	 */
	public constructor(context: vscode.ExtensionContext) {
		this.#context = context;
		this.#editsMade = 0;
	
		console.log("Better Lua Syntax: Activated.");
	};

	/**
	 * Calls all the possible syntax checks and replacements, this should be called on document save.
	 * 
	 * @param document {vscode.TextDocument} - The document that was saved.
	 */
	public onDocumentSave(document: vscode.TextDocument) {
		this.#editor = vscode.window.activeTextEditor;

		let doc: vscode.TextDocument = document as vscode.TextDocument;
		if (doc.uri.scheme !== "file" || (doc.languageId !== "lua" && doc.languageId !== "glua")) return; //Only perform modifications on local Lua files

		this.replaceOccurances("!=", doc, "~=") //Replace "!=" with Lua "~="

		 .then(() => this.replaceOccurances("&&", doc, "and")) //Replace "&&" with Lua "and"
		 .then(() => this.replaceOccurances("||", doc, "or")) //Replace "||" with Lua "or"

		 .then(() => this.replaceOccurances("/*", doc, "--[[")) //Replace "/*" with Lua "--[["
		 .then(() => this.replaceOccurances("*/", doc, "]]")) //Replace "*/" with Lua "]]"

		 .then(() => this.replaceOccurances("//", doc, "--")) //Replace "//" with Lua "--"

		 .finally(() => {
			if (this.#editsMade < 1) return;
			vscode.window.showInformationMessage("Better Lua Syntax has made " + this.#editsMade.toString() + " changes to your code.");
			this.#editsMade = 0;
		 })

		 .catch(error => {
			vscode.window.showInformationMessage("Better Lua Syntax had an error while checking a file. Please report the error in your console.");
			console.error(error);
		});
	};

	/**
	 * Replaces all occurances of the needle in a document with the specified replacement.
	 * 
	 * @param needle {string} - The needle (what will be replaced).
	 * @param document {vscode.TextDocument} - The document to check for needle occurances in.
	 * @param replacement {string} - The text to replace the needle with.
	 * 
	 * @returns {Promise} A promise.
	 */
	private replaceOccurances(needle: string, doc: vscode.TextDocument, replacement: string): Promise<void> {
		return new Promise(async (resolve) => {
			const hayStack = doc.getText();

			const rxNeedle = new RegExp(regexEscape(needle), "gi"); //Needle searching regex

			let occurances: number[] = [];
			while (rxNeedle.exec(hayStack)) occurances.push(rxNeedle.lastIndex); //Store all the positions of the needles

			if (occurances.length < 1) return resolve();

			const needleLength = needle.length;

			await this.#editor?.edit(async function(editBuilder) {
				occurances.forEach(index => { //Replace all occurances of needles with the replacement string
					editBuilder.replace(new vscode.Range(
						doc.positionAt(index - needleLength),
						doc.positionAt(index)
					), replacement);
				});
			});

			this.#editsMade++;
			return resolve();
		});
	};
};