import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { parseMonsterheartsPlaybookToml, parseUrbanShadowsPlaybookToml } from "schema-pbta";
import monsterheartsContract from "schema-pbta/packs/monsterhearts/presentation-contract.json";
import urbanShadowsContract from "schema-pbta/packs/urban-shadows/presentation-contract.json";
import { validatePackCss } from "../src/games/assets";
import type { GamePack } from "../src/games/types";
import { renderMonsterheartsLayout } from "../src/features/pbta/monsterheartsLayout";
import { renderUrbanShadowsLayout } from "../src/features/pbta/urbanShadowsLayout";

// The dressing of a Monsterhearts or Urban Shadows playbook block lives in the
// pack's host-neutral `playbook.css`, published by schema-pbta and read by
// Handbook and Lantern alike. Handbook keeps the projection, the generic
// `handbook-pbta-*` style, and the scope it writes in front of the sheet.

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
	src = "";
	alt = "";
	checked = false;
	disabled = false;
	constructor(readonly tag: string) {}
	get childElementCount() { return this.children.length; }
	appendChild(child: FakeElement) { this.children.push(child); return child; }
	setAttribute(name: string, value: string) { this.attributes[name] = value; }
	walk(): FakeElement[] { return [this, ...this.children.reduce<FakeElement[]>((all, child) => all.concat(child.walk()), [])]; }
}
const doc = { createElement: (tag: string) => new FakeElement(tag) } as unknown as Document;
const packageRoot = "node_modules/schema-pbta";
const witness = (name: string) => readFileSync(`${packageRoot}/corpus/contract/valid/${name}.toml`, "utf8");

// The published witness is the smallest complete document, so it leaves out
// optional content that makes some hooks appear. Each complement names the
// field and the hooks it brings; Lantern's harness adds the same complements.
const MONSTERHEARTS_COMPLEMENT = {
	harm: 1, // harm-tracker, .handbook-monsterhearts-harm
	gear: [{ name: "Peigne de nacre" }], // gear
	// Labelled identity lines, as in the French skins: .handbook-monsterhearts-identity-fields, -label, -fill
	identity: { heading: "Identité", paragraphs: ["Nom : Ondine, Morgane", "Look : regard humide"] },
	play: { heading: "Jouer la Selkie", paragraphs: ["Ta peau est ailleurs."] }, // monsterhearts-play
};
const URBAN_SHADOWS_COMPLEMENT = {
	harm: { armor: 1, faint: 2, serious: 2, critical: 1 }, // harm-tracker (condition-harm-tracker), -harm-head, -armor, -harm-line
	scars: [{ name: "Cicatrice au front", stat: "blood", modifier: -1 }], // urban-shadows-scars
	gear: [{ name: "Carnet usé" }], // gear
	statProfiles: [{ key: "night-shift", label: "De nuit", stats: { mind: 1 } }], // .handbook-urban-shadows-row
	// Labelled identity lines, as in the French skins: .handbook-urban-shadows-identity-fields
	identity: { heading: "Identité", paragraphs: ["Nom : Alex, Sam", "Look : manteau trempé"] },
};
const CONDITIONAL: Record<string, Record<string, string>> = { monsterhearts: {}, "urban-shadows": {} };

const monsterhearts = parseMonsterheartsPlaybookToml(witness("monsterhearts-playbook-complete"));
const monsterheartsData = {
	...monsterhearts,
	harm: MONSTERHEARTS_COMPLEMENT.harm,
	gear: MONSTERHEARTS_COMPLEMENT.gear,
	editorial: { ...monsterhearts.editorial, identity: MONSTERHEARTS_COMPLEMENT.identity, play: MONSTERHEARTS_COMPLEMENT.play },
};

const urbanShadows = parseUrbanShadowsPlaybookToml(witness("urban-shadows-playbook-complete"));
const urbanShadowsData = {
	...urbanShadows,
	harm: URBAN_SHADOWS_COMPLEMENT.harm,
	scars: URBAN_SHADOWS_COMPLEMENT.scars,
	gear: URBAN_SHADOWS_COMPLEMENT.gear,
	statProfiles: URBAN_SHADOWS_COMPLEMENT.statProfiles,
	editorial: { ...urbanShadows.editorial, identity: URBAN_SHADOWS_COMPLEMENT.identity },
};

const games = [
	{
		id: "monsterhearts",
		contract: monsterheartsContract,
		root: renderMonsterheartsLayout(monsterheartsData as typeof monsterhearts, doc) as unknown as FakeElement,
	},
	{
		id: "urban-shadows",
		contract: urbanShadowsContract,
		root: renderUrbanShadowsLayout(urbanShadowsData as typeof urbanShadows, doc) as unknown as FakeElement,
	},
];

// 1. The bundle no longer dresses these playbooks.
const bundle = readFileSync("dist/styles.css", "utf8");
for (const { id } of games) {
	const rule = new RegExp(`[^{}]*\\.handbook-${id}-[^{}]*\\{`).exec(bundle);
	assert.equal(rule, null, `dist/styles.css still dresses the ${id} playbook: ${rule?.[0].trim()} (move it to the pack's playbook.css)`);
}

for (const { id, contract, root } of games) {
	// 2. The published appearance contract declares the shared sheet.
	const appearance = JSON.parse(readFileSync(`${packageRoot}/packs/${id}/appearance-contract.json`, "utf8")) as { resources?: { stylesheets?: string[] } };
	assert.ok(
		(appearance.resources?.stylesheets ?? []).includes("assets/styles/playbook.css"),
		`${id}: packs/${id}/appearance-contract.json does not list assets/styles/playbook.css`,
	);
	const sheet = readFileSync(`${packageRoot}/packs/${id}/assets/styles/playbook.css`, "utf8");

	// 3. Handbook accepts the host-neutral sheet and writes its scope in front of every rule.
	const pack = { id } as GamePack;
	const scoped = validatePackCss(sheet, pack, "styles/playbook.css");
	postcss.parse(scoped).walkRules((rule) => {
		for (const selector of rule.selectors) {
			assert.ok(selector.startsWith(`body.brumes--${id} `), `${id}: "${selector}" is not scoped by body.brumes--${id}`);
		}
	});
	assert.throws(() => validatePackCss(".markdown-rendered p { color: red; }", pack, "styles/x.css"), /escapes pack scope/, `${id}: a host selector must still refuse the sheet`);
	assert.throws(() => validatePackCss(`.handbook-${id}-playbookx { color: red; }`, pack, "styles/x.css"), /escapes pack scope/, `${id}: a longer class is not the playbook root`);
	const other = games.find((game) => game.id !== id)!.id;
	assert.throws(() => validatePackCss(`.handbook-${other}-playbook p { color: red; }`, pack, "styles/x.css"), /escapes pack scope/, `${id}: another game's playbook root must be refused`);
	assert.equal(validatePackCss(`body.brumes--${id} p { color: red; }`, pack, "styles/x.css"), `body.brumes--${id} p { color: red; }`, `${id}: a scoped sheet is left as written`);

	// 4. The projected DOM carries every hook the sheet targets.
	assert.ok(root.classes.has(`handbook-${id}-playbook`), `${id}: the projection lost its root handbook-${id}-playbook`);
	const nodes = root.walk();
	const classes = new Set<string>();
	const hooks = new Set<string>();
	for (const node of nodes) {
		node.classes.forEach((name) => classes.add(name));
		if (node.dataset.region) hooks.add(node.dataset.region);
		if (node.dataset.primitive) hooks.add(node.dataset.primitive);
	}
	const conditional = CONDITIONAL[id];
	const targetedClasses = new Set(sheet.match(new RegExp(`handbook-${id}-[a-z0-9-]*[a-z0-9]`, "g")) ?? []);
	const missing: string[] = [];
	targetedClasses.forEach((name) => {
		if (!conditional[name] && !classes.has(name)) missing.push(`.${name}`);
	});
	const targetedHooks = new Set<string>();
	for (const match of sheet.matchAll(/data-(?:region|primitive)\s*=\s*["']([^"']+)["']/g)) targetedHooks.add(match[1]);
	targetedHooks.forEach((name) => {
		if (!conditional[name] && !hooks.has(name)) missing.push(`[data-*="${name}"]`);
	});
	assert.deepEqual(missing, [], `${id}: playbook.css targets hooks absent from the projected DOM of the witness: ${missing.join(", ")}`);
	const published = new Set(contract.regions.map((region: { id: string }) => region.id));
	for (const name of Object.keys(conditional)) {
		assert.ok(targetedClasses.has(name) || targetedHooks.has(name) || published.has(name), `${id}: conditional hook "${name}" is no longer targeted, drop it from the list`);
	}
}

console.log("PbtA playbook styles assertions passed.");
