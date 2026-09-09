import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adrenalinePjBlock } from "../src/features/adrenalinePj/block";
import { adrenalinePnjBlock } from "../src/features/adrenalinePnj/block";
import { adrenalineMonsterBlock } from "../src/features/adrenalineMonstre/block";
import { buildGameStyle } from "../src/features/modes/styleElement";
import { adrenalinePack } from "../src/games/adrenaline";

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
	[adrenalinePjBlock.id, ["header", "formations", "competences", "characteristics", "equipment", "health"]],
	[adrenalinePnjBlock.id, ["header", "narrative", "characteristics", "health", "competences", "equipment"]],
	[adrenalineMonsterBlock.id, ["header", "mobility", "behaviour", "characteristics", "health", "capabilities"]],
]);

for (const block of [adrenalinePjBlock, adrenalinePnjBlock, adrenalineMonsterBlock]) {
	const file = join("corpus", "temoins", `${block.id}.toml`);
	const parsed = block.parse(readFileSync(file, "utf8"));
	assert.ok(parsed, `${block.id} witness must parse`);
	assert.deepEqual(
		block.shape.zones.map((zone) => zone.name),
		expectedZones.get(block.id),
		`${block.id} must keep the layout order sourced from the published sheet`,
	);
	const rendered = block.render(parsed, doc) as unknown as El;
	assert.equal(rendered.classes.includes(block.shape.root), true);
	assert.equal(rendered.children.length, 6, `${block.id} must render its six Handbook regions`);
	assert.doesNotMatch(
		JSON.stringify(rendered),
		/Zombiology|Tous droits réservés/,
		`${block.id} must preserve Lantern metadata without printing it in Handbook`,
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

const scss = ["_pj.scss", "_pnj.scss", "_monstre.scss"]
	.map((file) => readFileSync(join("src", "styles", "adrenaline", file), "utf8"))
	.join("\n");
assert.match(scss, /@media \(max-width: 520px\)/);
assert.doesNotMatch(scss, /#[0-9a-f]{3,8}/i);

console.log("Adrenaline theme assertions passed.");
