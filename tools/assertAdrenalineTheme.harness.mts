import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PJ_PRESENTATION } from "schema-adrenaline/presentation";
import { adrenalinePjBlock } from "../src/features/adrenalinePj/block";
import { adrenalinePnjBlock } from "../src/features/adrenalinePnj/block";
import { adrenalineMonsterBlock } from "../src/features/adrenalineMonstre/block";
import { buildGameStyle } from "../src/features/modes/styleElement";
import { readGamePluginManifest } from "../src/games/pluginManifest";

const sourceRoot = process.env.SCHEMA_ADRENALINE_ROOT;
assert.ok(sourceRoot, "SCHEMA_ADRENALINE_ROOT is required");
const manifestSource = JSON.parse(
	readFileSync(
		join(sourceRoot, "handbook", "adrenaline", "pack.json"),
		"utf8",
	),
) as unknown;
const handbookVersion = (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version;
const manifestResult = readGamePluginManifest(manifestSource, handbookVersion);
assert.ok(manifestResult.manifest, manifestResult.error);
const adrenalinePack = manifestResult.manifest.pack;

class El {
	tagName: string;
	children: El[] = [];
	textContent = "";
	dataset: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(tagName: string) { this.tagName = tagName; }
	appendChild(child: El): El { this.children.push(child); return child; }
}

const doc = { createElement: (tagName: string) => new El(tagName) } as unknown as Document;
const expectedZones = new Map([
	[adrenalinePjBlock.id, PJ_PRESENTATION.sections.map((section) => section.id)],
	[adrenalinePnjBlock.id, ["header", "narrative", "characteristics", "health", "competences", "equipment"]],
	[adrenalineMonsterBlock.id, ["header", "mobility", "behaviour", "characteristics", "health", "capabilities"]],
]);

for (const block of [adrenalinePjBlock, adrenalinePnjBlock, adrenalineMonsterBlock]) {
	assert.deepEqual(
		block.shape.zones.map((zone) => zone.name),
		expectedZones.get(block.id),
		`${block.id} must keep the layout order sourced from the published sheet`,
	);
}

const visualFixture = readFileSync(
	join("tools", "fixtures", "adrenaline-visual.md"),
	"utf8",
);
for (const block of [adrenalinePjBlock, adrenalinePnjBlock, adrenalineMonsterBlock]) {
	const fence = visualFixture.match(
		new RegExp("```" + block.id + "\\r?\\n([\\s\\S]*?)\\r?\\n```"),
	);
	assert.ok(fence, `${block.id} must be present in the visual fixture`);
	assert.ok(block.parse(fence[1]), `${block.id} visual fixture must parse`);
}
const richMonsterSource = visualFixture.match(/```adrenaline-monstre\r?\n([\s\S]*?)\r?\n```/)?.[1];
assert.ok(richMonsterSource, "the monster visual fixture must be available");
const richMonster = adrenalineMonsterBlock.parse(richMonsterSource);
assert.ok(richMonster, "the rich monster visual fixture must parse");
const richMonsterRendered = adrenalineMonsterBlock.render(richMonster, doc) as unknown as El;
assert.equal(richMonsterRendered.classes.includes(adrenalineMonsterBlock.shape.root), true);
assert.doesNotMatch(
	JSON.stringify(richMonsterRendered),
	/Zombiology|Tous droits réservés/,
	"monster rendering must preserve Lantern metadata without printing it in Handbook",
);
const capabilityPanel = richMonsterRendered.children.find((child) =>
	child.children.some((grandChild) => grandChild.classes.includes("brumes-adrenaline-monstre--capability-group")),
);
assert.ok(capabilityPanel, "a rich monster must render its capability panel");
const capabilityHeadings = capabilityPanel.children
	.filter((child) => child.classes.includes("brumes-adrenaline-monstre--capability-group"))
	.map((child) => child.children[0]?.textContent);
assert.deepEqual(
	capabilityHeadings,
	["Traits", "État alternatif", "Compétences", "Équipement", "Contagion", "Informations de jeu"],
	"monster capability families must remain separate and ordered",
);
for (const callout of [
	"info",
	"success",
	"question",
	"warning",
	"danger",
	"example",
	"quote",
]) {
	assert.match(
		visualFixture,
		new RegExp(`> \\[!${callout}\\]`, "i"),
		`Missing ${callout} callout family from visual fixture`,
	);
}

const minimal = adrenalineMonsterBlock.parse(`nom = "Rôdeur"\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n`);
assert.ok(minimal);
const minimalRendered = adrenalineMonsterBlock.render(minimal, doc) as unknown as El;
assert.equal(minimalRendered.children.length, 2);
assert.deepEqual(
	minimalRendered.children.map((child) => child.classes[0]),
	["brumes-adrenaline-monstre--header", "brumes-adrenaline--section"],
);

for (const scheme of ["light", "dark"] as const) {
	const css = buildGameStyle(
		adrenalinePack.id,
		adrenalinePack.style,
		true,
		adrenalinePack.polarities,
		scheme,
	);
	assert.match(css, new RegExp(`body\\.brumes--adrenaline\\.brumes--colour-${scheme}`));
	assert.doesNotMatch(css, /(^|\n)body\.theme-(light|dark)\s*\{/);
}

const scss = readdirSync(join("src", "styles", "adrenaline"))
	.filter((file) => file.endsWith(".scss"))
	.map((file) => readFileSync(join("src", "styles", "adrenaline", file), "utf8"))
	.join("\n");
assert.match(scss, /@media \(max-width: 520px\)/);
assert.match(scss, /brumes-adrenaline-pj__columns-3[^}]*grid-template-columns:\s*repeat\(3/);
assert.match(scss, /@container \(max-width: 420px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.match(scss, /\.brumes-adrenaline-pnj\s*\{[\s\S]*?max-width:\s*36rem/);
assert.match(scss, /\.brumes-adrenaline-monstre\s*\{[\s\S]*?max-width:\s*36rem/);
assert.match(scss, /brumes-adrenaline-monstre--capability-group/);
// One column by default: multi-column text only comes from a marked layout region.
assert.doesNotMatch(scss, /column-count/, "Adrenaline must not split notes into columns by default");
assert.doesNotMatch(scss, /adrenaline-one-column/, "the one-column escape hatch has nothing left to escape");
assert.match(scss, /--adrenaline-page-texture/);
assert.match(scss, /opacity:\s*var\(--adrenaline-page-texture-opacity, 0\)/);
assert.match(scss, /pointer-events:\s*none/);
assert.match(scss, /:focus-visible/);
assert.match(scss, /\.markdown-source-view :focus-visible:not\(\.cm-content\)/, "the editable area must not be outlined as a whole");
assert.match(scss, /outline:\s*2px solid var\(--interactive-accent\)/);
assert.match(scss, /@media print[\s\S]*?markdown-reading-view::before[\s\S]*?content:\s*none/);
assert.match(scss, /--adrenaline-callout-warning/);
assert.doesNotMatch(scss, /#[0-9a-f]{3,8}/i);
assert.doesNotMatch(scss, /(?:^|[\s:(])(black|white|red|yellow)(?:[\s;,)])/i);

const oldHost = readGamePluginManifest(manifestSource, "2.6.0");
assert.equal(oldHost.manifest, undefined);
assert.match(oldHost.error, /requires Handbook 2\.7\.0/);

console.log("Adrenaline theme assertions passed.");
