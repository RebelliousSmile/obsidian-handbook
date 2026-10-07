import assert from "node:assert/strict";
import contract from "schema-pbta/packs/monsterhearts/presentation-contract.json";
import { renderMonsterheartsLayout } from "../src/features/pbta/monsterheartsLayout";

class FakeElement {
	children: FakeElement[] = [];
	attributes: Record<string, string> = {};
	dataset: Record<string, string> = {};
	classes = new Set<string>();
	classList = { add: (...names: string[]) => names.forEach((name) => this.classes.add(name)) };
	textContent = "";
	type = "";
	checked = false;
	constructor(readonly tag: string) {}
	appendChild(child: FakeElement) { this.children.push(child); return child; }
	setAttribute(name: string, value: string) { this.attributes[name] = value; }
	walk(): FakeElement[] { return [this, ...this.children.reduce<FakeElement[]>((all, child) => all.concat(child.walk()), [])]; }
}
const doc = { createElement: (tag: string) => new FakeElement(tag) } as unknown as Document;
const copy = (heading: string) => ({ heading, paragraphs: [`${heading} text`] });

function render(extra: Record<string, unknown>) {
	const data = {
		name: "La Selkie", description: "d", stats: {}, moves: [], advances: [{ label: "Avancée", checked: true }, { label: "Autre" }],
		editorial: { opening: copy("Intro"), identity: copy("Id"), darkestSelf: copy("Démon"), sexMove: copy("Sexe"), progression: copy("Prog") },
		harm: 2, strings: { starting: 1, max: 3 }, ascendants: [{ name: "A", value: 1 }], conditions: [{ name: "Effrayé" }],
		...extra,
	};
	return (renderMonsterheartsLayout(data as never, doc) as unknown as FakeElement).walk();
}

const regions = (nodes: FakeElement[]) => nodes.filter((node) => node.dataset.region);
const published = contract.regions.map((region) => region.id as string);
const base = regions(render({}));
for (const node of base) assert.ok(published.includes(node.dataset.region), `region ${node.dataset.region} is not published`);
assert.ok(!base.some((node) => node.dataset.region === "monsterhearts-play"), "no editorial.play, no play region");

const merged = base.find((node) => node.dataset.region === "ascendants-and-conditions");
assert.ok(merged, "the merged region renders");
assert.equal(merged.children[0].textContent, contract.regions.find((region) => region.id === "ascendants-and-conditions")?.label);
const boxes = merged.walk().filter((node) => node.tag === "input");
assert.deepEqual(boxes.map((box) => box.checked), [true, true, false, false], "harm is 4 boxes, `harm` filled");
assert.ok(boxes.every((box) => box.type === "checkbox"));

const withPlay = regions(render({ editorial: { opening: copy("Intro"), identity: copy("Id"), darkestSelf: copy("Démon"), sexMove: copy("Sexe"), progression: copy("Prog"), play: copy("Jouer la Selkie") } }));
const play = withPlay.find((node) => node.dataset.region === "monsterhearts-play");
assert.ok(play, "editorial.play renders its region");
assert.equal(play.children[0].textContent, "Jouer la Selkie");

const progression = base.find((node) => node.dataset.region === "monsterhearts-progression");
assert.deepEqual(progression?.walk().filter((node) => node.tag === "input").map((box) => box.checked), [true, false], "advances are checkboxes");

console.log("Monsterhearts layout assertions passed.");
