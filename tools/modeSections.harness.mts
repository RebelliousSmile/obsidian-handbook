import assert from "node:assert/strict";
import { mapPrintRegions } from "../src/features/layoutRegions/printMapper";
import { wrapInModeSection } from "../src/features/modeSections/insertion";
import { isModeOffered, parseModeSections, sectionOfBlock } from "../src/features/modeSections/parser";

const source = [
	"before",
	"<!-- handbook-mode: dark -->",
	"# One",
	"text",
	"<!-- /handbook-mode -->",
	"between",
	"<!-- handbook-mode: light -->",
	"| Wide | Table |",
	"<!-- /handbook-mode -->",
].join("\n");

assert.deepEqual(parseModeSections(source), {
	diagnostics: [],
	sections: [
		{ mode: "dark", openLine: 1, closeLine: 4, lineStart: 2, lineEnd: 3 },
		{ mode: "light", openLine: 6, closeLine: 8, lineStart: 7, lineEnd: 7 },
	],
});

// A mode section inside a layout region, and the reverse, both parse: the markers are independent.
const nested = [
	"<!-- handbook-layout: columns=2 -->",
	"<!-- handbook-mode: dark -->",
	"inside",
	"<!-- /handbook-mode -->",
	"<!-- /handbook-layout -->",
	"<!-- handbook-mode: light -->",
	"<!-- handbook-layout: columns=2 -->",
	"inside",
	"<!-- /handbook-layout -->",
	"<!-- /handbook-mode -->",
].join("\n");
assert.deepEqual(
	parseModeSections(nested).sections.map(({ mode, lineStart, lineEnd }) => [mode, lineStart, lineEnd]),
	[["dark", 2, 2], ["light", 6, 8]],
);
assert.deepEqual(parseModeSections(nested).diagnostics, []);

// Fenced markers are ignored.
const fenced = ["```", "<!-- handbook-mode: dark -->", "```", "~~~~", "<!-- /handbook-mode -->", "~~~~"].join("\n");
assert.deepEqual(parseModeSections(fenced), { diagnostics: [], sections: [] });

// Each diagnostic has a refusing case.
const refused: [string, string[], string][] = [
	["invalid-open", ["<!-- handbook-mode: -->"], "invalid-open"],
	["invalid-open (no spacing)", ["<!-- handbook-mode:dark -->"], "invalid-open"],
	["invalid-polarity", ["<!-- handbook-mode: sepia -->", "x", "<!-- /handbook-mode -->"], "invalid-polarity"],
	["orphan-close", ["<!-- /handbook-mode -->"], "orphan-close"],
	["empty", ["<!-- handbook-mode: dark -->", "", "<!-- /handbook-mode -->"], "empty"],
	["unclosed-open", ["<!-- handbook-mode: dark -->", "x"], "unclosed-open"],
	["overlapping-open", ["<!-- handbook-mode: dark -->", "<!-- handbook-mode: light -->", "x", "<!-- /handbook-mode -->"], "overlapping-open"],
	["marker not alone on its line", ["text <!-- handbook-mode: dark -->", "x", "<!-- /handbook-mode -->"], "orphan-close"],
];
for (const [name, lines, reason] of refused) {
	const result = parseModeSections(lines.join("\n"));
	assert.equal(result.sections.length, 0, `${name}: a refused marker yields no section`);
	assert.ok(result.diagnostics.some((d) => d.reason === reason), `${name}: expected ${reason}, got ${JSON.stringify(result.diagnostics)}`);
}

// Windows line endings parse like Unix ones.
assert.equal(parseModeSections(source.replace(/\n/g, "\r\n")).sections.length, 2);

// What the menu inserts is what the parser reads, for both polarities.
for (const polarity of ["dark", "light", "alternate"] as const) {
	const inserted = parseModeSections(wrapInModeSection("\n# One\n\ntext\n", polarity));
	assert.deepEqual(inserted.diagnostics, []);
	assert.equal(inserted.sections.length, 1);
	assert.equal(inserted.sections[0].mode, polarity);
}
assert.equal(
	parseModeSections(wrapInModeSection("", "dark")).diagnostics[0]?.reason,
	"empty",
);

// A rendered block belongs to a section only when it lies entirely inside it.
const spans = parseModeSections(["<!-- handbook-mode: dark -->", "", "inside", "", "<!-- /handbook-mode -->", "", "outside"].join("\n")).sections;
assert.equal(sectionOfBlock(spans, { lineStart: 2, lineEnd: 2 })?.mode, "dark");
assert.equal(sectionOfBlock(spans, { lineStart: 6, lineEnd: 6 }), null);
assert.equal(sectionOfBlock(spans, { lineStart: 2, lineEnd: 6 }), null);
assert.equal(sectionOfBlock(spans, null), null);

// The print DOM drops comments: sections are joined to it by rank.
const fakeParagraph = () => ({
	tagName: "P",
	className: "",
	children: [],
	classList: { contains: () => false },
}) as unknown as HTMLElement;
const printed = [fakeParagraph(), fakeParagraph()];
const mapped = mapPrintRegions(
	spans,
	[
		{ type: "html", lineStart: 0, lineEnd: 0 },
		{ type: "paragraph", lineStart: 2, lineEnd: 2 },
		{ type: "html", lineStart: 4, lineEnd: 4 },
		{ type: "paragraph", lineStart: 6, lineEnd: 6 },
	],
	["<!-- handbook-mode: dark -->", "", "inside", "", "<!-- /handbook-mode -->", "", "outside"],
	printed,
);
assert.ok(mapped.ok);
if (mapped.ok) assert.deepEqual(mapped.selections.map((entry) => entry.blocks.length), [1]);

// Which markers a game honours. `alternate` wants a second paper: the other
// polarity, or the section a game with a single polarity publishes.
const offers: [string, string[], boolean, boolean][] = [
	["alternate", ["light", "dark"], false, true],
	["alternate", ["light", "dark"], true, true],
	["alternate", ["light"], true, true],
	["alternate", ["dark"], true, true],
	["alternate", ["light"], false, false],
	["alternate", [], true, false],
	["alternate", [], false, false],
	// A published section is no polarity: it never answers a forced mode.
	["dark", ["light"], true, false],
	["light", ["dark"], true, false],
	["light", ["light"], true, true],
	["dark", ["light", "dark"], false, true],
	["dark", [], true, false],
];
for (const [mode, offered, published, expected] of offers) {
	assert.equal(
		isModeOffered(mode as "alternate", offered, published),
		expected,
		`${mode} over [${offered.join(", ")}], section ${published ? "published" : "absent"}`,
	);
}
// The third argument is optional: every earlier caller reads as before.
assert.equal(isModeOffered("alternate", ["light"]), false);
assert.equal(isModeOffered("alternate", ["light", "dark"]), true);

console.log("Mode sections parse, nest with layout regions and refuse malformed markers.");
