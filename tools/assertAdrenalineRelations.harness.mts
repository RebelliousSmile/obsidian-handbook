import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ATTITUDE_LEVELS, RELATIONS_PRESENTATION, type AdrenalinePresentation } from "schema-adrenaline/presentation";
import { contractRefusal, publishedDefaultNumber, publishedMaxItems } from "../src/features/adrenaline/publishedContract";
import { renderAdrenalineRelations } from "../src/features/adrenalineRelations/renderer";
import { documentToRelations, parseRelationsDocument, relationsToToml } from "../src/features/adrenalineRelations/schema";
import { adrenalineRelationsShape } from "../src/features/adrenalineRelations/shape";
import { relationsTemplate } from "../src/features/adrenalineRelations/template";

/*
 * The relations sheet: drawn from the presentation the contract publishes, one printed place per
 * `maxItems` of the schema, the attitude worded by `ATTITUDE_LEVELS` and never read from the
 * document, no modifier printed, a refused document named by the contract. The witnesses and refusals are the ones the
 * producer publishes, so a field renamed or a bound moved upstream fails here.
 */
class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	classes: string[] = [];
	attributes: Record<string, string> = {};
	style = { setProperty: (_name: string, _value: string) => undefined };
	classList = { add: (...names: string[]) => { for (const name of names) this.classes.push(name); } };
	constructor(readonly tagName: string) {}
	setAttribute(name: string, value: string): void { this.attributes[name] = value; }
	appendChild(child: El): El { this.children.push(child); return child; }
	walk(): El[] { return [this, ...this.children.reduce<El[]>((all, child) => all.concat(child.walk()), [])]; }
}
const doc = { createElement: (tagName: string) => new El(tagName) } as unknown as Document;
const ROOT = "brumes-adrenaline-relations";

const withClass = (root: unknown, name: string): El[] => (root as El).walk().filter((node) => node.classes.indexOf(`${ROOT}__${name}`) >= 0);
const read = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

/* The presentation keeps the shape this renderer draws: a changed form must be taught here first. */
const sections = RELATIONS_PRESENTATION.sections;
assert.deepEqual(sections.map((section) => section.id), ["entete", "autresPersonnages", "pnjs"], "the sections of the relations sheet");
const forms = sections.reduce<string[]>((all, section) => all.concat(section.blocks.map((block) => block.form ?? "")), []);
for (const form of forms) assert.ok(["name-card", "pc-ties", "npc-entries"].indexOf(form) >= 0, `the form "${form}" has a dedicated rendering`);
assert.equal(adrenalineRelationsShape.block, RELATIONS_PRESENTATION.sheet.id, "the shape names the published sheet");
assert.deepEqual(adrenalineRelationsShape.zones.map((zone) => zone.name), sections.map((section) => section.id), "one zone per published section");

/* The slots are the bounds of the published schema. */
const otherSlots = publishedMaxItems("relations", "/autresPersonnages");
const npcSlots = publishedMaxItems("relations", "/pnjs");
const defaultSlots = publishedDefaultNumber("relations", "/nombreDAutresPersonnages");
assert.ok(defaultSlots && otherSlots && defaultSlots <= 4 && defaultSlots <= otherSlots, "the contract publishes how many places print by default, on one row of four");
assert.equal(RELATIONS_PRESENTATION.sections[1].blocks[0].countPath, "/nombreDAutresPersonnages", "the places of the other characters follow the count the contract names");
assert.ok(otherSlots && otherSlots > 0, "the schema bounds the other characters");
assert.ok(npcSlots && npcSlots > 0, "the schema bounds the NPCs");

/* The minimal witness: the sheet prints every place, empty. */
const base = "node_modules/schema-adrenaline/corpus";
const minimal = documentToRelations(read(join(base, "temoins/relations/temoin.json")));
assert.ok(minimal, "the minimal witness is read");
const minimalRoot = renderAdrenalineRelations(minimal, doc);
assert.equal(withClass(minimalRoot, "tie").length, defaultSlots, "a sheet that sets no count prints the default places");
const npcBlock = sections[2].blocks[0];
assert.equal(npcBlock.display, "table", "the published NPC list is a table");
assert.equal(withClass(minimalRoot, "npc-table-body")[0].children.length, npcSlots, "one table row per NPC the contract allows");
assert.equal(withClass(minimalRoot, "npc--empty").length, npcSlots, "a sheet without NPCs prints only empty rows");
assert.equal(withClass(minimalRoot, "npc-table-head")[0].children[0].children.length, (npcBlock.fieldRows ?? []).length, "one column per row of fields the contract publishes");
assert.ok(withClass(minimalRoot, "card-value").some((node) => node.textContent === "Claire Vasseur"), "the character name is in the header");

/* The full-capacity witness fills every place, none is dropped. */
const full = documentToRelations(read(join(base, "temoins/relations/pleine-capacite.json")));
assert.ok(full, "the full-capacity witness is read");
const fullRoot = renderAdrenalineRelations(full, doc);
assert.equal(withClass(fullRoot, "tie").length, otherSlots, "the full sheet prints every place the contract allows");

/* The count the document sets is the number of places, whatever the contract's maximum. */
const few = documentToRelations(read(join(base, "temoins/relations/deux-autres-pj.json")));
assert.ok(few, "the two-character witness is read");
assert.equal(withClass(renderAdrenalineRelations(few, doc), "tie").length, 2, "a count of two prints two places");
const tooMany = documentToRelations({ ...few, autresPersonnages: [{ nom: "A" }, { nom: "B" }, { nom: "C" }] });
assert.equal(withClass(renderAdrenalineRelations(tooMany!, doc), "tie").length, 3, "an entered place is never dropped under the count");
assert.equal(relationsToToml(few).indexOf("nombreDAutresPersonnages = 2") >= 0, true, "the count survives a copy to TOML");
assert.equal(withClass(fullRoot, "npc-table-body")[0].children.length, npcSlots, "the full sheet keeps the NPC rows of the contract");
assert.equal(withClass(fullRoot, "npc--empty").length, 0, "no row of a full sheet is empty");

/* The cards stay drawable when the presentation drops the table: the contract alone brings the table back or removes it. */
const asCards: AdrenalinePresentation = {
	...RELATIONS_PRESENTATION,
	sections: RELATIONS_PRESENTATION.sections.map((section) => section.id !== "pnjs" ? section : {
		...section,
		columns: 2,
		blocks: section.blocks.map((block) => ({
			...block,
			display: undefined,
			columns: 2,
			fieldRows: [["numero", "nom"], ["attitude", "reliesA"], ["lien"], ["resume"], ["notes"], ["toucheParLeDrame"]],
		})),
	}),
};
const cardsRoot = renderAdrenalineRelations(minimal, doc, asCards);
assert.equal(withClass(cardsRoot, "npc").length, npcSlots, "without the table, one card per NPC");
assert.equal(withClass(cardsRoot, "npc-column").length, 2, "without the table, the cards are laid out in two columns");

/* The attitude is worded by the published levels, and the modifier it sets is not printed: its room goes to the links. */
for (const level of ATTITUDE_LEVELS) {
	const data = documentToRelations({ personnage: "Claire", pnjs: [{ numero: 1, nom: "Ferran", attitude: level.key, reliesA: [2, 3] }] });
	assert.ok(data, `attitude ${level.key}: the document is read`);
	const root = renderAdrenalineRelations(data, doc);
	assert.equal(withClass(root, "npc-modifier").length, 0, `attitude ${level.key}: no modifier is printed`);
	const rows = withClass(root, "npc-table-row").filter((row) => row.classes.indexOf(`${ROOT}__npc--empty`) < 0 && row.children[0].tagName === "td");
	assert.equal(rows.length, 1, `attitude ${level.key}: the entered NPC is one table row`);
	const text = rows[0].walk().map((node) => node.textContent).join(" ");
	assert.ok(text.indexOf(level.label) >= 0, `attitude ${level.key}: the published label is printed`);
	assert.ok(text.indexOf("2, 3") >= 0, `attitude ${level.key}: the links are on the attitude line`);
}
const noAttitude = documentToRelations({ personnage: "Claire", pnjs: [{ numero: 1, nom: "Ferran" }] });
assert.ok(noAttitude, "an NPC without attitude is read");
assert.equal(withClass(renderAdrenalineRelations(noAttitude, doc), "npc-modifier").length, 0, "an NPC without attitude prints no modifier");

/* The drama test is ticked on the NPC that made it, and only there. */
const drama = documentToRelations({ personnage: "Claire", pnjs: [{ numero: 1, nom: "Ferran", toucheParLeDrame: true }, { numero: 2, nom: "Gaëlle" }] });
assert.ok(drama, "NPCs with a drama test are read");
assert.equal(withClass(renderAdrenalineRelations(drama, doc), "tick--on").length, 1, "one NPC carries the drama test");

/* The labels of the other characters follow their gender, and the gender itself is not printed. */
const gendered = documentToRelations({ personnage: "Claire", autresPersonnages: [{ nom: "A", genre: "masculin" }, { nom: "B", genre: "feminin" }, { nom: "C", genre: "neutre" }, { nom: "D" }] });
assert.ok(gendered, "other characters with a gender are read");
const duLabel = (index: number): string => withClass(renderAdrenalineRelations(gendered, doc), "tie")[index].walk().map((node) => node.textContent).join("|");
assert.ok(duLabel(0).indexOf("Ce qu'il me doit") >= 0, "a masculine character: what he owes me");
assert.ok(duLabel(1).indexOf("Ce qu'elle me doit") >= 0, "a feminine character: what she owes me");
assert.ok(duLabel(2).indexOf("Ce qu'iel me doit") >= 0, "a neutral character: what they owe me");
assert.ok(duLabel(3).indexOf("Ce qu'iel me doit") >= 0, "a character without gender: the default wording");
assert.ok(duLabel(0).indexOf("masculin") < 0, "the gender is not printed");

/* A link to a number no NPC carries is shown as typed and does not break the sheet. */
const orphan = documentToRelations({ personnage: "Claire", pnjs: [{ numero: 1, nom: "Ferran", reliesA: [7] }] });
assert.ok(orphan, "an orphan link is still read");
const orphanRoot = renderAdrenalineRelations(orphan, doc);
assert.ok(withClass(orphanRoot, "write-field").some((node) => node.textContent === "7"), "the orphan number is shown as typed");

/* A refusal is the contract's: every refused document is named and read as nothing. */
const refusals = readdirSync(join(base, "refus/relations")).filter((name) => name.endsWith(".json"));
assert.ok(refusals.length > 0, "the producer publishes refusals");
for (const name of refusals) {
	const document = read(join(base, "refus/relations", name));
	assert.ok(contractRefusal("relations", document), `${name}: the contract names the refusal`);
	assert.equal(documentToRelations(document), null, `${name}: a refused document draws nothing`);
}

/* The template is a document the contract accepts, and a copy to TOML keeps it. */
const body = relationsTemplate().split("\n").slice(1, -2).join("\n");
const template = parseRelationsDocument(body);
assert.ok(template, "the inserted template is read by the contract");
assert.equal(template.personnage, "Nouveau personnage", "the template carries its character");
const again = parseRelationsDocument(relationsToToml(template));
assert.deepEqual(again?.pnjs, template.pnjs, "the NPCs survive a copy to TOML");
assert.deepEqual(again?.autresPersonnages, template.autresPersonnages, "the other characters survive a copy to TOML");

console.log("assert:adrenaline-relations ok");
