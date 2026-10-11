import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MONSTRE_PRESENTATION, PJ_PRESENTATION, PNJ_PRESENTATION } from "schema-adrenaline/presentation";
import { adrenalinePjBlock } from "../src/features/adrenalinePj/block";
import { adrenalinePnjBlock } from "../src/features/adrenalinePnj/block";
import { adrenalineMonsterBlock } from "../src/features/adrenalineMonstre/block";
import { buildGameStyle } from "../src/features/modes/styleElement";
import { readGamePluginManifest } from "../src/games/pluginManifest";
import { log } from "../src/utils/logger";

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
	attributes: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	setAttribute(name: string, value: string): void { this.attributes[name] = value; }
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
assert.equal(findAll(zy2Cards[0], `${CARD}__section-equipement`).length, 0, "with two cards, the equipment does not follow its fallback");
// Roles the plan of schema-adrenaline#42 names as unproven: the permanent
// state, the damage properties on their action, the malus ahead of HS.
for (const card of zy2Cards) assert.match(textOf(card), /État\s+Insensible/, "the permanent state prints on the thresholds row of each card, behind its label");
assert.match(textOf(zy2Actions[0]), /Étourdissante/, "damage properties print with their action");
assert.match(textOf(zy2Actions[0]), /Localisée \(Peur\)/, "a parameterised property keeps its parameter");
assert.match(textOf(zy2Actions[0]), /Fatale 9\+/, "a numbered property keeps its threshold");
const malusRow = only(zy2Cards[0], `${CARD}__form-malus-circles`, "one malus row on the stimulated card");
assert.equal(findAll(malusRow, `${CARD}__circle-mark`).length, 3, "the circles are the entered malus, never derived");
assert.match(textOf(malusRow), /^Malus\s*HS$/, "the malus circles end on HS");
assert.equal(findAll(zy2Cards[1], `${CARD}__form-malus-circles`).length, 0, "the base state enters no malus, so no row");

// The characteristics read the published rows: FOR CON DEX RAP, then the detection zone, PER and the movement,
// on the columns of the first row; the detection and the movement have no block of their own.
const zy2Source = readFileSync(join(sourceRoot, "examples", "adrenaline", "monstre", "infecte-zy-2.toml"), "utf8");
for (const [index, card] of zy2Cards.entries()) {
	const cells = findAll(only(card, `${CARD}__block-caracteristiques`, "one characteristics block per card"), `${CARD}__cell`);
	const rowOf = (row: number): El[] => cells.filter((cell) => cell.classes.includes(`${CARD}__row-${row}`));
	assert.deepEqual(rowOf(1).map((cell) => textOf(cell).split(" ")[0]), ["FOR", "CON", "DEX", "RAP"]);
	assert.deepEqual(
		rowOf(2).map((cell) => [textOf(cell), cell.classes.filter((name) => name.startsWith(`${CARD}__col-`))[0]]),
		[[`Zone de détection ${index === 0 ? "2" : "3"} m`, `${CARD}__col-1`], ["PER 30 %", `${CARD}__col-2`], [`Dépl. ${index === 0 ? "3" : "2"} m`, `${CARD}__col-3`]],
		"the second row prints the detection zone, PER and the movement, in that order, on the columns of the first row",
	);
	assert.equal(findAll(card, `${CARD}__block-detection`).length + findAll(card, `${CARD}__block-deplacement`).length, 0, "the detection and the movement have no block of their own");
}
// A cell without an entered value is not printed; the others keep their column.
const noDetection = adrenalineMonsterBlock.parse(zy2Source.replace(/^zoneDeDetection = .*$/gm, ""));
assert.ok(noDetection, "Zy-2 without a detection zone must parse");
const noDetectionCards = findAll(adrenalineMonsterBlock.render(noDetection, doc) as unknown as El, `${CARD}__state-card`);
assert.deepEqual(
	findAll(noDetectionCards[0], `${CARD}__cell`).filter((cell) => cell.classes.includes(`${CARD}__row-2`)).map((cell) => textOf(cell)),
	["PER 30 %", "Dépl. 3 m"],
);

// The case of the current state: on the principal card only, ticked when etatActif names that card's state; a marker before each trigger.
const checkOf = (card: El): El[] => findAll(card, `${CARD}__state-check`);
assert.equal(checkOf(zy2Cards[0]).length, 1, "the principal card carries the case of the current state");
assert.equal(checkOf(zy2Cards[1]).length, 0, "the secondary card carries none");
assert.equal(checkOf(zy2Cards[0])[0].attributes["aria-checked"], "false", "without etatActif the base is current, so the principal state is not ticked");
assert.equal(checkOf(zy2Cards[0])[0].attributes["aria-label"], "État actuel", "the case keeps its accessible name");
assert.doesNotMatch(textOf(zy2Cards[0]) + textOf(zy2Cards[1]), /État actuel/, "the text is replaced by the case");
for (const card of zy2Cards) assert.equal(findAll(card, `${CARD}__trigger-marker`).length, findAll(card, `${CARD}__trigger-row`).length, "a marker before each trigger");
const zy2Active = adrenalineMonsterBlock.parse(zy2Source.replace(/^etatPrincipal = .*$/m, (line) => `${line}\netatActif = "stimule"`));
assert.ok(zy2Active, "Zy-2 with etatActif must parse");
const zy2ActiveCards = findAll(adrenalineMonsterBlock.render(zy2Active, doc) as unknown as El, `${CARD}__state-card`);
assert.equal(checkOf(zy2ActiveCards[0])[0].attributes["aria-checked"], "true", "etatActif naming the principal state ticks the case");
assert.ok(checkOf(zy2ActiveCards[0])[0].classes.includes(`${CARD}__state-check--checked`));
assert.equal(checkOf(zy2ActiveCards[1]).length, 0, "the small card never carries the case");
assert.equal(findAll(zy2ActiveCards[0], `${CARD}__state-active`).length, 0, "no \"État actuel\" text any more");

// Health: the thresholds and the permanent states share a row; the malus and the protections sit on the principal card only.
for (const card of zy2Cards) {
	const placed = only(card, `${CARD}__placed`, "the health blocks sit on one grid");
	assert.deepEqual(
		placed.children.slice(0, 2).map((child) => [child.classes.filter((name) => name.indexOf(`${CARD}__block-`) === 0)[0], child.classes.filter((name) => /__(col|row)-\d$/.test(name))]),
		[[`${CARD}__block-sante`, [`${CARD}__col-1`, `${CARD}__row-1`]], [`${CARD}__block-etats-permanents`, [`${CARD}__col-2`, `${CARD}__row-1`]]],
		"SP and État share the first row, as published",
	);
}
assert.equal(findAll(zy2Cards[1], `${CARD}__block-protections`).length, 0, "no protections on the small card");
assert.equal(findAll(zy2Cards[1], `${CARD}__block-malus`).length, 0, "no malus on the small card");

// The small card: health, then behaviour, under the one title "Comportement et santé", then the equipment.
const titlesOf = (card: El): string[] => findAll(card, `${CARD}__section-title`).map((title) => title.textContent);
assert.deepEqual(titlesOf(zy2Cards[1]).slice(-2), ["Comportement et santé", "Équipement"], "the small card ends on the joined section, then the equipment");
assert.ok(!titlesOf(zy2Cards[1]).some((title) => title === "Santé" || title.indexOf("Comportement") === 0 && title !== "Comportement et santé"), "the small card has no separate health or behaviour section");
assert.ok(titlesOf(zy2Cards[0]).indexOf("Santé") >= 0, "the large card keeps its health section");
assert.ok(titlesOf(zy2Cards[0]).some((title) => title.indexOf("Comportement") === 0), "the large card keeps its behaviour section");
assert.ok(titlesOf(zy2Cards[0]).indexOf("Comportement et santé") < 0, "the join applies on the small card only");
const joinedSection = only(zy2Cards[1], `${CARD}__section--joined`, "one joined section on the small card");
const joinedBlocks = findAll(joinedSection, `${CARD}__block`).map((box) => box.classes.filter((name) => name.indexOf(`${CARD}__block-`) === 0)[0]);
assert.ok(joinedBlocks.indexOf(`${CARD}__block-sante`) >= 0 && joinedBlocks.indexOf(`${CARD}__block-combat`) > joinedBlocks.indexOf(`${CARD}__block-sante`), "health comes before the behaviour in the joined section");
// The actions per round read like the other lines: a div, never a paragraph with the margins of the page.
assert.equal(only(zy2Cards[0], `${CARD}__combat-actions`, "one actions line").tagName, "div");

// Every form the published presentation names must be drawn by the renderer of its sheet. The list comes
// from the installed presentation, never from this file; the fallback is read on the rendered tree (the mark it
// leaves on each block), never on its warning, which a renderer gives once per form and per process.
type PublishedBlock = { id: string; form?: string };
interface SheetUnderGuard {
	sheet: string;
	presentation: { sections: ReadonlyArray<{ blocks: ReadonlyArray<PublishedBlock> }> };
	block: { parse: (source: string) => unknown; render: (data: never, doc: Document) => unknown };
	formClass: string;
	blockClass: string;
	plainClass: string;
}

function publishedBlocks(presentation: SheetUnderGuard["presentation"]): PublishedBlock[] {
	return presentation.sections.reduce<PublishedBlock[]>((all, section) => all.concat(section.blocks.filter((published) => published.form)), []);
}

function publishedForms(presentation: SheetUnderGuard["presentation"]): string[] {
	const forms: string[] = [];
	for (const published of publishedBlocks(presentation)) {
		if (published.form && forms.indexOf(published.form) < 0) forms.push(published.form);
	}
	return forms;
}

/** Renders the published examples of a sheet; returns the failures, the blocks an example fills and the forms none fills. */
function checkFormCoverage(guard: SheetUnderGuard, examples: ReadonlyArray<{ name: string; source: string }>): { problems: string[]; filledBlocks: string[]; unfilled: string[] } {
	const problems: string[] = [];
	const filledBlocks: string[] = [];
	const met = new Set<string>();
	for (const example of examples) {
		const data = guard.block.parse(example.source);
		if (!data) { problems.push(`${guard.sheet}: example ${example.name} does not parse`); continue; }
		const rendered = guard.block.render(data as never, doc) as El;
		for (const published of publishedBlocks(guard.presentation)) {
			const drawn = findAll(rendered, `${guard.blockClass}${published.id}`).filter((box) => box.classes.includes(`${guard.formClass}${published.form}`));
			if (drawn.length === 0) continue;
			met.add(published.form as string);
			if (filledBlocks.indexOf(published.id) < 0) filledBlocks.push(published.id);
			if (drawn.some((box) => box.classes.includes(guard.plainClass))) {
				problems.push(`${guard.sheet}: form "${published.form}" (block "${published.id}", met in ${example.name}) is published but has no dedicated rendering`);
			}
		}
	}
	return { problems, filledBlocks, unfilled: publishedForms(guard.presentation).filter((form) => !met.has(form)) };
}

function publishedExamples(directory: string): Array<{ name: string; source: string }> {
	const folder = join(sourceRoot as string, "examples", "adrenaline", directory);
	return readdirSync(folder).filter((file) => file.endsWith(".toml")).map((file) => ({ name: `${directory}/${file}`, source: readFileSync(join(folder, file), "utf8") }));
}

const PJ_ROOT = "brumes-adrenaline-pj";
const guards: Array<{ guard: SheetUnderGuard; directory: string }> = [
	{ guard: { sheet: "pj", presentation: PJ_PRESENTATION, block: adrenalinePjBlock as SheetUnderGuard["block"], formClass: `${PJ_ROOT}__form-`, blockClass: `${PJ_ROOT}__`, plainClass: `${PJ_ROOT}__block--plain` }, directory: "pj" },
	{ guard: { sheet: "pnj", presentation: PNJ_PRESENTATION, block: adrenalinePnjBlock as SheetUnderGuard["block"], formClass: `${CARD}__form-`, blockClass: `${CARD}__block-`, plainClass: `${CARD}__block--plain` }, directory: "pnj" },
	{ guard: { sheet: "monstre", presentation: MONSTRE_PRESENTATION, block: adrenalineMonsterBlock as SheetUnderGuard["block"], formClass: `${CARD}__form-`, blockClass: `${CARD}__block-`, plainClass: `${CARD}__block--plain` }, directory: "monstre" },
];
const coverageProblems: string[] = [];
const filledBySheet = new Map<string, string[]>();
for (const { guard, directory } of guards) {
	const examples = publishedExamples(directory);
	assert.ok(examples.length > 0, `${guard.sheet}: no published example to render`);
	const { problems, filledBlocks, unfilled } = checkFormCoverage(guard, examples);
	coverageProblems.push(...problems);
	filledBySheet.set(guard.sheet, filledBlocks);
	console.log(`${guard.sheet}: ${publishedForms(guard.presentation).length} published forms, ${examples.length} examples rendered`);
	for (const form of unfilled) console.log(`finding: ${guard.sheet}: published form "${form}" is filled by no published example (not proven)`);
}
assert.deepEqual(coverageProblems, [], "every published form must have a dedicated rendering");

// Negative proof, on the real case: each published block an example fills is given in turn a form its renderer
// does not know, as a later tarball would; the guard must fail every time, naming sheet, form and block. The
// renders above have already met every real form, so a guard relying on a once-only signal would pass here.
for (const { guard, directory } of guards) {
	const filledBlocks = filledBySheet.get(guard.sheet) ?? [];
	assert.ok(filledBlocks.length > 0, `${guard.sheet}: no published block is filled, the guard proves nothing`);
	const unknown = "form-published-later";
	for (const probe of publishedBlocks(guard.presentation)) {
		if (filledBlocks.indexOf(probe.id) < 0) continue;
		const real = probe.form;
		probe.form = unknown;
		try {
			const { problems } = checkFormCoverage(guard, publishedExamples(directory));
			assert.ok(
				problems.some((problem) => problem.startsWith(`${guard.sheet}: form "${unknown}" (block "${probe.id}"`)),
				`${guard.sheet}: block "${probe.id}" published with a form without rendering must fail the guard, naming the sheet, the form and the block (got ${JSON.stringify(problems)})`,
			);
		} finally {
			probe.form = real;
		}
	}
	console.log(`negative proof: ${guard.sheet}: ${filledBlocks.length} filled blocks, each fails the guard under an unknown form`);
}

// A real creature block of the Zombiology vault (actions entered in the base, a state without etatPrincipal):
// the large card prints "Agir" with each entered action, the small one prints nothing of it.
const rodeurSource = readFileSync(join("tools", "fixtures", "adrenaline-monstre-rodeur-accorde.md"), "utf8").match(/```adrenaline-monstre\r?\n([\s\S]*?)\r?\n```/)?.[1];
assert.ok(rodeurSource, "the real creature witness must be available");
const rodeur = adrenalineMonsterBlock.parse(rodeurSource);
assert.ok(rodeur, "the real creature witness must parse");
const rodeurCards = findAll(adrenalineMonsterBlock.render(rodeur, doc) as unknown as El, `${CARD}__state-card`);
assert.equal(rodeurCards.length, 2, "the real creature prints its principal and its secondary card");
const rodeurAgir = only(rodeurCards[0], `${CARD}__section-agir`, "the principal card prints one Agir section");
assert.match(textOf(rodeurAgir), /^Agir/, "the section is titled Agir");
const rodeurActions = findAll(rodeurAgir, `${CARD}__action`);
assert.equal(rodeurActions.length, 2, "Agir lists each entered action");
assert.match(textOf(rodeurActions[0]), /Dégoût zombie/);
assert.match(textOf(rodeurActions[1]), /Morsure/);
assert.equal(findAll(rodeurCards[1], `${CARD}__section-agir`).length, 0, "the small card prints no Agir section");
assert.equal(only(rodeurCards[1], `${CARD}__state-label`, "one state name").textContent, "Stimulé", "the one state besides the base is Stimulé");
assert.equal(only(rodeurCards[0], `${CARD}__state-label`, "one state name").textContent, "Non stimulé", "the base is the unstimulated one");

// A creature with no state besides its base: one card, which carries the equipment by the published fallback.
const single = adrenalineMonsterBlock.parse(`nom = "Rôdeur"\ninstinct = "Chasseur"\nactionsParRound = 2\ncomportement = ["Rôde."]\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n[sante.physique]\nsuperficiel.base = 6\n[equipement]\npossessions = ["Radio"]\n`);
assert.ok(single, "the single-card creature must parse");
const singleCards = findAll(adrenalineMonsterBlock.render(single, doc) as unknown as El, `${CARD}__state-card`);
assert.equal(singleCards.length, 1);
assert.match(textOf(only(singleCards[0], `${CARD}__section-equipement`, "the single card carries the equipment")), /Radio/);
assert.deepEqual(titlesOf(singleCards[0]).slice(-3), ["Santé", "Comportement (Chasseur)", "Équipement"], "the single card keeps health and behaviour apart, in published order, then the equipment");
assert.equal(findAll(singleCards[0], `${CARD}__section--joined`).length, 0);
assert.equal(checkOf(singleCards[0])[0].attributes["aria-checked"], "false", "a creature without a state has nothing to tick");

// The case of the current state, by what etatActif holds: absent or "base" is the base, a known id is that state,
// an unknown id is no state at all (nothing ticked, no card current, the id named in the log).
const currentCards = (cards: El[]): number[] => cards.reduce<number[]>((all, card, index) => (card.classes.includes(`${CARD}__state-card--active`) ? all.concat(index) : all), []);
const withActive = (id: string | undefined): El[] => {
	const parsed = adrenalineMonsterBlock.parse(id === undefined ? zy2Source : zy2Source.replace(/^etatPrincipal = .*$/m, (line) => `${line}\netatActif = "${id}"`));
	assert.ok(parsed, `Zy-2 with etatActif ${String(id)} must parse`);
	return findAll(adrenalineMonsterBlock.render(parsed, doc) as unknown as El, `${CARD}__state-card`);
};
const warnings: string[] = [];
const realWarn = console.warn;
log.setLevel("warn");
console.warn = (...args: unknown[]): void => { warnings.push(args.map(String).join(" ")); };
try {
	for (const [entered, ticked, current] of [[undefined, "false", [1]], ["base", "false", [1]], ["stimule", "true", [0]], ["inconnu-xyz", "false", []]] as const) {
		warnings.length = 0;
		const cards = withActive(entered);
		const box = checkOf(cards[0])[0];
		assert.equal(box.attributes["aria-checked"], ticked, `etatActif ${String(entered)}: the box is ${ticked}`);
		assert.deepEqual(currentCards(cards), current, `etatActif ${String(entered)}: the current card`);
		assert.equal(box.attributes.role, "checkbox", "the box keeps its role");
		assert.equal(box.attributes["aria-disabled"], "true", "the box is not editable");
		assert.equal(box.attributes["aria-label"], "État actuel");
		assert.equal(warnings.some((line) => line.indexOf("inconnu-xyz") >= 0), entered === "inconnu-xyz", "only an unknown etatActif is warned, naming the id");
	}

	// A creature without a state besides its base reports an unknown etatActif all the same.
	warnings.length = 0;
	const lone = adrenalineMonsterBlock.parse(`nom = "Rôdeur"\netatActif = "inconnu-xyz"\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n`);
	assert.ok(lone, "the single-card creature with an unknown etatActif must parse");
	const loneCards = findAll(adrenalineMonsterBlock.render(lone, doc) as unknown as El, `${CARD}__state-card`);
	assert.equal(checkOf(loneCards[0])[0].attributes["aria-checked"], "false", "nothing is ticked on the single card");
	assert.ok(warnings.some((line) => line.indexOf("inconnu-xyz") >= 0), "an unknown etatActif is warned on a single card too");

	// The contract refuses what it does not know on this sheet: the document is refused, and the log names the key.
	const refusal = (block: { parse: (source: string) => unknown }, source: string, key: string, why: string): void => {
		warnings.length = 0;
		assert.equal(block.parse(source), null, why);
		assert.ok(warnings.some((line) => line.indexOf(key) >= 0), `${why}: the log must name ${key} (got ${JSON.stringify(warnings)})`);
	};
	for (const key of ["log", "vol", "cha"]) {
		refusal(adrenalineMonsterBlock, zy2Source.replace("[caracteristiques]", `[caracteristiques]\n${key} = { minimum = 0, current = 20, maximum = 20 }`), `caracteristiques.${key}`, `${key} on a creature is refused`);
	}
	const mental = "\n[[equipement.armesMentales]]\nnom = \"Arme sociale\"\ndesDeDegats = 1\ntype = \"Sociale\"\n";
	refusal(adrenalineMonsterBlock, `nom = "Rôdeur"\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n${mental}`, "equipement.armesMentales", "armesMentales on a creature is refused");
	const npcSource = readFileSync(join(sourceRoot, "examples", "adrenaline", "pnj", "agent-de-securite.toml"), "utf8");
	refusal(adrenalinePnjBlock, npcSource + mental, "equipement.armesMentales", "armesMentales on a PNJ is refused");
	assert.ok(adrenalinePjBlock.parse(readFileSync(join(sourceRoot, "examples", "adrenaline", "pj", "survivante-complete.toml"), "utf8")), "the PJ keeps armesMentales");
	refusal(adrenalineMonsterBlock, `${zy2Source}\n[[etats]]\nid = "autre"\nnom = "Autre"\n`, "etats", "two entries in etats are refused");
	// A merely unknown key keeps the old behaviour: warned, dropped, the document stays.
	warnings.length = 0;
	assert.ok(adrenalineMonsterBlock.parse(`nom = "Rôdeur"\nclefInconnue = 1\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n`), "an unknown key does not refuse the document");
	assert.ok(warnings.some((line) => line.indexOf("clefInconnue") >= 0), "an unknown key is warned");
} finally {
	console.warn = realWarn;
	log.setLevel("error");
}

// The PNJ prints its eight characteristics on the grid, in the order of the sheet.
const npcGrid = only(npcCard, `${CARD}__block-caracteristiques`, "one characteristics block on the PNJ card");
assert.deepEqual(
	findAll(npcGrid, `${CARD}__cell`).map((cell) => textOf(cell).split(" ")[0]),
	["FOR", "CON", "DEX", "RAP", "LOG", "VOL", "PER", "CHA"],
	"the PNJ characteristics grid keeps its eight cells",
);
assert.match(textOf(npcGrid), /FOR\s+50 %/, "a characteristic prints its entered score");

// The small card exists by the published rule (existsWhenAny: /etats or /etatAlternatif), never by a local test.
const secondaryRule = (MONSTRE_PRESENTATION.cards ?? []).filter((published) => published.existsWhenAny);
assert.equal(secondaryRule.length, 1, "the creature presentation conditions one card");
assert.equal(singleCards.length, 1, "no etats, no etatAlternatif: the conditioned card does not exist");
assert.equal(zy2Cards.length, 2, "etats: the conditioned card exists");
assert.equal(richCards.length, 2, "etatAlternatif: the conditioned card exists");
// An alternate state entered empty is no value at the published pointer: the conditioned card is not printed.
const emptyAlternate = adrenalineMonsterBlock.parse(`nom = "Rôdeur"
[caracteristiques]
for = 40
con = 40
dex = 30
rap = 30
[etatAlternatif]
`);
assert.ok(emptyAlternate, "a creature with an empty alternate state must parse");
assert.equal(findAll(adrenalineMonsterBlock.render(emptyAlternate, doc) as unknown as El, `${CARD}__state-card`).length, 1, "an empty value at the published pointer leaves the card out");
// The blocks name their cards: the protections sit on the principal card only, even when the small card exists.
const protectedCreature = adrenalineMonsterBlock.parse(readFileSync(join(sourceRoot, "examples", "adrenaline", "monstre", "infecte-rodeur.toml"), "utf8"));
assert.ok(protectedCreature, "the creature example with protections must parse");
const protectedCards = findAll(adrenalineMonsterBlock.render(protectedCreature, doc) as unknown as El, `${CARD}__state-card`);
assert.equal(protectedCards.length, 2, "the example enters a state, so it prints two cards");
assert.equal(findAll(protectedCards[0], `${CARD}__block-protections`).length, 1, "the principal card prints the protections");
assert.equal(findAll(protectedCards[1], `${CARD}__block-protections`).length, 0, "the small card prints none");

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
assert.match(scss, /color: var\(--adrenaline-card-ink/, "the card text takes its colour from the pack token");
assert.doesNotMatch(readFileSync(join("src", "styles", "adrenaline", "_monstre.scss"), "utf8"), /grid-template-columns: minmax\(0, 3fr\)/, "the state cards stack");
assert.match(scss, /brumes-adrenaline-pj__columns-3[^}]*grid-template-columns:\s*repeat\(3/);
assert.match(scss, /@container \(max-width: 420px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.match(scss, /\.brumes-adrenaline-pnj[,\s][^{]*\{[^}]*max-width:\s*36rem/);
assert.match(scss, /\.brumes-adrenaline-monstre[,\s][^{]*\{[^}]*max-width:\s*36rem/);
// Layout only: the banner, the badges and the triggers take their colours from the pack.
for (const token of ["banner-garnet", "banner-blue", "banner-orange", "banner-ink", "trigger-bg", "trigger-ink", "dice-badge-bg", "dice-badge-ink", "card-badge"]) {
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
