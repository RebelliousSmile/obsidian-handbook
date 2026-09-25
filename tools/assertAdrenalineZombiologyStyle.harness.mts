import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { adrenalinePnjBlock } from "../src/features/adrenalinePnj/block";
import { adrenalineMonsterBlock } from "../src/features/adrenalineMonstre/block";
import { adrenalinePjBlock } from "../src/features/adrenalinePj/block";
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
assert.match(pj, /formation-columns[\s\S]*?grid-template-columns:\s*repeat\(3/, "PJ must use three formation columns");
assert.match(pj, /@media \(max-width: 700px\)/, "PJ must stack sheet sections on narrow screens");
assert.match(pj, /overflow-wrap:\s*anywhere/, "PJ must wrap long values instead of overflowing");
assert.match(pj, /brumes-adrenaline-pj--name-card/, "PJ must have a dedicated name card");
assert.match(pj, /brumes-adrenaline-pj--fatigue-circle/, "PJ must have fatigue circles");
assert.match(pnj, /brumes-adrenaline-pnj--description/, "PNJ must keep a dedicated narrative treatment");
assert.match(pnj, /overflow-wrap:\s*anywhere/, "PNJ must wrap long values instead of overflowing");
assert.match(pnj, /brumes-adrenaline-pnj--formations-competences/, "PNJ must retain formations and competences");
assert.match(pnj, /@media \(max-width: 520px\)[\s\S]*?max-width:\s*100%/, "PNJ must fill, not exceed, the mobile reading width");
assert.match(monstre, /brumes-adrenaline-monstre--capacites-etats/, "monster capabilities must remain visually grouped");
assert.match(monstre, /overflow-wrap:\s*anywhere/, "monster must wrap long values instead of overflowing");
assert.match(monstre, /brumes-adrenaline-monstre--detection-deplacement/, "monster mobility must have its own section");
assert.match(monstre, /@media \(max-width: 520px\)[\s\S]*?max-width:\s*100%/, "monster must fill, not exceed, the mobile reading width");

// 2. Task 1 acceptance criteria: h3 cartouche, h4 red rule, italics, lists, tables, statuses.
const content = scssByFile.get("_content.scss") ?? "";
assert.match(content, /--adrenaline-band-ink/, "h3 must read the dark cartouche ink token");
assert.match(content, /--adrenaline-band[^-]/, "h3 must read the dark cartouche background token");
assert.match(content, /var\(--h3-color, inherit\)/, "h3 must fall back to the plain heading colour");
assert.match(content, /--h4-color/, "h4 must read its colour token");
assert.match(content, /--h4-decoration/, "h4 must read its underline/rule token");
assert.match(content, /--adrenaline-emphasis-color/, "italics must read the emphasis colour token");
assert.match(content, /:is\(em, i, \.cm-em\)/, "italics must apply in both reading view and Live Preview");
assert.match(content, /--adrenaline-list-marker-glyph/, "lists must read the marker glyph token");
assert.match(content, /--list-marker-color/, "lists must read the marker colour token");
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
	/\[data-callout="example"\][^{]*\{[^}]*border-style:\s*dashed/s,
	"example must use a dashed frame",
);
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
	classes: string[] = [];
	dataset: Record<string, string> = {};
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
const narrativeSection = rendered.children.find((child) => child.classes.includes("brumes-adrenaline-pnj--presentation"));
assert.ok(narrativeSection, "the description must render inside the narrative panel");
const description = narrativeSection!.children.flatMap((child) => child.children).find((child) => child.classes.includes("brumes-adrenaline-pnj--description"));
assert.equal(description!.tagName, "p", "the description must be its own paragraph, not a bullet");
assert.equal(description!.textContent, parsed.description, "the description text must render verbatim");

const minimal = adrenalinePnjBlock.parse('nom = "Silhouette"\n');
assert.ok(minimal, "a name-only PNJ must still parse");
const minimalRendered = adrenalinePnjBlock.render(minimal, doc) as unknown as El;
assert.equal(minimalRendered.children.length, 1, "a minimal PNJ must render only its header, no empty panel");
assert.equal(minimalRendered.children[0]!.tagName, "header");

const parsedPj = adrenalinePjBlock.parse(`nom = "Naïma Berthier"
[caracteristiques]
for = 30
con = 40
dex = 50
rap = 40
log = 30
vol = 40
per = 50
cha = 30
[sante.physique.superficiel]
base = 6
[sante.physique.leger]
base = 13
[sante.physique.grave]
base = 18
[sante.physique.profond]
base = 23
[sante.mental.superficiel]
base = 5
[sante.mental.leger]
base = 12
[sante.mental.grave]
base = 17
[sante.mental.profond]
base = 22
[protections.physiques]
solidite = 6
[protections.mentales]
solidite = 5
`);
assert.ok(parsedPj, "a scalar TOML PJ must parse without rewriting the note");
const pjRendered = adrenalinePjBlock.render(parsedPj, doc) as unknown as El;
assert.deepEqual(pjRendered.children.map((child) => child.classes.find((name) => name.startsWith("brumes-adrenaline-pj--"))), [
	"brumes-adrenaline-pj--entete", "brumes-adrenaline-pj--competence", "brumes-adrenaline-pj--profil", "brumes-adrenaline-pj--equipement", "brumes-adrenaline-pj--sante",
], "PJ sections must follow the provider order");
function descendants(element: El): El[] {
	return [element, ...element.children.flatMap(descendants)];
}
assert.equal(descendants(pjRendered).filter((element) => element.classes.includes("brumes-adrenaline-pj--fatigue-circle")).length, 10, "absent fatigue must show ten empty circles");
assert.equal(descendants(pjRendered).filter((element) => element.classes.includes("is-marked")).length, 0, "absent fatigue must not invent a checked circle");
assert.ok(descendants(pjRendered).some((element) => element.textContent === "Naïma Berthier"), "name card must retain the source value");
assert.ok(!descendants(pjRendered).some((element) => /MAX|maximum/i.test(element.textContent)), "editor bounds must stay off the sheet");

const groupedMonster = adrenalineMonsterBlock.parse(`nom = "Rôdeur"\ntraitsSpeciaux = ["Traque"]\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n`);
assert.ok(groupedMonster, "a grouped monster must parse");
const groupedRendered = adrenalineMonsterBlock.render(groupedMonster, doc) as unknown as El;
const capabilitySection = groupedRendered.children.find((child) => child.classes.includes("brumes-adrenaline-monstre--capacites-etats"));
assert.ok(capabilitySection, "a monster must render a populated capability section");
assert.ok(capabilitySection!.children.some((child) => child.classes.includes("brumes-adrenaline--block-traits")), "the traits must be in the provider-declared block");

// Optional local journey: read the existing vault note verbatim, never rewrite it.
const vaultIndex = process.argv.indexOf("--vault");
if (vaultIndex !== -1) {
	const vault = process.argv[vaultIndex + 1];
	assert.ok(vault, "--vault needs a directory");
	const noteName = readdirSync(vault).find((name) => name.startsWith("Test Handbook") && name.endsWith("Adrenaline.md"));
	assert.ok(noteName, "the real Adrenaline test note must exist in the vault");
	const markdown = readFileSync(join(vault, noteName), "utf8");
	const sourceBlocks = [...markdown.matchAll(/```(adrenaline-pj|adrenaline-pnj|adrenaline-monstre)\r?\n([\s\S]*?)```/g)];
	assert.deepEqual(sourceBlocks.map((match) => match[1]), ["adrenaline-pj", "adrenaline-pnj", "adrenaline-monstre"]);
	const blocks = [adrenalinePjBlock, adrenalinePnjBlock, adrenalineMonsterBlock];
	for (const [index, block] of blocks.entries()) {
		const parsedNote = block.parse(sourceBlocks[index]![2]!);
		assert.ok(parsedNote, `${block.id} from the real note must parse`);
		const sheet = block.render(parsedNote, doc) as unknown as El;
		assert.ok(sheet.children.length >= 5, `${block.id} must render its provider sections`);
		assert.ok(!descendants(sheet).some((element) => /\b(?:MIN|MAX)\b|maximum/i.test(element.textContent)), `${block.id} must not print editor bounds`);
	}
}

console.log("Adrenaline Zombiology style assertions passed.");
