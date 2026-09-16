import assert from "node:assert/strict";
import { parseLayoutRegions } from "../src/features/layoutRegions/parser";
import {
	mapRegionToBlocks,
	wrapBlocksInRegion,
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
		{ columns: 3, openLine: 1, closeLine: 5, lineStart: 2, lineEnd: 4 },
		{ columns: 1, openLine: 7, closeLine: 10, lineStart: 8, lineEnd: 9 },
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
	regions: [{ columns: 1, openLine: 5, closeLine: 7, lineStart: 6, lineEnd: 6 }],
});

type FakeElement = {
	children: FakeElement[];
	className: string;
	classList: { add: (...names: string[]) => void; values: Set<string> };
	name: string;
	ownerDocument: { createElement: (name: string) => FakeElement };
	parent: FakeElement | null;
	style: { setProperty: (name: string, value: string) => void; values: Map<string, string> };
	appendChild: (child: FakeElement) => void;
	before: (child: FakeElement) => void;
};

function fakeElement(name: string, className = ""): FakeElement {
	const element: FakeElement = {
		children: [],
		className,
		classList: { add: (...names) => names.forEach((name) => { element.classList.values.add(name); element.className = [...element.classList.values].join(" "); }), values: new Set() },
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
const open = fakeElement("open");
const renderedBlocks = [fakeElement("one", "el-h2"), fakeElement("two", "el-h2"), fakeElement("three", "el-h2")];
const close = fakeElement("close");
for (const block of [open, ...renderedBlocks, close]) parent.appendChild(block);
const region = parseLayoutRegions(source).regions[0];
const mapped = mapRegionToBlocks(region, [
	{ block: open as unknown as HTMLElement, info: { lineStart: 1, lineEnd: 1 } },
	...renderedBlocks.map((block, index) => ({ block: block as unknown as HTMLElement, info: { lineStart: index + 2, lineEnd: index + 2 } })),
	{ block: close as unknown as HTMLElement, info: { lineStart: 5, lineEnd: 5 } },
]);
assert.deepEqual(mapped, renderedBlocks);
assert.equal(mapRegionToBlocks(region, [
	{ block: renderedBlocks[0] as unknown as HTMLElement, info: { lineStart: 2, lineEnd: 2 } },
	{ block: renderedBlocks[1] as unknown as HTMLElement, info: null },
	{ block: renderedBlocks[2] as unknown as HTMLElement, info: { lineStart: 4, lineEnd: 4 } },
]), null);
const container = wrapBlocksInRegion(
	mapped!,
	3,
) as unknown as FakeElement;

assert.equal(container.classList.values.has("handbook-layout-region"), true);
assert.equal(container.style.values.get("--handbook-layout-columns"), "3");
assert.deepEqual(parent.children, [open, container, close]);
assert.equal(container.children.length, 3);
assert.deepEqual(container.children.map((group) => group.children), renderedBlocks.map((block) => [block]));

console.log("Layout-region source directives accept only safe, non-literal pairs.");
