import assert from "node:assert/strict";
import { HiddenBracketWidget } from "../src/features/tags/widgets";

const createdSpan = {
	hidden: false,
	textContent: null as string | null,
};

Object.assign(globalThis, {
	activeDocument: {
		createElement(tagName: string) {
			assert.equal(tagName, "span");
			return createdSpan;
		},
		createSpan() {
			throw new DOMException(
				"Only one element on document allowed.",
				"HierarchyRequestError",
			);
		},
	},
});

const widget = new HiddenBracketWidget("{");
const rendered = widget.toDOM();

assert.equal(rendered, createdSpan);
assert.equal(rendered.hidden, true);
assert.equal(rendered.textContent, "{");

console.log("Tag widget creates a detached span.");
