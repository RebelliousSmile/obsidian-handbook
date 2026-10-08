import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	parseMonsterOfTheWeekMonsterToml,
	parseMonsterOfTheWeekTeamToml,
	parseMonsterOfTheWeekThreatToml,
	stringifyMonsterOfTheWeekMonsterToml,
	stringifyMonsterOfTheWeekTeamToml,
	stringifyMonsterOfTheWeekThreatToml,
} from "schema-pbta";
import teamContract from "schema-pbta/packs/monster-of-the-week/team-presentation-contract.json";
import monsterContract from "schema-pbta/packs/monster-of-the-week/monster-presentation-contract.json";
import threatContract from "schema-pbta/packs/monster-of-the-week/threat-presentation-contract.json";
import bookContract from "schema-pbta/packs/monster-of-the-week/presentation-contract.json";
import { pbtaPlaybookBlock } from "../src/features/pbta/block";
import { MOTW_LAYOUT_REGIONS } from "../src/features/pbta/motwLayout";
import { pbtaMonsterBlock, pbtaTeamBlock, pbtaThreatBlock } from "../src/features/pbta/motwBlocks";

class FakeElement {
	checked = false;
	disabled = false;
	type = "";
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
const regions = (root: FakeElement) => root.walk().filter((node) => node.dataset.region);
const ids = (root: FakeElement) => regions(root).map((node) => node.dataset.region as string);

interface CardContract {
	regions: Array<{ id: string; label: string; primitive: string }>;
	canonicalOrder: string[];
	rows: string[][][];
	outsideCard: string[];
}
interface Card {
	name: string;
	contract: CardContract;
	block: { parse(source: string): unknown; render(data: never, doc: Document): unknown };
	complete: string;
	blank: string;
	parse(source: string): unknown;
	stringify(data: never): string;
}
const cards: Card[] = [
	{ name: "team", contract: teamContract as unknown as CardContract, block: pbtaTeamBlock as never, complete: "monster-of-the-week-team-complete", blank: "monster-of-the-week-team-blank", parse: parseMonsterOfTheWeekTeamToml, stringify: stringifyMonsterOfTheWeekTeamToml as never },
	{ name: "monster", contract: monsterContract as unknown as CardContract, block: pbtaMonsterBlock as never, complete: "monster-of-the-week-monster-complete", blank: "monster-of-the-week-monster-blank", parse: parseMonsterOfTheWeekMonsterToml, stringify: stringifyMonsterOfTheWeekMonsterToml as never },
	{ name: "threat", contract: threatContract as unknown as CardContract, block: pbtaThreatBlock as never, complete: "monster-of-the-week-threat-complete", blank: "monster-of-the-week-threat-blank", parse: parseMonsterOfTheWeekThreatToml, stringify: stringifyMonsterOfTheWeekThreatToml as never },
];

for (const card of cards) {
	const { contract } = card;
	const parsed = card.block.parse(witness(card.complete));
	assert.ok(parsed, `${card.name}: the complete witness parses`);
	const root = card.block.render(parsed as never, doc) as FakeElement;

	/* Each region once, in canonical order, with the hooks of the contract. */
	const emitted = ids(root);
	assert.ok(emitted.length > 0, `${card.name}: regions are drawn`);
	assert.equal(new Set(emitted).size, emitted.length, `${card.name}: each region is emitted once`);
	for (const node of regions(root)) {
		const region = contract.regions.find((entry) => entry.id === node.dataset.region);
		assert.ok(region, `${card.name}: region ${node.dataset.region} is published`);
		assert.equal(node.dataset.primitive, region.primitive, `${card.name}: data-primitive of ${region.id}`);
		assert.equal(node.attributes.style, `--pbta-region-order: ${contract.canonicalOrder.indexOf(region.id)}`, `${card.name}: ${region.id} carries its canonical order`);
	}

	/* Rows and columns come from the contract; the regions outside the card sit outside it. */
	const rowNodes = root.walk().filter((node) => node.dataset.row);
	assert.equal(rowNodes.length, contract.rows.length, `${card.name}: one row per row of the contract`);
	contract.rows.forEach((columns, rowIndex) => {
		assert.equal(rowNodes[rowIndex].dataset.row, String(rowIndex + 1));
		const columnNodes = rowNodes[rowIndex].children.filter((node) => node.dataset.column);
		assert.equal(columnNodes.length, columns.length, `${card.name}: columns of row ${rowIndex + 1}`);
		columns.forEach((columnIds, columnIndex) => {
			const inColumn = ids(columnNodes[columnIndex]);
			assert.deepEqual(inColumn, columnIds.filter((id) => inColumn.indexOf(id) >= 0), `${card.name}: row ${rowIndex + 1} column ${columnIndex + 1}, in contract order`);
		});
	});
	const frame = root.walk().find((node) => node.classes.has("handbook-motw-card"));
	assert.ok(frame, `${card.name}: the card frames the rows`);
	const inFrame = ids(frame);
	for (const outside of contract.outsideCard) assert.ok(inFrame.indexOf(outside) < 0, `${card.name}: ${outside} sits outside the card`);
	for (const id of inFrame) assert.ok(contract.outsideCard.indexOf(id) < 0, `${card.name}: ${id} belongs to the card`);

	/* Blank: nothing throws, and what the document does not carry is not drawn. */
	const blankParsed = card.block.parse(witness(card.blank));
	assert.ok(blankParsed, `${card.name}: the blank witness parses`);
	const blank = card.block.render(blankParsed as never, doc) as FakeElement;
	assert.ok(ids(blank).length <= emitted.length, `${card.name}: a blank document draws no more than a complete one`);
	assert.equal(blank.walk().filter((node) => node.tag === "input" && node.checked).length, 0, `${card.name}: a blank document has no ticked box`);

	/* A truncated document yields nothing, and does not throw. */
	assert.equal(card.block.parse(`slug = "cut"\nname = "Cut`), null, `${card.name}: a truncated document yields nothing`);

	/* The export goes through the codec again. */
	const exported = card.stringify(card.parse(witness(card.complete)) as never);
	assert.deepEqual(card.parse(exported), card.parse(witness(card.complete)), `${card.name}: the export round-trips`);
}

/* ---- Booklet ---- */
const rendered = (name: string, packId: string | undefined) => {
	const parsedBook = pbtaPlaybookBlock.parse(witness(name));
	assert.ok(parsedBook && parsedBook.target === "monster-of-the-week-playbook", `${name} resolves to monster-of-the-week-playbook`);
	return pbtaPlaybookBlock.render(parsedBook, doc, packId ? ({ packId } as never) : undefined) as unknown as FakeElement;
};

assert.deepEqual(
	[...MOTW_LAYOUT_REGIONS].sort(),
	bookContract.regions.map((region) => region.id as string).sort(),
	"the layout draws exactly the regions the contract publishes",
);

const book = rendered("monster-of-the-week-playbook-complete", "monster-of-the-week");
const faceNodes = book.walk().filter((node) => node.dataset.face);
assert.deepEqual(faceNodes.map((node) => node.dataset.face), bookContract.faces.map((face) => face.id as string), "faces in contract order");
bookContract.faces.forEach((face, faceIndex) => {
	const node = faceNodes[faceIndex];
	assert.equal(node.children[0].dataset.region, face.header, `${face.id} opens with its header`);
	const columns = node.walk().filter((entry) => entry.dataset.column);
	assert.equal(columns.length, face.columns.length, `columns of ${face.id}`);
	face.columns.forEach((columnIds, columnIndex) => {
		const inColumn = ids(columns[columnIndex]);
		assert.deepEqual(inColumn, columnIds.filter((id) => inColumn.indexOf(id) >= 0), `regions of ${face.id} column ${columnIndex + 1}, in contract order`);
	});
});
for (const node of regions(book)) {
	const region = bookContract.regions.find((entry) => entry.id === node.dataset.region);
	assert.ok(region, `region ${node.dataset.region} is published`);
	assert.equal(node.dataset.primitive, region.primitive, `data-primitive of ${region.id}`);
}

/* The sheet witness draws too. */
assert.ok(regions(rendered("monster-of-the-week-playbook-sheet", "monster-of-the-week")).length > 0, "the sheet witness draws regions");

/* Without the pack, the generic rendering is unchanged. */
const generic = rendered("monster-of-the-week-playbook-complete", undefined);
assert.equal(generic.walk().filter((node) => node.dataset.face).length, 0, "no face without the pack");

console.log("Monster of the Week layout harness passed.");
