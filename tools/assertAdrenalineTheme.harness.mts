import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MONSTRE_PRESENTATION, PJ_PRESENTATION, PNJ_PRESENTATION } from "schema-adrenaline/presentation";
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
const CARD = "brumes-adrenaline-card";

/** Every element under `root` (itself included) carrying the class. */
function findAll(root: El, className: string): El[] {
	const found = root.classes.includes(className) ? [root] : [];
	return root.children.reduce((all, child) => all.concat(findAll(child, className)), found);
}

function textOf(root: El): string {
	return [root.textContent, ...root.children.map(textOf)].filter(Boolean).join(" ");
}

function only(root: El, className: string, why: string): El {
	const found = findAll(root, className);
	assert.equal(found.length, 1, why);
	return found[0];
}

const monsterCardSections = MONSTRE_PRESENTATION.sections.filter((section) => "cards" in section);
const monsterZones = MONSTRE_PRESENTATION.sections.reduce<string[]>((zones, section) => {
	if (!("cards" in section)) return zones.concat(section.id);
	return section === monsterCardSections[0] ? zones.concat("cards") : zones;
}, []);
const expectedZones = new Map([
	[adrenalinePjBlock.id, PJ_PRESENTATION.sections.map((section) => section.id)],
	[adrenalinePnjBlock.id, PNJ_PRESENTATION.sections.map((section) => section.id)],
	[adrenalineMonsterBlock.id, monsterZones],
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
// The legacy alternate state reads as a second card: the base on the principal one, the state beside it.
const richCards = findAll(richMonsterRendered, `${CARD}__state-card`);
assert.deepEqual(
	richCards.map((card) => card.classes.filter((name) => name.startsWith(`${CARD}__state-card--`))),
	[[`${CARD}__state-card--principal`, `${CARD}__state-card--active`], [`${CARD}__state-card--secondaire`]],
	"a legacy alternate state must print the base, active, then the alternate state",
);
assert.equal(only(richCards[0], `${CARD}__state-label`, "one state name per card").textContent, "État de base");
assert.equal(only(richCards[1], `${CARD}__state-label`, "one state name per card").textContent, "Surchargé");
assert.deepEqual(findAll(richCards[1], `${CARD}__trigger`).map((trigger) => trigger.textContent), ["Entend une alarme"]);
assert.match(textOf(richCards[0]), /30 m/, "the base card prints the base detection zone");
assert.match(textOf(richCards[1]), /80 m/, "the alternate card overlays its detection zone");
assert.doesNotMatch(textOf(richCards[1]), /30 m/, "the alternate card must not print the base value it overrides");
assert.match(textOf(richCards[1]), /3 actions par round/);
assert.equal(findAll(richCards[1], `${CARD}__section-agir`).length, 0, "the action section sits on the principal card only");
assert.equal(findAll(richCards[0], `${CARD}__section-equipement`).length, 0, "equipment sits on the secondary card only");
const richMeneur = only(richMonsterRendered, `${CARD}__section-meneur`, "the game-master material is printed once");
assert.equal(richMeneur.tagName, "details", "the game-master material folds");
assert.match(textOf(richMeneur), /Souche A-7/);

// The booklet examples, printed as entered: nothing is totalled, nothing is derived.
const npcExample = adrenalinePnjBlock.parse(readFileSync(join(sourceRoot, "examples", "adrenaline", "pnj", "agent-de-securite.toml"), "utf8"));
assert.ok(npcExample, "the security guard example must parse");
const npcCard = adrenalinePnjBlock.render(npcExample, doc) as unknown as El;
assert.deepEqual(
	npcCard.children.map((child) => child.classes.filter((name) => name.startsWith("brumes-adrenaline-pnj--"))[0]),
	PNJ_PRESENTATION.sections.filter((section) => section.id !== "meneur").map((section) => `brumes-adrenaline-pnj--${section.id}`),
	"every section of the security guard prints, but the game-master notes it has none of",
);
assert.ok(npcCard.classes.includes(`${CARD}--banner-garnet`), "a PNJ category prints on the garnet banner");
assert.equal(only(npcCard, `${CARD}__banner-icon`, "one banner icon").dataset.icon, "user");
assert.equal(only(npcCard, `${CARD}__banner-danger`, "one danger level").textContent, "ND 17");
assert.deepEqual(
	findAll(npcCard, `${CARD}__skill-name`).slice(0, 2).map((skill) => skill.textContent),
	["Arme à feu (Pistolet) 40 % + DEX", "Art martial (Judo) 40 % + DEX"],
	"a skill prints its entered score and characteristic",
);
assert.deepEqual(
	findAll(npcCard, `${CARD}__skill-head`).slice(0, 2).map((head) => findAll(head, `${CARD}__figure`).map((figure) => figure.textContent)),
	[["70 %"], ["80 %"]],
	"the entered total is the skill's figure, apart from its name",
);
assert.ok(npcCard.classes.includes(`${CARD}--values-${PNJ_PRESENTATION.appearance.values.align}`), "the card carries the published value alignment");
assert.deepEqual(findAll(npcCard, `${CARD}__dice-badge`).map((badge) => badge.textContent), ["3d10", "1d10"]);
assert.match(textOf(npcCard), /Munitions 12/);
assert.match(textOf(npcCard), /−5 contre Tranchante, Perforante/);
assert.match(textOf(npcCard), /Calme · −1d10 · Anxiété, Peur, Colère/);
const npcTracks = findAll(npcCard, `${CARD}__track`);
assert.equal(npcTracks.length, 3, "the three malus tracks always print");
assert.deepEqual(
	npcTracks.map((track) => [findAll(track, `${CARD}__circle-mark`).length, findAll(track, `${CARD}__circle-bold`).length]),
	[[10, 2], [10, 0], [10, 0]],
	"ten circles per track, the entered stress bold",
);
assert.deepEqual(
	npcTracks.map((track) => track.classes.filter((name) => name.startsWith(`${CARD}__track--`))[0]),
	[`${CARD}__track--stress`, `${CARD}__track--shock`, `${CARD}__track--wound`],
	"each track names the colour it takes from the pack",
);

const zy2 = adrenalineMonsterBlock.parse(readFileSync(join(sourceRoot, "examples", "adrenaline", "monstre", "infecte-zy-2.toml"), "utf8"));
assert.ok(zy2, "the Zy-2 example must parse");
const zy2Card = adrenalineMonsterBlock.render(zy2, doc) as unknown as El;
assert.ok(zy2Card.classes.includes(`${CARD}--banner-garnet`));
assert.equal(only(zy2Card, `${CARD}__banner-icon`, "one banner icon").dataset.icon, "biohazard");
const zy2Cards = findAll(zy2Card, `${CARD}__state-card`);
assert.equal(zy2Cards.length, 2, "Zy-2 prints two state cards");
assert.equal(only(zy2Cards[0], `${CARD}__state-label`, "one state name").textContent, "Stimulé", "the principal card prints etatPrincipal");
assert.equal(only(zy2Cards[1], `${CARD}__state-label`, "one state name").textContent, "Non stimulé");
assert.ok(!zy2Cards[0].classes.includes(`${CARD}__state-card--active`), "without etatActif, the base is the current state");
assert.ok(zy2Cards[1].classes.includes(`${CARD}__state-card--active`));
assert.deepEqual(findAll(zy2Cards[1], `${CARD}__trigger`).map((trigger) => trigger.textContent), ["1d10 min consécutives sans détecter de proie"]);
assert.match(only(zy2Cards[0], `${CARD}__section-corps`, "one body section").children[0].textContent, /^Corps \(Corps faible\)$/);
assert.match(textOf(zy2Cards[0]), /2 actions par round/);
assert.match(textOf(zy2Cards[1]), /1 action par round/);
assert.match(textOf(zy2Cards[0]), /Défense Non \+4/);
const zy2Actions = findAll(zy2Cards[0], `${CARD}__action`);
assert.equal(zy2Actions.length, 2, "the stimulated state carries two actions");
assert.equal(findAll(zy2Actions[0], `${CARD}__follow-up`).length, 2, "the first action has two follow-ups");
assert.deepEqual(findAll(zy2Actions[0], `${CARD}__dice-badge`).map((badge) => badge.textContent), ["1d10", "2d10", "1d10"]);
assert.equal(findAll(zy2Actions[0], `${CARD}__damage-link`)[0]?.textContent, "ou");
assert.equal(findAll(zy2Actions[0], `${CARD}__trigger`)[0]?.textContent, "Attaque gratuite PREMIÈRE FOIS");
assert.match(textOf(zy2Actions[0]), /Art martial \(Zombie\) 10 % \+ FOR = 40 %/);
assert.equal(findAll(zy2Cards[1], `${CARD}__action`).length, 0, "the base state has no action of its own");
assert.match(textOf(zy2Cards[1]), /Vêtements déchirés/, "equipment sits on the secondary card");
// Roles the plan of schema-adrenaline#42 names as unproven: the permanent
// state, the damage properties on their action, the malus ahead of HS.
for (const card of zy2Cards) assert.match(textOf(card), /Insensible/, "the permanent state prints in Santé on each card");
assert.match(textOf(zy2Actions[0]), /Étourdissante/, "damage properties print with their action");
assert.match(textOf(zy2Actions[0]), /Localisée \(Peur\)/, "a parameterised property keeps its parameter");
assert.match(textOf(zy2Actions[0]), /Fatale 9\+/, "a numbered property keeps its threshold");
assert.match(textOf(zy2Cards[0]), /Malus avant HS/, "the stimulated state prints the malus ahead of HS");

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
assert.deepEqual(
	minimalRendered.children.map((child) => child.classes.filter((name) => name.startsWith("brumes-adrenaline-monstre--"))[0]),
	["brumes-adrenaline-monstre--entete", "brumes-adrenaline-monstre--cards"],
	"a minimal creature prints its banner and one card",
);
assert.equal(findAll(minimalRendered, `${CARD}__state-card`).length, 1, "a creature without states prints one card");
assert.equal(findAll(minimalRendered, `${CARD}__form-state-header`).length, 1);
assert.ok(minimalRendered.classes.includes(`${CARD}--banner-garnet`), "the fallback category is garnet");
assert.equal(only(minimalRendered, `${CARD}__banner-label`, "one banner label").textContent, "Créature");

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
assert.match(scss, /\.brumes-adrenaline-pnj[,\s][^{]*\{[^}]*max-width:\s*36rem/);
assert.match(scss, /\.brumes-adrenaline-monstre[,\s][^{]*\{[^}]*max-width:\s*36rem/);
// Layout only: the banner, the badges and the triggers take their colours from the pack.
for (const token of ["banner-garnet", "banner-blue", "banner-orange", "banner-ink", "trigger-bg", "trigger-ink", "dice-badge-bg", "dice-badge-ink"]) {
	assert.match(scss, new RegExp(`var\\(--adrenaline-${token}\\)`), `the compact card must read --adrenaline-${token}`);
}
assert.match(scss, /\.brumes-adrenaline-monstre--cards\s*\{[^}]*display:\s*grid/, "the creature's state cards sit side by side");
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
