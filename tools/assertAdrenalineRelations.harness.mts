import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ATTITUDE_LEVELS, RELATIONS_PRESENTATION, placesPerRow } from "schema-adrenaline/presentation";
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
	properties: Record<string, string> = {};
	style = { setProperty: (name: string, value: string) => { this.properties[name] = value; } };
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
assert.equal(withClass(minimalRoot, "npc").length, npcSlots, "one card per NPC the contract allows");
assert.equal(withClass(minimalRoot, "npc-column").length, npcBlock.columns, "the cards are laid out in the columns the contract publishes");
assert.equal(withClass(minimalRoot, "npc--empty").length, npcSlots, "a sheet without NPCs prints only empty cards");
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
/* The places share the width: one row of as many as printed up to the section columns, even rows beyond. */
const placesCount = (count: number): string => {
	const data = documentToRelations({ personnage: "Claire", nombreDAutresPersonnages: count });
	assert.ok(data, `a count of ${count} is read`);
	return withClass(renderAdrenalineRelations(data, doc), "form-pc-ties")[0]?.properties["--ties-per-row"] ?? "";
};
const maxPerRow = sections[1].columns ?? 1;
for (let count = 1; count <= (otherSlots ?? 0); count += 1) assert.equal(placesCount(count), String(placesPerRow(count, maxPerRow)), `${count} places: the row width the contract computes`);
assert.deepEqual([1, 2, 3, 4, 5, 6].map((count) => placesPerRow(count, 4)), [1, 2, 3, 4, 3, 3], "up to four places fill one row, five and six make two rows of three");
assert.equal(relationsToToml(few).indexOf("nombreDAutresPersonnages = 2") >= 0, true, "the count survives a copy to TOML");
assert.equal(withClass(fullRoot, "npc").length, npcSlots, "the full sheet keeps the NPC cards of the contract");
assert.equal(withClass(fullRoot, "npc--empty").length, 0, "no card of a full sheet is empty");

/* The attitude is worded by the published levels, and the modifier it sets is not printed: its room goes to the links. */
for (const level of ATTITUDE_LEVELS) {
	const data = documentToRelations({ personnage: "Claire", pnjs: [{ numero: 1, nom: "Ferran", attitude: level.key, reliesA: [2, 3] }] });
	assert.ok(data, `attitude ${level.key}: the document is read`);
	const root = renderAdrenalineRelations(data, doc);
	assert.equal(withClass(root, "npc-modifier").length, 0, `attitude ${level.key}: no modifier is printed`);
	const rows = withClass(root, "npc").filter((card) => card.classes.indexOf(`${ROOT}__npc--empty`) < 0);
	assert.equal(rows.length, 1, `attitude ${level.key}: the entered NPC is one card`);
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
const heads = withClass(renderAdrenalineRelations(drama, doc), "npc-head");
assert.ok(heads.length > 0 && heads.every((head) => head.children.length >= 3 && head.children[head.children.length - 1].classes.indexOf(`${ROOT}__tick`) >= 0), "the tick sits to the right of the name of every NPC");
assert.equal(withClass(renderAdrenalineRelations(drama, doc), "npc").every((card) => card.walk().every((node) => node.textContent !== "Touché")), true, "the tick carries no label");

/* The three fields of another character carry fixed labels, whatever the gender, and the gender itself is not printed. */
const gendered = documentToRelations({ personnage: "Claire", autresPersonnages: [{ nom: "A", genre: "masculin", ceQuOnMeDoit: "un secret" }, { nom: "B", genre: "feminin" }, { nom: "C", genre: "neutre" }, { nom: "D" }] });
assert.ok(gendered, "other characters with a gender are read");
const tieText = (index: number): string => withClass(renderAdrenalineRelations(gendered, doc), "tie")[index].walk().map((node) => node.textContent).join("|");
assert.ok(tieText(0).indexOf("Secrets") >= 0 && tieText(0).indexOf("me doit") < 0, "the label of the secrets does not follow the gender");
assert.ok(tieText(0).indexOf("masculin") < 0, "the gender is not printed");

/* A line the document leaves empty is not printed; a place nobody fills stays whole, to be written by hand. */
assert.ok(tieText(1).indexOf("Description") < 0 && tieText(1).indexOf("Dettes") < 0 && tieText(1).indexOf("Secrets") < 0, "a filled character prints only the lines it fills");
const emptyPlace = withClass(renderAdrenalineRelations(gendered, doc), "tie").slice(-1)[0].walk().map((node) => node.textContent).join("|");
assert.ok(emptyPlace.indexOf("Description") >= 0 && emptyPlace.indexOf("Dettes") >= 0 && emptyPlace.indexOf("Secrets") >= 0, "an empty place prints every line");

/* The gender is marked beside the name of another character, with the published text, and nowhere else. */
const marked = (index: number): string[] => withClass(renderAdrenalineRelations(gendered, doc), "tie")[index].walk().filter((node) => node.classes.indexOf(`${ROOT}__gender-mark`) >= 0).map((node) => node.textContent);
const mark = sections[1].blocks[0].genderMark;
assert.ok(mark && mark.key === "nom" && mark.genderKey === "genre", "the contract publishes the gender mark beside the name");
assert.deepEqual([0, 1, 2, 3].map(marked), [[mark.marks.masculin], [mark.marks.feminin], [mark.marks.neutre], []], "each gender prints its mark, an absent gender prints none");
assert.ok(withClass(renderAdrenalineRelations(gendered, doc), "tie")[0].walk().filter((node) => node.classes.indexOf(`${ROOT}__write-line`) >= 0)[0].children.slice(-1)[0].classes.indexOf(`${ROOT}__gender-mark`) >= 0, "the mark closes the line of the name");

/* The same mark follows the name of an NPC, between the name and the free tick. */
const npcMark = sections[2].blocks[0].genderMark;
assert.ok(npcMark && npcMark.key === "nom" && npcMark.genderKey === "genre", "the contract publishes the gender mark of the NPCs");
const npcGender = documentToRelations({ personnage: "Claire", pnjs: [{ numero: 1, nom: "Ferran", genre: "masculin", toucheParLeDrame: true }, { numero: 2, nom: "Gaëlle" }] });
assert.ok(npcGender, "NPCs with a gender are read");
const npcHeads = withClass(renderAdrenalineRelations(npcGender, doc), "npc-head");
assert.deepEqual(npcHeads[0].children.map((node) => node.textContent), ["1", "Ferran", npcMark.marks.masculin, "✓"], "the mark sits between the name and the tick");
assert.equal(npcHeads[1].children.filter((node) => node.classes.indexOf(`${ROOT}__gender-mark`) >= 0).length, 0, "an NPC without gender prints no mark");
const npcLines = (index: number): string => withClass(renderAdrenalineRelations(npcGender, doc), "npc")[index].walk().map((node) => node.textContent).join("|");
assert.ok(npcLines(0).indexOf("Résumé") < 0 && npcLines(0).indexOf("Notes") < 0, "a filled NPC prints only the lines it fills");

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
