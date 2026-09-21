import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLayoutRegions } from "../src/features/layoutRegions/parser";
import { CacheSection, mapPrintRegions } from "../src/features/layoutRegions/printMapper";
import {
	mapRegionToBlocks,
	wrapBlocksInRegion,
} from "../src/features/layoutRegions/sectionMapper";
import { applyContractLayout } from "../src/features/layoutRegions/contractLayout";

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
	dataset: Record<string, string | undefined>;
	classList: { add: (...names: string[]) => void; contains: (name: string) => boolean; values: Set<string> };
	name: string;
	tagName: string;
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
		dataset: {},
		classList: {
			add: (...names) => names.forEach((name) => { element.classList.values.add(name); element.className = [...element.classList.values].join(" "); }),
			contains: (name) => element.className.split(/\s+/).includes(name),
			values: new Set(),
		},
		name,
		tagName: name.toUpperCase(),
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

// Schema layouts select rendered regions, not source lines. The selected regions
// may be separated by other content and an optional region may be absent.
const contractParent = fakeElement("parent");
const intro = fakeElement("intro");
const moves = fakeElement("moves");
moves.dataset.region = "moves";
const aside = fakeElement("aside");
const state = fakeElement("state");
state.dataset.region = "state";
const gear = fakeElement("gear");
gear.dataset.region = "gear";
for (const block of [intro, moves, aside, state, gear]) contractParent.appendChild(block);
const contractLayout = applyContractLayout(contractParent as unknown as HTMLElement, {
	regions: ["moves", "state", "gear", "optional"],
	columns: [["moves"], ["state", "optional"]],
}) as unknown as FakeElement;
assert.ok(contractLayout);
assert.equal(contractLayout.style.values.get("--handbook-layout-columns"), "2");
assert.deepEqual(contractLayout.children.map((column) => column.children), [[moves], [state]]);
assert.deepEqual(contractParent.children, [intro, contractLayout, aside, gear]);

// The PDF export: no markers, no section info, one bare wrapper per block.
// Sections are those Obsidian 1.13.7 reported for the fixture (evidence/print-dom.md).
const probeSource = readFileSync("tools/e2e/fixtures/layout-regions-print-probe.md", "utf8");
const probeSections: CacheSection[] = [
	["yaml", 0, 2], ["heading", 4, 4], ["paragraph", 6, 6], ["html", 8, 8],
	["heading", 10, 10], ["paragraph", 12, 12], ["heading", 14, 14], ["paragraph", 16, 16],
	["heading", 18, 18], ["paragraph", 20, 20], ["heading", 22, 22], ["paragraph", 24, 24],
	["heading", 26, 26], ["paragraph", 28, 28], ["heading", 30, 30], ["paragraph", 32, 32],
	["html", 34, 34], ["html", 36, 36], ["thematicBreak", 38, 38], ["paragraph", 40, 40],
	["footnoteDefinition", 42, 42],
].map(([type, lineStart, lineEnd]) => ({ type: type as string, lineStart: lineStart as number, lineEnd: lineEnd as number }));

function wrapper(inner: string, innerClass = ""): FakeElement {
	const div = fakeElement("div");
	div.appendChild(fakeElement(inner, innerClass));
	return div;
}

function probePrinted(withTitle: boolean): FakeElement[] {
	const printed: FakeElement[] = [];
	if (withTitle) printed.push(fakeElement("h1"));
	printed.push(fakeElement("div", "mod-frontmatter mod-ui"), wrapper("h1"), wrapper("p"));
	for (let column = 0; column < 6; column++) printed.push(wrapper("h2"), wrapper("p"));
	printed.push(fakeElement("hr"), wrapper("p"), wrapper("section", "footnotes"));
	return printed;
}

function mountPrinted(children: FakeElement[]): FakeElement {
	const view = fakeElement("div", "markdown-preview-view");
	for (const child of children) view.appendChild(child);
	return view;
}

function asElements(children: FakeElement[]): HTMLElement[] {
	return children as unknown as HTMLElement[];
}

const probeRegions = parseLayoutRegions(probeSource).regions;
assert.equal(probeRegions.length, 1);
for (const withTitle of [false, true]) {
	const printed = probePrinted(withTitle);
	const view = mountPrinted(printed);
	const mapped = mapPrintRegions(probeRegions, probeSections, probeSource.split(/\r?\n/), asElements(printed));
	assert.equal(mapped.ok, true);
	if (!mapped.ok) continue;
	assert.equal(mapped.selections.length, 1);
	assert.equal(mapped.selections[0].blocks.length, 12);
	assert.equal(mapped.selections[0].blocks[0], printed[withTitle ? 4 : 3]);
	const container = wrapBlocksInRegion(mapped.selections[0].blocks, mapped.selections[0].region.columns) as unknown as FakeElement;
	assert.equal(container.style.values.get("--handbook-layout-columns"), "3");
	assert.equal(container.children.length, 6, "each heading opens its own column");
	assert.ok(container.children.every((column) => column.children.length === 2));
	assert.equal(view.children.filter((child) => child === container).length, 1);
	assert.equal(view.children[view.children.indexOf(container) - 1], printed[withTitle ? 3 : 2], "the introduction stays before the region");
	assert.equal(view.children[view.children.indexOf(container) + 1].tagName, "HR", "the rule stays after the region");
}

// Two successive regions: every selection is taken before any wrapping.
const twoSource = [
	"# A", "", "<!-- handbook-layout: columns=2 -->", "", "## One", "", "text", "", "## Two", "", "text", "",
	"<!-- /handbook-layout -->", "", "between", "", "<!-- handbook-layout: columns=1 -->", "", "## Three", "",
	"<!-- /handbook-layout -->",
].join("\n");
const twoRegions = parseLayoutRegions(twoSource).regions;
assert.equal(twoRegions.length, 2);
const twoSections: CacheSection[] = [
	["heading", 0], ["html", 2], ["heading", 4], ["paragraph", 6], ["heading", 8], ["paragraph", 10],
	["html", 12], ["paragraph", 14], ["html", 16], ["heading", 18], ["html", 20],
].map(([type, line]) => ({ type: type as string, lineStart: line as number, lineEnd: line as number }));
const twoPrinted = [
	wrapper("h1"), wrapper("h2"), wrapper("p"), wrapper("h2"), wrapper("p"), wrapper("p"), wrapper("h2"),
];
const twoView = mountPrinted(twoPrinted);
const twoMapped = mapPrintRegions(twoRegions, twoSections, twoSource.split(/\r?\n/), asElements(twoPrinted));
assert.equal(twoMapped.ok, true);
if (twoMapped.ok) {
	assert.deepEqual(twoMapped.selections.map(({ blocks }) => blocks.length), [4, 1]);
	const wrappedRegions = twoMapped.selections.map(({ region, blocks }) => wrapBlocksInRegion(blocks, region.columns) as unknown as FakeElement);
	assert.deepEqual(twoView.children, [twoPrinted[0], wrappedRegions[0], twoPrinted[5], wrappedRegions[1]]);
	assert.equal(wrappedRegions[1].style.values.get("--handbook-layout-columns"), "1");
}

// A type that diverges (a paragraph where the cache says heading) leaves the DOM untouched.
const drifted = probePrinted(false);
drifted[3] = wrapper("p");
const driftedView = mountPrinted(drifted);
const before = [...driftedView.children];
const refusal = mapPrintRegions(probeRegions, probeSections, probeSource.split(/\r?\n/), asElements(drifted));
assert.equal(refusal.ok, false);
assert.deepEqual(driftedView.children, before);

// Fewer printed blocks than source blocks: refused, not guessed.
const truncated = probePrinted(false).slice(0, 8);
assert.equal(mapPrintRegions(probeRegions, probeSections, probeSource.split(/\r?\n/), asElements(truncated)).ok, false);

// Properties hidden: no frontmatter block printed, so the yaml section is dropped from the join.
const withoutFrontmatter = probePrinted(false).slice(1);
const noProperties = mapPrintRegions(probeRegions, probeSections, probeSource.split(/\r?\n/), asElements(withoutFrontmatter));
assert.equal(noProperties.ok && noProperties.selections.length, 1);

// A note without any region has nothing to select and is never refused.
const plain = mapPrintRegions([], probeSections, probeSource.split(/\r?\n/), asElements(probePrinted(false)));
assert.deepEqual(plain, { ok: true, selections: [], unmatched: [] });

console.log("Layout-region source directives accept only safe, non-literal pairs.");
console.log("Print export groups regions by rank and refuses any block that disagrees.");
