import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/BrumesPlugin.ts", "utf8");
const onload = source.match(/async onload\(\) \{(?<body>[\s\S]*?)\n\t\}\n\n\tonunload\(\)/)
	?.groups?.body;

assert.ok(onload, "BrumesPlugin.onload must remain inspectable by this lifecycle contract");

const refreshesBeforeReturn =
	/this\.applySettings\(\{\s*refreshMarkdown:\s*true\s*\}\)/.test(onload) ||
	/await this\.reloadStyleSources\(\)/.test(onload);

assert.ok(
	refreshesBeforeReturn,
	"plugin reload must rerender already-open Markdown views before onload resolves",
);

console.log("plugin reload rerenders already-open Markdown views");
