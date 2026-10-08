import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseMasksNpcToml, stringifyMasksNpcToml } from "schema-pbta";
import npcContract from "schema-pbta/packs/masks/npc-presentation-contract.json";
import { parseMasksPlaybookToml } from "schema-pbta";
import playbookContract from "schema-pbta/packs/masks/presentation-contract.json";
import { pbtaPlaybookBlock } from "../src/features/pbta/block";
import { MASKS_LAYOUT_REGIONS } from "../src/features/pbta/masksLayout";
import { pbtaNpcBlock, parsePbtaNpcToml, stringifyPbtaNpcToml } from "../src/features/pbta/npc";

class FakeElement {
	style = { setProperty: (_name: string, _value: string) => undefined };
	checked = false;
	disabled = false;
	type = "";
	src = "";
	alt = "";
	children: FakeElement[] = [];
	attributes: Record<string, string> = {};
	dataset: Record<string, string> = {};
	classes = new Set<string>();
	classList = { add: (...names: string[]) => names.forEach((name) => this.classes.add(name)) };
	textContent = "";
	constructor(readonly tag: string) {}
	appendChild(child: FakeElement) { this.children.push(child); return child; }
	setAttribute(name: string, value: string) { this.attributes[name] = value; }
	walk(): FakeElement[] { return [this, ...this.children.reduce<FakeElement[]>((all, child) => all.concat(child.walk()), [])]; }
}
const doc = { createElement: (tag: string) => new FakeElement(tag) } as unknown as Document;

const witness = (name: string) => readFileSync(`node_modules/schema-pbta/corpus/contract/valid/${name}.toml`, "utf8");
const renderMasks = (source: string) => {
	const resolved = parsePbtaNpcToml(source);
	assert.ok(resolved && resolved.target === "masks-npc", "a masks-npc document resolves to the masks-npc target");
	return pbtaNpcBlock.render(resolved, doc, { packId: "masks" } as never) as unknown as FakeElement;
};
const regions = (root: FakeElement) => root.walk().filter((node) => node.dataset.region);
const ids = (root: FakeElement) => regions(root).map((node) => node.dataset.region);
const published = npcContract.regions.map((region) => region.id as string);

/* Complete witness: each region once, in the contract order, with its label and hooks. */
const full = renderMasks(witness("masks-npc-complete"));
assert.ok(full.classes.has("handbook-masks-npc"));
const emitted = ids(full);
assert.equal(new Set(emitted).size, emitted.length, "each region is emitted once");
for (const id of emitted) assert.ok(published.includes(id as string), `region ${id} is not published`);
assert.deepEqual(
	emitted,
	npcContract.canonicalOrder.filter((id) => emitted.indexOf(id) >= 0),
	"regions follow the canonical order of the contract",
);
for (const node of regions(full)) {
	const region = npcContract.regions.find((entry) => entry.id === node.dataset.region);
	assert.ok(region, `region ${node.dataset.region} is not published`);
	assert.equal(node.dataset.primitive, region.primitive, `data-primitive of ${region.id}`);
	assert.ok(node.classes.has("handbook-masks-npc-region"));
	if (region.id !== "masks-npc-header" && region.id !== "masks-npc-identity") {
		assert.equal(node.children[0]?.textContent, region.label, `label of ${region.id}`);
	}
}

/* Rows and columns come from the contract; the context sits outside the card. */
const rowNodes = full.walk().filter((node) => node.dataset.row);
assert.equal(rowNodes.length, npcContract.rows.length, "one layout row per row of the contract");
npcContract.rows.forEach((columns, rowIndex) => {
	const row = rowNodes[rowIndex];
	assert.equal(row.dataset.row, String(rowIndex + 1));
	const columnNodes = row.children.filter((node) => node.dataset.column);
	assert.equal(columnNodes.length, columns.length, `columns of row ${rowIndex + 1}`);
});
const card = full.walk().find((node) => node.classes.has("handbook-masks-npc-card"));
assert.ok(card, "the card wraps the rows");
const inCard = ids(card);
for (const outside of npcContract.outsideCard) {
	assert.ok(emitted.indexOf(outside) >= 0, `${outside} is emitted`);
	assert.ok(inCard.indexOf(outside) < 0, `${outside} sits outside the card`);
}

/* The Self track: one notch per value from min to max, the current one marked. */
const parsed = parseMasksNpcToml(witness("masks-npc-complete"));
const notches = full.walk().filter((node) => node.tag === "li" && node.dataset.value !== undefined);
assert.equal(notches.length, parsed.self.max - parsed.self.min + 1, "one notch per value of the track");
assert.deepEqual(
	notches.filter((node) => node.dataset.marked === "true").map((node) => node.dataset.value),
	[String(parsed.self.value)],
	"only the current value is marked",
);

/* Resistance is a figure; Conditions are names, not boxes. */
if (parsed.resistance !== undefined) {
	const figure = full.walk().find((node) => node.classes.has("handbook-masks-npc-resistance"));
	assert.equal(figure?.textContent, String(parsed.resistance), "resistance printed in its circle");
}
const resistanceRegion = regions(full).find((node) => node.dataset.region === "masks-npc-resistance");
const conditionItems = resistanceRegion ? resistanceRegion.walk().filter((node) => node.tag === "li").map((node) => node.textContent) : [];
assert.deepEqual(conditionItems, parsed.conditions ?? [], "conditions listed by name");

/* Blank witness: only what the document carries is emitted, and nothing throws. */
const blank = renderMasks(witness("masks-npc-blank"));
const blankIds = ids(blank);
for (const id of ["masks-npc-header", "masks-npc-self", "masks-npc-context"]) {
	assert.ok(blankIds.indexOf(id) >= 0, `${id} is always emitted`);
}
assert.ok(blankIds.indexOf("masks-npc-moves") < 0, "an empty region is not emitted");

/* Without the pack, the same document renders the sober version: no region of the game. */
const resolved = parsePbtaNpcToml(witness("masks-npc-complete"));
assert.ok(resolved);
const sober = pbtaNpcBlock.render(resolved, doc, undefined) as unknown as FakeElement;
assert.equal(regions(sober).length, 0, "no Masks region without the pack");
assert.ok(sober.classes.has("handbook-pbta-npc"));

/* A generic npc renders sober too, even under the Masks pack. */
const generic = parsePbtaNpcToml(`slug = "plain"\nname = "Plain"\ngame = "masks"\ndescription = "A plain character."\nmoves = []\n`);
assert.ok(generic && generic.target === "npc", "a generic npc resolves to the npc target");
const genericNode = pbtaNpcBlock.render(generic, doc, { packId: "masks" } as never) as unknown as FakeElement;
assert.equal(regions(genericNode).length, 0, "a generic npc gets no Masks region");

/* A truncated document yields nothing, and does not throw. */
assert.equal(pbtaNpcBlock.parse(`slug = "cut"\nname = "Cut`), null);

/* The export goes through the codec again. */
assert.equal(stringifyPbtaNpcToml(resolved), stringifyMasksNpcToml(parseMasksNpcToml(witness("masks-npc-complete"))));
assert.ok(parsePbtaNpcToml(stringifyPbtaNpcToml(resolved)), "the exported document is accepted again");

/* ---- Playbook booklet ---- */
const rendered = (name: string, packId: string | undefined, image?: (path: string) => string | null) => {
	const parsedBook = pbtaPlaybookBlock.parse(witness(name));
	assert.ok(parsedBook && parsedBook.target === "masks-playbook", `${name} resolves to masks-playbook`);
	return pbtaPlaybookBlock.render(parsedBook, doc, packId ? ({ packId, resolveImage: image } as never) : undefined) as unknown as FakeElement;
};
const bookRegions = (root: FakeElement) => root.walk().filter((node) => node.dataset.region);

assert.deepEqual(
	[...MASKS_LAYOUT_REGIONS].sort(),
	playbookContract.regions.map((region) => region.id as string).sort(),
	"the layout draws exactly the regions the contract publishes",
);

const book = rendered("masks-playbook-complete", "masks", (path) => `vault:${path}`);
const faceNodes = book.walk().filter((node) => node.dataset.face);
assert.deepEqual(faceNodes.map((node) => node.dataset.face), playbookContract.faces.map((face) => face.id as string), "faces in contract order");
playbookContract.faces.forEach((face, faceIndex) => {
	const node = faceNodes[faceIndex];
	const header = node.children[0];
	assert.equal(header.dataset.region, face.header, `${face.id} opens with its header`);
	const columns = node.walk().filter((entry) => entry.dataset.column);
	assert.equal(columns.length, face.columns.length, `columns of ${face.id}`);
	face.columns.forEach((ids, columnIndex) => {
		const emitted = bookRegions(columns[columnIndex]).map((entry) => entry.dataset.region);
		assert.deepEqual(emitted, ids.filter((id) => emitted.indexOf(id) >= 0), `regions of ${face.id} column ${columnIndex + 1}, in contract order`);
	});
});
for (const node of bookRegions(book)) {
	const region = playbookContract.regions.find((entry) => entry.id === node.dataset.region);
	assert.ok(region, `region ${node.dataset.region} is published`);
	assert.equal(node.dataset.primitive, region.primitive, `data-primitive of ${region.id}`);
	if (["boxes", "list", "key-value"].indexOf(region.primitive) >= 0 || region.id === "masks-labels" || region.id === "masks-moment-of-truth") {
		assert.equal(node.children[0]?.textContent, region.label, `label of ${region.id}`);
	}
}

const sheet = parseMasksPlaybookToml(witness("masks-playbook-complete"));
const labelRegion = bookRegions(book).find((node) => node.dataset.region === "masks-labels");
assert.ok(labelRegion);
const dangerRange = sheet.statRanges?.danger;
assert.ok(dangerRange);
const dangerNotches = labelRegion.walk().filter((node) => node.tag === "li" && node.dataset.value !== undefined).slice(0, dangerRange.max - dangerRange.min + 1);
assert.equal(dangerNotches.length, dangerRange.max - dangerRange.min + 1, "one notch per value of the range");
assert.deepEqual(dangerNotches.filter((node) => node.dataset.marked === "true").map((node) => node.dataset.value), [String(sheet.stats.danger)], "only the value of the document is marked");
const unranged = labelRegion.walk().filter((node) => node.tag === "strong");
assert.equal(unranged.length, Object.keys(sheet.stats).filter((key) => !sheet.statRanges?.[key]).length, "a Label without range prints its figure");

const potentialNode = bookRegions(book).find((node) => node.dataset.region === "masks-advances");
assert.ok(potentialNode);
const potentialBoxes = potentialNode.children.filter((node) => node.classes.has("handbook-masks-potential"))[0].children;
assert.equal(potentialBoxes.length, sheet.potentialMax, "one box per Potential");
assert.equal(potentialBoxes.filter((node) => node.checked).length, sheet.potential, "Potential boxes filled");
const conditions = bookRegions(book).find((node) => node.dataset.region === "masks-conditions");
assert.ok(conditions);
assert.equal(conditions.walk().filter((node) => node.tag === "input" && node.checked).length, (sheet.conditions ?? []).filter((entry) => entry.checked).length, "checked conditions are filled");
const unlock = bookRegions(book).find((node) => node.dataset.region === "masks-moment-of-truth");
assert.equal(unlock?.walk().filter((node) => node.tag === "input")[0].checked, sheet.momentUnlocked === true, "unlock box reflects the document");

/* No illustration in the document: the column is empty and nothing throws. */
assert.ok(bookRegions(book).some((node) => node.dataset.region === "masks-illustration"), "the illustration frame is drawn even without playbookImage");

/* The booklet is drawn for play: what is chosen at creation is not drawn, whatever the document carries. */
const completeIds = bookRegions(book).map((node) => node.dataset.region);
assert.ok(completeIds.indexOf("masks-influence-options") < 0, "the influence options are a creation choice and are not drawn");
for (const id of ["masks-backstory", "masks-relationships"]) assert.ok(completeIds.indexOf(id) >= 0, `${id} is drawn when filled`);
const drivesNode = bookRegions(book).find((node) => node.dataset.region === "masks-drives");
assert.ok(drivesNode, "the chosen Drive is drawn");
assert.equal(drivesNode.walk().filter((node) => node.tag === "li").length, (sheet.drives?.options ?? []).filter((entry) => entry.checked).length, "only the chosen Drives");
const identityDrawn = bookRegions(book).find((node) => node.dataset.region === "masks-identity");
assert.equal(identityDrawn?.walk().filter((node) => node.tag === "dt").length, 3, "the filled identity lines are drawn");

/* Blank booklet: boxes empty, no region without data, no line to fill. */
const blankBook = rendered("masks-playbook-blank", "masks");
const blankBookIds = bookRegions(blankBook).map((node) => node.dataset.region);
for (const id of ["masks-conditions", "masks-backstory", "masks-moves", "masks-drives", "masks-identity"]) assert.ok(blankBookIds.indexOf(id) < 0, `${id} is not emitted empty`);
assert.equal(blankBook.walk().filter((node) => node.dataset.marked === "true").length, 0, "a sheet without ranges marks no notch");
assert.equal(blankBook.walk().filter((node) => node.tag === "input" && node.checked).length, 0, "a blank sheet has no filled box");

/* Without the pack, the generic rendering is unchanged. */
const genericBook = rendered("masks-playbook-complete", undefined);
assert.equal(genericBook.walk().filter((node) => node.dataset.face).length, 0, "no face without the pack");

console.log("Masks layout harness passed.");
