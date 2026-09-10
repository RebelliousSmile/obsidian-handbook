import { WidgetType } from "@codemirror/view";

/**
 * A widget that hides specific characters (e.g. `{`, `}`, `!`, `-`) from view.
 */
export class HiddenBracketWidget extends WidgetType {
	// eslint-disable-next-line obsidianmd/prefer-active-doc
	constructor(private text: string) {
		super();
	}
	toDOM(): HTMLElement {
		// Document.createSpan() appends to the document, but CodeMirror widgets need a detached node.
		const span = activeDocument.createElementNS(
			"http://www.w3.org/1999/xhtml",
			"span",
		);
		span.hidden = true;
		span.textContent = this.text;
		return span;
	}
}
