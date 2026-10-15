import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Editor, Menu } from "obsidian";
import { MIST_SOURCE_CONVERSION_CODECS } from "schema-in-the-mist";
import {
	contributeRenderedTomlExport,
	contributeTomlExports,
	hasTomlExportAtCursor,
} from "../src/features/blocks/tomlExports";
import { themeCardBlock } from "../src/features/themeCards/block";
import { themeKitBlock } from "../src/features/themeKits/block";
import {
	contributeRenderedTomlPaste,
	rememberRenderedTomlContext,
	replaceSectionBody,
	tomlToBlockSource,
} from "../src/features/blocks/pasteToml";
import { tomlExportForBlock } from "../src/features/blocks/tomlExports";
import { normalizeSettings } from "../src/settings/types";
import { tNoun } from "../src/utils/i18n";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";
import { loadPbtaRenderCases, PBTA_TARGET_TO_BLOCK } from "./pbtaContractCorpus.mts";

class FakeEditor {
	constructor(private readonly source: string, private readonly line: number) {}

	getCursor() { return { line: this.line, ch: 0 }; }
	getValue() { return this.source; }
}

class FakeItem {
	title = "";
	icon = "";
	action: (() => void) | undefined;

	setTitle(title: string) { this.title = title; return this; }
	setIcon(icon: string) { this.icon = icon; return this; }
	onClick(action: () => void) { this.action = action; return this; }
}

class FakeMenu {
	items: FakeItem[] = [];

	addItem(configure: (item: FakeItem) => unknown) {
		const item = new FakeItem();
		configure(item);
		this.items.push(item);
		return item;
	}
}

const settings = normalizeSettings(undefined);
settings.mode = "legend-in-the-mist";
const source = [
	"```theme-card",
	"origin",
	"circumstance",
	"{Born in the marsh}",
	"{Track by moonlight}",
	"{Know every hidden trail}",
	"{!Trust strangers too easily}",
	"```",
].join("\n");
const editor = new FakeEditor(source, 3) as unknown as Editor;
const copied: string[] = [];

Object.defineProperty(globalThis, "navigator", {
	configurable: true,
	value: { clipboard: { writeText: async (text: string) => copied.push(text) } },
});

assert.equal(hasTomlExportAtCursor(editor, settings), true);
const menu = new FakeMenu();
assert.equal(contributeTomlExports(menu as unknown as Menu, editor, settings), 1);
assert.equal(menu.items.length, 1);
assert.equal(menu.items[0].title, "Copy theme card as TOML");
assert.equal(menu.items[0].icon, "copy");
menu.items[0].action?.();
assert.match(copied[0], /^title_tag = "Born in the marsh"/);

const renderedMenu = new FakeMenu();
assert.equal(
	contributeRenderedTomlExport(
		renderedMenu as unknown as Menu,
		source.split("\n").slice(1, -1).join("\n"),
		themeCardBlock,
	),
	true,
);
assert.equal(renderedMenu.items[0].title, "Copy theme card as TOML");

const renderedPlugin = {} as BrumesPlugin;
rememberRenderedTomlContext(renderedPlugin, {
	sourcePath: "theme-card.md",
	section: null,
	renderedSource: source.split("\n").slice(1, -1).join("\n"),
	spec: tomlExportForBlock(themeCardBlock)!,
});
const nativeMenu = new FakeMenu();
assert.equal(
	contributeRenderedTomlPaste(nativeMenu as unknown as Menu, renderedPlugin),
	true,
);
assert.equal(nativeMenu.items[0].title, "Paste toml into theme card");

const mismatchedThemeToml = [
	'title_tag = "The Village I Left Behind"',
	'level = "origin"',
	'power_tags = ["knows every face in town"]',
].join("\n");
const themeKitSpec = tomlExportForBlock(themeKitBlock)!;
assert.equal(tomlToBlockSource(mismatchedThemeToml, themeKitSpec), null);
assert.ok(
	tomlToBlockSource(
		mismatchedThemeToml,
		tomlExportForBlock(themeCardBlock)!,
	),
);

const lanternStoryThemeToml = [
	'title_tag = "The Village I Left Behind"',
	'level = "origin"',
	'category = "Past"',
	'power_tags = [ "knows every face in town", "mother\'s recipes", "reads the weather in the hills" ]',
	'weakness_tags = [ "they still expect me back" ]',
	'quest = "Return to the village and face what I owe the people I abandoned."',
	'improve = 2',
	"",
	"[meta]",
	'publication_type = "homebrew"',
	'authors = [ "4rtamis" ]',
].join("\n");
assert.ok(
	tomlToBlockSource(
		lanternStoryThemeToml,
		tomlExportForBlock(themeCardBlock)!,
	),
	"Lantern story-theme TOML must be accepted by a theme-card",
);

const outside = new FakeEditor("plain text", 0) as unknown as Editor;
assert.equal(hasTomlExportAtCursor(outside, settings), false);
assert.equal(contributeTomlExports(new FakeMenu() as unknown as Menu, outside, settings), 0);

const note = ["# Before", "```theme-card", "old", "```", "# After"].join("\n");
assert.equal(
	replaceSectionBody(note, { text: ["```theme-card", "old", "```"].join("\n"), lineStart: 1, lineEnd: 3 }, "old", "title_tag = \"New\""),
	["# Before", "```theme-card", "title_tag = \"New\"", "```", "# After"].join("\n"),
);
assert.equal(
	replaceSectionBody(note, { text: "old", lineStart: 1, lineEnd: 3 }, "missing", "next"),
	null,
);

const contract = JSON.parse(readFileSync("node_modules/schema-in-the-mist/corpus/contract/cases.json", "utf8")) as {
	cases: { target: keyof typeof MIST_SOURCE_CONVERSION_CODECS; file: string; canonical: string }[];
};
const sourceTargets = Object.keys(MIST_SOURCE_CONVERSION_CODECS).sort();
assert.deepEqual(sourceTargets, [
	"city-of-mist/danger",
	"city-of-mist/theme-card",
	"legend-in-the-mist/challenge",
	"legend-in-the-mist/journey",
	"legend-in-the-mist/story-theme",
	"legend-in-the-mist/theme-kit",
]);
for (const target of sourceTargets as (keyof typeof MIST_SOURCE_CONVERSION_CODECS)[]) {
	const entry = contract.cases.find((candidate) => candidate.target === target && candidate.canonical === "accept");
	assert.ok(entry, `missing canonical fixture for ${target}`);
	const raw = readFileSync(join("node_modules/schema-in-the-mist/corpus/contract", entry.file), "utf8");
	assert.equal(MIST_SOURCE_CONVERSION_CODECS[target].convertToSource(raw).kind, "concise");
	assert.deepEqual(MIST_SOURCE_CONVERSION_CODECS[target].convertToSource(`${raw}\n# keep`).source, `${raw}\n# keep`);
}

// PbtA blocks keep their source as TOML: a Lantern export pasted over one is
// the document itself, accepted when the block parses it and refused otherwise.
const pbtaBlockIds = Array.from(new Set(
	Object.keys(PBTA_TARGET_TO_BLOCK).map((target) => PBTA_TARGET_TO_BLOCK[target as keyof typeof PBTA_TARGET_TO_BLOCK]),
)).sort();
const pbtaSpecs = TOML_EXPORTS.filter((spec) => (pbtaBlockIds as string[]).indexOf(spec.block.id) !== -1);
assert.deepEqual(pbtaSpecs.map((spec) => spec.block.id).sort(), pbtaBlockIds, "every PbtA block owes a TOML export");
for (const spec of pbtaSpecs) {
	assert.equal(spec.sourceIsToml, true, `${spec.block.id} must offer the paste: its source is TOML`);
	assert.notEqual(tNoun(spec.noun, "fr"), spec.noun, `${spec.block.id}: the paste entry needs a French noun`);
}
const pbtaCases = loadPbtaRenderCases();
assert.ok(pbtaCases.length > 0, "the schema-pbta corpus holds render cases");
for (const entry of pbtaCases) {
	const owner = PBTA_TARGET_TO_BLOCK[entry.target];
	const spec = pbtaSpecs.filter((candidate) => candidate.block.id === owner)[0];
	assert.ok(tomlToBlockSource(entry.source, spec) !== null, `${entry.path}: a Lantern export must paste into ${owner}`);
	assert.ok(
		tomlToBlockSource(["```toml", entry.source, "```"].join("\n"), spec) !== null,
		`${entry.path}: the fenced clipboard must paste into ${owner} too`,
	);
}
// A document of another target is refused. The single exception is the blank
// Sprawl sheet of a matrix, a mission, a corporation or a resource, which holds
// nothing that tells the three blocks apart: the contract parses it as each.
for (const entry of pbtaCases) {
	const owner = PBTA_TARGET_TO_BLOCK[entry.target];
	const blankSprawl = /^valid\/the-sprawl-(matrix|mission|corporation|resource)-blank\.toml$/.test(entry.path);
	for (const spec of pbtaSpecs) {
		if (spec.block.id === owner) continue;
		const sameFamily = owner.indexOf("sprawl-") === 0 && spec.block.id.indexOf("sprawl-") === 0;
		const accepted = tomlToBlockSource(entry.source, spec) !== null;
		assert.equal(
			accepted,
			blankSprawl && sameFamily,
			`${entry.path} (${owner}) pasted into ${spec.block.id} must be ${blankSprawl && sameFamily ? "accepted" : "refused"}`,
		);
	}
}
