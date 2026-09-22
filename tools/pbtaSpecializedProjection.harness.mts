import assert from "node:assert/strict";
import { pbtaPlaybookBlock } from "../src/features/pbta/block";
import { loadPbtaSpecializedPlaybookCases } from "./pbtaContractCorpus.mts";
import presentation from "schema-pbta/packs/monsterhearts/presentation-contract.json";

class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	attributes: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(public tagName: string) {}
	appendChild(child: El): El { this.children.push(child); return child; }
	setAttribute(name: string, value: string): void { this.attributes[name] = value; }
}
const doc = { createElement: (tagName: string) => new El(tagName) };
function text(node: El): string { return node.textContent + node.children.map(text).join(""); }
const requiredMechanicalField: Record<string, { data: string; rendered: string }> = {
	"masks-playbook": { data: "momentOfTruth", rendered: "momentOfTruth" },
	"monster-of-the-week-playbook": { data: "improvements", rendered: "improvements" },
	"monsterhearts-playbook": { data: "strings", rendered: "Strings" },
	"urban-shadows-playbook": { data: "corruption", rendered: "corruption" },
	"the-sprawl-playbook": { data: "directives", rendered: "directives" },
};

/* A witness may legitimately omit an optional mechanic (monsterhearts' `strings`), so the field is
   required of the target, not of every witness: a target whose mechanics never render still fails. */
const mechanicsSeen = new Set<string>();
const targetsSeen = new Set<string>();
function elementsWithClass(node: El, className: string): El[] {
	const matches = node.classes.includes(className) ? [node] : [];
	for (const child of node.children) matches.push(...elementsWithClass(child, className));
	return matches;
}
for (const entry of loadPbtaSpecializedPlaybookCases()) {
	const parsed = pbtaPlaybookBlock.parse(entry.source);
	assert.ok(parsed, `${entry.target} must parse`);
	assert.equal(parsed.target, entry.target);
	const rendered = pbtaPlaybookBlock.render(parsed, doc as unknown as Document) as unknown as El;
	const output = text(rendered);
	const data = parsed.data as unknown as Record<string, unknown>;
	const editorial = data.editorial as Record<string, { heading: string }>;
	for (const key of Object.keys(editorial)) assert.ok(output.includes(editorial[key].heading), `${entry.target} editorial ${key} is visible`);
	targetsSeen.add(entry.target);
	const field = requiredMechanicalField[entry.target];
	const declared = Object.prototype.hasOwnProperty.call(parsed.data as object, field.data);
	assert.equal(output.includes(field.rendered), declared, `${entry.path}: ${field.data} renders only when the document declares it`);
	if (entry.path.endsWith("monsterhearts-playbook-empty-ascendants.toml")) {
		assert.ok(!output.includes("[object Object]"), `${entry.path}: empty mechanics do not stringify as objects`);
		for (const group of elementsWithClass(rendered, "handbook-pbta-mechanic-group")) {
			assert.ok(group.children.length > 1, `${entry.path}: no empty mechanic group is rendered`);
		}
	}
	if (declared) mechanicsSeen.add(entry.target);
}
for (const target of targetsSeen) {
	assert.ok(mechanicsSeen.has(target), `no witness renders ${requiredMechanicalField[target].data} for ${target}`);
}

const unselectedProfiles = `slug = "the-hollow"
name = "The Hollow"
game = "monsterhearts"
description = "A beautiful imitation trying to become real."
stats = {}
statProfiles = [
  { key = "au-quart-de-tour", label = "Au quart de tour", stats = { hot = -1, cold = 1, volatile = 2, dark = -1 } },
  { key = "colere-froide", label = "Colere froide", stats = { hot = -1, cold = 2, volatile = -1, dark = 1 } }
]
moves = [
  { name = "Tether", moveType = "skin", description = "Hold on to someone.", checked = true },
  { name = "Echo", moveType = "skin", description = "Answer a distant voice.", checked = false }
]
advances = [{ label = "Take a new skin move.", checked = false }]
ascendants = [{ name = "Alex", value = 2 }]
conditions = [{ name = "Artificial", description = "Someone named what you fear is true." }]

[strings]
max = 5
starting = 0

[editorial.opening]
heading = "Opening"
paragraphs = ["A complete original fixture."]
[editorial.darkestSelf]
heading = "Darkest Self"
paragraphs = ["You are empty until somebody proves otherwise."]
[editorial.sexMove]
heading = "Sex Move"
paragraphs = ["When you share intimacy, take a String on them."]
[editorial.identity]
heading = "Identity"
paragraphs = ["Choose a face that almost looks real."]
[editorial.progression]
heading = "Progression"
paragraphs = ["Take a new skin move."]`;
const unselected = pbtaPlaybookBlock.parse(unselectedProfiles);
assert.ok(unselected, "the unselected profile witness must parse");
assert.equal(unselected.target, "monsterhearts-playbook");
const unselectedRendered = pbtaPlaybookBlock.render(unselected, doc as unknown as Document) as unknown as El;
const unselectedOutput = text(unselectedRendered);
for (const expected of ["Au quart de tour", "Colere froide", "hot", "cold", "volatile", "dark", "Strings", "max", "starting", "Alex", "Artificial", "Someone named what you fear is true.", "Advances", "Take a new skin move.", "No"]) {
	assert.ok(unselectedOutput.includes(expected), `unselected profiles render ${expected}`);
}
assert.ok(!unselectedOutput.includes("[object Object]"), "structured Monsterhearts mechanics do not stringify as objects");
const statsRegion = elementsWithClass(unselectedRendered, "handbook-pbta-playbook--stats")[0];
assert.ok(statsRegion, "unselected profiles retain the stats region");
assert.ok(elementsWithClass(statsRegion, "handbook-pbta-stat-profile").length === 2, "every published profile renders in the stats region");
const unchanged = JSON.stringify(unselected.data);
const monsterheartsRendered = pbtaPlaybookBlock.render(unselected, doc as unknown as Document, { packId: "monsterhearts" }) as unknown as El;
assert.ok(monsterheartsRendered.classes.includes("handbook-monsterhearts-playbook"), "Monsterhearts pack selects its editorial layout");
const renderedRegions = elementsWithClass(monsterheartsRendered, "handbook-monsterhearts-region").map((child) => child.dataset.region);
const rowOrder = ["game-identity", ...presentation.rows.flat(2)];
assert.deepEqual(renderedRegions, rowOrder.filter((id) => renderedRegions.includes(id)), "published row order survives rendering");
assert.ok(renderedRegions.includes("stat-profiles") && renderedRegions.includes("relationships") && renderedRegions.includes("conditions-and-harm"), "stat, relationship and harm regions are distinct");
assert.ok(text(monsterheartsRendered).includes("Au quart de tour"), "published stat profiles remain visible");
assert.ok(!/\b(?:KEY|LABEL|CHECKED|GAME IDENTITY|PLAYBOOK MOVES)\b/.test(text(monsterheartsRendered)), "schema field names do not leak into the playbook");
assert.equal(elementsWithClass(monsterheartsRendered, "handbook-monsterhearts-move-symbol").map((symbol) => symbol.textContent).join(""), "♥♡", "acquired moves have filled hearts and available moves have empty hearts");
const portrait = elementsWithClass(monsterheartsRendered, "handbook-monsterhearts-portrait")[0];
assert.ok(portrait.classes.includes("handbook-monsterhearts-portrait--empty"), "missing image leaves a reserved portrait frame");
assert.equal(portrait.children[0]?.textContent, "Portrait à ajouter");
const firstRow = elementsWithClass(monsterheartsRendered, "handbook-monsterhearts-layout-row")[0];
assert.deepEqual(firstRow.children[1].children.map((child) => child.dataset.region), ["playbook-portrait"], "portrait alone occupies the first row's middle cell");
const withImage = { ...unselected.data, playbookImage: "Selkie.png" };
const imaged = pbtaPlaybookBlock.render({ ...unselected, data: withImage }, doc as unknown as Document, {
	packId: "monsterhearts", resolveImage: (path) => path === "Selkie.png" ? "app://vault/Selkie.png" : null,
}) as unknown as El;
const image = elementsWithClass(imaged, "handbook-monsterhearts-portrait")[0].children[0] as El & { src: string; alt: string };
assert.equal(image.tagName, "img", "provided playbook image renders as an image");
assert.equal(image.src, "app://vault/Selkie.png");
assert.equal(image.alt, "Portrait de The Hollow");
assert.equal(JSON.stringify(unselected.data), unchanged, "presentation does not change the TOML data");
const otherPackRendered = pbtaPlaybookBlock.render(unselected, doc as unknown as Document, { packId: "masks" }) as unknown as El;
assert.ok(!otherPackRendered.classes.includes("handbook-monsterhearts-playbook"), "another pack keeps its own presentation");
console.log(`Specialized PbtA playbook projections passed: ${targetsSeen.size} targets render their mechanics.`);
