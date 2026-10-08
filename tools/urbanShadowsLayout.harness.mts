import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseUrbanShadowsPlaybookToml } from "schema-pbta";
import contract from "schema-pbta/packs/urban-shadows/presentation-contract.json";
import { log } from "../src/utils/logger";
import { renderUrbanShadowsLayout, URBAN_SHADOWS_LAYOUT_REGIONS } from "../src/features/pbta/urbanShadowsLayout";

class FakeElement {
	children: FakeElement[] = [];
	attributes: Record<string, string> = {};
	properties: Record<string, string> = {};
	dataset: Record<string, string> = {};
	classes = new Set<string>();
	classList = { add: (...names: string[]) => names.forEach((name) => this.classes.add(name)) };
	style = { setProperty: (name: string, value: string) => { this.properties[name] = value; } };
	textContent = "";
	type = "";
	checked = false;
	disabled = false;
	constructor(readonly tag: string) {}
	get childElementCount() { return this.children.length; }
	appendChild(child: FakeElement) { this.children.push(child); return child; }
	setAttribute(name: string, value: string) { this.attributes[name] = value; }
	walk(): FakeElement[] { return [this, ...this.children.reduce<FakeElement[]>((all, child) => all.concat(child.walk()), [])]; }
}
const doc = { createElement: (tag: string) => new FakeElement(tag) } as unknown as Document;

const corpus = (name: string) => parseUrbanShadowsPlaybookToml(readFileSync(`node_modules/schema-pbta/corpus/contract/valid/${name}.toml`, "utf8"));
const render = (data: unknown) => renderUrbanShadowsLayout(data as never, doc) as unknown as FakeElement;
const regions = (root: FakeElement) => root.walk().filter((node) => node.dataset.region);
const ids = (root: FakeElement) => regions(root).map((node) => node.dataset.region);
const published = contract.regions.map((region) => region.id as string);

// A region this layout declares must exist in the contract: a regression of what Handbook declares is a hard failure.
for (const id of URBAN_SHADOWS_LAYOUT_REGIONS) assert.ok(published.includes(id), `layout declares "${id}", absent from the contract`);

const complete = corpus("urban-shadows-playbook-complete");
const blank = corpus("urban-shadows-playbook-blank");

// Complete witness: each region once, in an order the contract allows, with its label and hooks.
const full = render(complete);
assert.ok(full.classes.has("handbook-urban-shadows-playbook"));
const emitted = ids(full);
assert.equal(new Set(emitted).size, emitted.length, "each region is emitted once");
for (const node of regions(full)) {
	const region = contract.regions.find((entry) => entry.id === node.dataset.region);
	assert.ok(region, `region ${node.dataset.region} is not published`);
	assert.equal(node.dataset.primitive, region.primitive, `data-primitive of ${region.id}`);
	assert.equal(node.properties["--pbta-region-order"], String(contract.canonicalOrder.indexOf(region.id)), `region order of ${region.id}`);
	assert.ok(node.classes.has("handbook-urban-shadows-region"));
}
const placed = (root: FakeElement) => root.walk().filter((node) => node.dataset.row).reduce<string[]>((all, row) => all.concat(regions(row).map((node) => node.dataset.region as string)), []);
const flat = contract.rows.reduce<string[]>((all, columns) => columns.reduce<string[]>((inner, column) => inner.concat(column), all), []);
assert.deepEqual(placed(full), flat.filter((id) => emitted.indexOf(id) >= 0), "regions sit in the cells the contract gives them");
assert.deepEqual(full.children.map((face) => face.dataset.face), ["recto", "verso"], "two faces, front then back");
const headingOf = (id: string) => regions(full).find((node) => node.dataset.region === id)?.children[0]?.textContent;
for (const id of ["urban-shadows-stats", "urban-shadows-circles", "playbook-moves", "urban-shadows-end-move"]) {
	if (emitted.indexOf(id) >= 0) assert.equal(headingOf(id), contract.regions.find((entry) => entry.id === id)?.label, `label of ${id}`);
}
assert.ok(emitted.indexOf("urban-shadows-corruption") >= 0, "corruption is always emitted");
const corruption = regions(full).find((node) => node.dataset.region === "urban-shadows-corruption") as FakeElement;
assert.equal(corruption.walk().filter((node) => node.dataset.filled === undefined && node.attributes["aria-label"]?.startsWith("Corruption ")).length, complete.corruption.track ?? 0, "corruption track follows corruption.track");

// Stats are split by the keys the document names as Circles; each Circle carries three pips.
const rich = { ...complete, stats: { blood: 1, heart: 0, mortalis: 2, night: -1 }, statuses: { mortalis: 2, night: 5 }, advancementCircles: ["mortalis", "night"] };
const split = render(rich);
const marksOf = (id: string) => regions(split).find((node) => node.dataset.region === id)?.walk().filter((node) => node.dataset.mark);
assert.deepEqual(marksOf("urban-shadows-stats")?.map((node) => node.children[1].textContent), ["blood", "heart"]);
assert.deepEqual(marksOf("urban-shadows-circles")?.map((node) => node.children[1].textContent), ["mortalis", "night"]);
const pips = marksOf("urban-shadows-circles")?.map((mark) => mark.walk().filter((node) => node.dataset.filled !== undefined).map((pip) => pip.dataset.filled));
assert.deepEqual(pips, [["true", "true", "false"], ["true", "true", "true"]], "three pips a Circle, status clamped to three");

// Blank witness: a region without data is not emitted, nothing throws.
const empty = ids(render(blank));
for (const id of ["urban-shadows-scars", "urban-shadows-let-it-out", "harm-tracker", "urban-shadows-intimacy", "urban-shadows-debts", "urban-shadows-extras", "gear"]) {
	assert.ok(empty.indexOf(id) < 0, `${id} has no data, so no region`);
}

// A region the contract publishes and the layout does not know: noted, the rest still renders, no failure.
log.setLevel("warn");
const warnings: string[] = [];
const original = console.warn;
console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
try {
	const unknown = { ...contract, canonicalOrder: contract.canonicalOrder.concat(["urban-shadows-future"]) };
	(contract as { canonicalOrder: string[] }).canonicalOrder = unknown.canonicalOrder;
	const tolerant = ids(render(complete));
	assert.deepEqual(tolerant, emitted, "an unknown region does not disturb the others");
	assert.ok(warnings.some((line) => line.indexOf("urban-shadows-future") >= 0), "the unknown region is noted");
} finally {
	console.warn = original;
	(contract as { canonicalOrder: string[] }).canonicalOrder = contract.canonicalOrder.filter((id) => id !== "urban-shadows-future");
}

console.log("Urban Shadows layout assertions passed.");
