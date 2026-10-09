import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { adrenalinePnjBlock } from "../src/features/adrenalinePnj/block";
import { adrenalineMonsterBlock } from "../src/features/adrenalineMonstre/block";
import { ADRENALINE_VISUAL_CALLOUTS } from "schema-adrenaline/presentation";
import { loadAdrenalineContractCases } from "./adrenalineContractCorpus.mts";

// 1. The content partial exists and is wired into the Adrenaline index.
const stylesDir = join("src", "styles", "adrenaline");
const indexScss = readFileSync(join(stylesDir, "index.scss"), "utf8");
assert.match(indexScss, /@use "\.\/content";/, "index.scss must import the content partial");
assert.match(indexScss, /@include content\.content;/, "index.scss must include the content mixin");

const scssFiles = readdirSync(stylesDir).filter((file) => file.endsWith(".scss"));
const scssByFile = new Map(
	scssFiles.map((file) => [file, readFileSync(join(stylesDir, file), "utf8")]),
);
const scss = [...scssByFile.values()].join("\n");

// The host must stay a pure consumer of pack tokens: no colour literal.
assert.doesNotMatch(scss, /#[0-9a-f]{3,8}/i, "host SCSS must not hardcode a colour");
assert.doesNotMatch(
	scss,
	/(?:^|[\s:(])(black|white|red|yellow)(?:[\s;,)])/i,
	"host SCSS must not name a Zombiology colour directly",
);
const pj = scssByFile.get("_pj.scss") ?? "";
const pnj = scssByFile.get("_pnj.scss") ?? "";
const monstre = scssByFile.get("_monstre.scss") ?? "";
assert.match(pj, /brumes-adrenaline-pj__columns-3[^}]*grid-template-columns:\s*repeat\(3/, "PJ must use the published three-column layout");
assert.match(pj, /@container \(max-width: 420px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/, "PJ must stack the sheet in a narrow note");
assert.match(pj, /overflow-wrap:\s*anywhere/, "PJ must wrap long values instead of overflowing");
assert.match(pj, /\.brumes-adrenaline-pj__block\s*\{[^}]*min-width:\s*0/, "PJ blocks must not impose a competing minimum width");
assert.match(pj, /--values-handwritten \.brumes-adrenaline-pj__value\s*\{[^}]*Adrenaline Handwriting[^}]*\}/, "PJ values must use the published handwritten font");
assert.match(pj, /--values-handwritten \.brumes-adrenaline-pj__value\s*\{[^}]*--adrenaline-handwritten-ink/, "PJ values must use the handwritten ink token");
assert.match(pj, /--surface-paper-sheet::before\s*\{[^}]*--adrenaline-page-texture/, "PJ paper sheet must lay the pack's paper grain");
assert.match(pj, /grid-template-areas:\s*"nom brand params"/, "PJ cartouche must keep name, mark and parameters side by side");
assert.match(pj, /writing-mode:\s*vertical-rl/, "PJ malus and state cards must carry a vertical label");
assert.match(pj, /--adrenaline-fatigue\)/, "PJ fatigue track must read the fatigue token");
assert.match(pj, /--adrenaline-condition-border\)/, "PJ state cards must read the condition token");
assert.match(pj, /@container \(max-width: 600px\)/, "PJ must fold to two columns in a medium note");
assert.match(pnj, /brumes-adrenaline-pnj--description/, "PNJ must keep a dedicated narrative treatment");
assert.match(monstre, /brumes-adrenaline-monstre--cards/, "the creature's state cards must have their own layout");
// The PNJ and monster sheets share their card (`_short-sheet.scss`).
const shortSheet = scssByFile.get("_short-sheet.scss") ?? "";
assert.match(
	shortSheet,
	/\.brumes-adrenaline-card__section\s*\{[^}]*min-width:\s*0/,
	"compact card sections must not impose a competing minimum width",
);
assert.match(monstre, /\.brumes-adrenaline-card__state-card\s*\{[^}]*min-width:\s*0/, "state cards must not impose a minimum width");
for (const [sheet, label] of [["pnj", "PNJ"], ["monstre", "monster"]] as const) {
	const card = new RegExp(String.raw`\.brumes-adrenaline-${sheet}[,\s][^{]*\{[^}]*overflow-wrap:\s*anywhere`);
	assert.match(shortSheet, card, `${label} must wrap long values instead of overflowing`);
	const mobile = new RegExp(String.raw`@media \(max-width: 520px\)[^}]*\.brumes-adrenaline-${sheet}[,\s][^{]*\{[^}]*max-width:\s*100%`);
	assert.match(shortSheet, mobile, `${label} must fill, not exceed, the mobile reading width`);
}

// 2. Task 1 acceptance criteria, revised by schema-adrenaline#40: plain h3,
// h4 rule, h5, italics, lists, tables, statuses, inline keyword and results.
const content = scssByFile.get("_content.scss") ?? "";
assert.match(content, /var\(--h3-color, inherit\)/, "h3 must fall back to the plain heading colour");
// h3 sits over a thin rule and carries no band, grey or garnet.
assert.doesNotMatch(content, /--adrenaline-band/, "h3 never takes the garnet band of the callouts");
assert.doesNotMatch(content, /--adrenaline-h3-band/, "h3 carries no band");
assert.match(content, /--adrenaline-h3-rule/, "h3 must read its rule token");
assert.match(content, /--h3-font/, "h3 must read its face from the pack");
assert.match(content, /--adrenaline-inline-code-color/, "inline code must read its colour token");
const page = scssByFile.get("_page.scss") ?? "";
assert.doesNotMatch(page, /--adrenaline-cartouche/, "h1 carries no cartouche: the scenario booklet prints it in ink");
assert.match(page, /--adrenaline-h2-rule/, "h2 must read its rule token");
assert.match(page, /\.HyperMD-header-1,/, "h1 must be styled in Live Preview too");
assert.match(page, /\.HyperMD-header-2,/, "h2 must be styled in Live Preview too");
assert.doesNotMatch(content, /--adrenaline-h4-rule/, "h4 carries no rule");
for (const token of ["--adrenaline-h1-surface", "--adrenaline-h1-frieze", "--adrenaline-h1-rule"]) {
	assert.ok(page.indexOf(token) !== -1, `h1 must read ${token}`);
}
assert.match(content, /--h5-color/, "h5 must read its colour token");
assert.match(content, /\.adrenaline-keyword/, "the inline keyword must be styled");
assert.match(content, /mark\.adrenaline-result-success/, "a success result mark must be styled");
assert.match(content, /mark\.adrenaline-result-failure/, "a failure result mark must be styled");
assert.match(content, /--h4-color/, "h4 must read its colour token");
assert.match(content, /--h4-decoration/, "h4 must read its underline/rule token");
assert.match(content, /--adrenaline-emphasis-color/, "italics must read the emphasis colour token");
assert.match(content, /:is\(em, i, \.cm-em\)/, "italics must apply in both reading view and Live Preview");
assert.match(content, /--adrenaline-list-marker-glyph/, "lists must read the marker glyph token");
assert.match(content, /--list-marker-color/, "lists must read the marker colour token");
// The glyph replaces bullets only: an ordered list keeps its numbers.
assert.doesNotMatch(content, /(?:^|[\s,>+~])ol\b[^{]*::marker/, "ordered lists must keep their native numbers");
assert.doesNotMatch(content, /list-style(?:-type)?:\s*none/, "no list may lose its marker outright");
assert.match(content, /--adrenaline-table-border/, "tables must read the border token");
assert.match(content, /--adrenaline-table-header-bg/, "tables must read the header band token");
assert.match(content, /--adrenaline-table-stripe/, "tables must read the row stripe token");
assert.match(content, /mark\.adrenaline-status-yellow/, "a yellow status mark must be styled");
assert.match(content, /mark\.adrenaline-status-red/, "a red status mark must be styled");
assert.match(content, /--adrenaline-status-yellow-bg/, "yellow status must read its background token");
assert.match(content, /--adrenaline-status-red-bg/, "red status must read its background token");

// 3. Task 1.3: four distinct callout anatomies.
const callouts = scssByFile.get("_callouts.scss") ?? "";
assert.match(
	callouts,
	/\[data-callout="note"\][^{]*\{[^}]*\}/s,
	"note must carry its own pinned/paper rule",
);
assert.match(
	callouts,
	/\[data-brumes-callout-style="adrenaline-exemple"\][^{]*\{[^}]*border-block:[^;]*dotted/s,
	"exemple (alias example) must use dotted rules above and below",
);
assert.match(callouts, /\[data-callout="note"\][^{]*\{[^}]*--adrenaline-note-surface/s, "note must be the handwritten sheet of the pack");
assert.match(callouts, /\[data-callout="tip"\][^{]*\{[^}]*--adrenaline-callout-tip/s, "tip must be the peach card of the pack");
assert.match(callouts, /\[data-callout="info"\]/, "info must take the action card");
for (const id of ["adrenaline-exemple", "adrenaline-description", "adrenaline-encart", "adrenaline-formation", "adrenaline-action", "adrenaline-roller", "adrenaline-mention"]) {
	assert.ok(callouts.includes(`[data-brumes-callout-style="${id}"]`), `${id} must carry its booklet anatomy`);
}
assert.match(
	callouts,
	/\[data-brumes-callout-style="adrenaline-mention"\][^{]*\{[^}]*--callout-icon:\s*var\(--adrenaline-mention-icon/s,
	"mention must take its icon from the pack",
);
// Every callout the pack publishes must be styled by the host.
for (const entry of ADRENALINE_VISUAL_CALLOUTS) {
	assert.ok(
		callouts.includes(`[data-callout="${entry.id}"]`) || callouts.includes(`[data-brumes-callout-style="${entry.id}"]`),
		`the published callout ${entry.id} must have a rule in the host`,
	);
}
assert.match(callouts, /\[data-callout-metadata~="fond"\]/, "formation must honour the fond modifier");
assert.match(
	callouts,
	/\[data-callout="question"\][^{]*\{[^}]*border-inline-start/s,
	"question must use a rule panel, not a filled card",
);
assert.match(
	callouts,
	/adrenaline-callout-cartouche-bg/,
	"warning/danger must reuse the dark cartouche band for the title",
);

// 4. Task 2.1/2.2: the PNJ narrative zone renders the description apart from
// the other narrative fields, and a minimal PNJ shows no empty panel.
class El {
	tagName: string;
	children: El[] = [];
	textContent = "";
	dataset: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(tagName: string) {
		this.tagName = tagName;
	}
	appendChild(child: El): El {
		this.children.push(child);
		return child;
	}
}
const doc = { createElement: (tagName: string) => new El(tagName) } as unknown as Document;

const witness = loadAdrenalineContractCases().find(
	(entry) => entry.target === "pnj" && entry.format === "toml" && entry.expect === "accept",
)?.source;
assert.ok(witness, "a canonical PNJ TOML case must be available");
const parsed = adrenalinePnjBlock.parse(witness);
assert.ok(parsed, "adrenaline-pnj witness must parse");
const rendered = adrenalinePnjBlock.render(parsed, doc) as unknown as El;
const narrativeSection = rendered.children.find((child) => child.classes.includes("brumes-adrenaline-pnj--description"));
assert.ok(narrativeSection, "the description must render in its own section");
const description = narrativeSection!.children[0]?.children[0];
assert.equal(description!.tagName, "p", "the description must be its own paragraph, not a bullet");
assert.equal(description!.textContent, parsed.description, "the description text must render verbatim");

const minimal = adrenalinePnjBlock.parse('nom = "Silhouette"\n');
assert.ok(minimal, "a name-only PNJ must still parse");
const minimalRendered = adrenalinePnjBlock.render(minimal, doc) as unknown as El;
// The booklet always prints the three malus tracks; nothing else is drawn empty.
assert.deepEqual(
	minimalRendered.children.map((child) => child.classes.filter((name) => name.startsWith("brumes-adrenaline-pnj--"))[0]),
	["brumes-adrenaline-pnj--entete", "brumes-adrenaline-pnj--sante"],
	"a minimal PNJ must render its banner and its malus tracks, no empty panel",
);
assert.deepEqual(
	minimalRendered.children[1]!.children.slice(1).map((child) => child.classes.includes("brumes-adrenaline-card__form-malus-tracks")),
	[true],
	"the minimal health section holds the tracks alone",
);

const groupedMonster = adrenalineMonsterBlock.parse(`nom = "Rôdeur"\ntraitsSpeciaux = ["Traque"]\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n`);
assert.ok(groupedMonster, "a grouped monster must parse");
const groupedRendered = adrenalineMonsterBlock.render(groupedMonster, doc) as unknown as El;
const meneur = groupedRendered.children.filter((child) => child.classes.includes("brumes-adrenaline-monstre--meneur"));
assert.equal(meneur.length, 1, "a monster's traits must render in the game-master section");
assert.equal(meneur[0]!.tagName, "details", "the game-master section folds");
assert.equal(meneur[0]!.children[0]!.textContent, "Meneur", "the folded section must be labelled");
assert.match(JSON.stringify(meneur[0]), /Traque/);

console.log("Adrenaline Zombiology style assertions passed.");
