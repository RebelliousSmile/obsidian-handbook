import assert from "node:assert/strict";
import { parseLayoutRegions } from "../src/features/layoutRegions/parser";

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

console.log("Layout-region source directives accept only safe, non-literal pairs.");
