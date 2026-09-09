import { WidgetType } from "@codemirror/view";

/**
 * A widget that hides specific characters (e.g. `{`, `}`, `!`, `-`) from view.
 */
export class HiddenBracketWidget extends WidgetType {
	constructor(private text: string) {
		super();
	}
	toDOM(): HTMLElement {
		// Document.createSpan() appends to the document, but CodeMirror widgets need a detached node.
		// eslint-disable-next-line obsidianmd/prefer-create-el
		const span = activeDocument.createElement("span");
		span.hidden = true;
		span.textContent = this.text;
		return span;
	}
}
