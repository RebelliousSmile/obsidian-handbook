import assert from "node:assert/strict";
import { parseLayoutRegions } from "../src/features/layoutRegions/parser";
import {
	mapRegionToSections,
	wrapSectionsInRegion,
} from "../src/features/layoutRegions/sectionMapper";

const source = [
	"before",
	"<!-- handbook-layout: columns=3 -->",
	"# One",
	"# Two",
	"# Three",
	"<!-- /handbook-layout -->",
	"between",
	"<!-- handbook-layout: columns=1 -->",
	"| Wide | Table |",
	"| --- | --- |",
	"<!-- /handbook-layout -->",
].join("\n");

assert.deepEqual(parseLayoutRegions(source), {
	diagnostics: [],
	regions: [
		{ columns: 3, lineStart: 2, lineEnd: 4 },
		{ columns: 1, lineStart: 8, lineEnd: 9 },
	],
});

const malformed = [
	"<!-- handbook-layout: columns=0 -->",
	"<!-- /handbook-layout -->",
	"<!-- handbook-layout: columns=2 -->",
	"<!-- handbook-layout: columns=3 -->",
	"<!-- /handbook-layout -->",
	"<!-- handbook-layout: columns=4 -->",
].join("\n");

assert.deepEqual(parseLayoutRegions(malformed), {
	diagnostics: [
		{ line: 0, reason: "invalid-open" },
		{ line: 1, reason: "orphan-close" },
		{ line: 3, reason: "overlapping-open" },
		{ line: 4, reason: "orphan-close" },
		{ line: 5, reason: "unclosed-open" },
	],
	regions: [],
});

const literal = [
	"```markdown",
	"<!-- handbook-layout: columns=3 -->",
	"# Not a region",
	"<!-- /handbook-layout -->",
	"```",
	"<!-- handbook-layout: columns=1 -->",
	"content",
	"<!-- /handbook-layout -->",
].join("\n");

assert.deepEqual(parseLayoutRegions(literal), {
	diagnostics: [],
	regions: [{ columns: 1, lineStart: 6, lineEnd: 6 }],
});

const first = { name: "first" };
const second = { name: "second" };
const third = { name: "third" };
const mapped = mapRegionToSections(
	{ columns: 3, lineStart: 2, lineEnd: 4 },
	[
		{ info: { lineStart: 2, lineEnd: 2 }, section: first },
		{ info: { lineStart: 3, lineEnd: 3 }, section: second },
		{ info: { lineStart: 4, lineEnd: 4 }, section: third },
	],
);
assert.deepEqual(mapped, [first, second, third]);

assert.equal(
	mapRegionToSections(
		{ columns: 3, lineStart: 2, lineEnd: 4 },
		[
			{ info: { lineStart: 2, lineEnd: 3 }, section: first },
			{ info: { lineStart: 4, lineEnd: 5 }, section: second },
		],
	),
	null,
);

type FakeElement = {
	children: FakeElement[];
	classList: { add: (...names: string[]) => void; values: Set<string> };
	name: string;
	ownerDocument: { createElement: (name: string) => FakeElement };
	parent: FakeElement | null;
	style: { setProperty: (name: string, value: string) => void; values: Map<string, string> };
	appendChild: (child: FakeElement) => void;
	before: (child: FakeElement) => void;
};

function fakeElement(name: string): FakeElement {
	const element: FakeElement = {
		children: [],
		classList: { add: (...names) => names.forEach((name) => element.classList.values.add(name)), values: new Set() },
		name,
		ownerDocument: { createElement: fakeElement },
		parent: null,
		style: { setProperty: (name, value) => element.style.values.set(name, value), values: new Map() },
		appendChild(child) {
			if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
			this.children.push(child);
			child.parent = this;
		},
		before(child) {
			const parent = this.parent;
			assert.ok(parent);
			parent.children.splice(parent.children.indexOf(this), 0, child);
			child.parent = parent;
		},
	};
	return element;
}

const parent = fakeElement("parent");
const renderedSections = [fakeElement("one"), fakeElement("two"), fakeElement("three")];
for (const section of renderedSections) parent.appendChild(section);
const container = wrapSectionsInRegion(
	renderedSections as unknown as HTMLElement[],
	3,
) as unknown as FakeElement;

assert.equal(container.classList.values.has("handbook-layout-region"), true);
assert.equal(container.style.values.get("--handbook-layout-columns"), "3");
assert.deepEqual(parent.children, [container]);
assert.deepEqual(container.children, renderedSections);

console.log("Layout-region source directives accept only safe, non-literal pairs.");
