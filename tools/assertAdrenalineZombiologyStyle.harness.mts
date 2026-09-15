import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { adrenalinePnjBlock } from "../src/features/adrenalinePnj/block";
import { adrenalineMonsterBlock } from "../src/features/adrenalineMonstre/block";
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
assert.match(pj, /grid-template-areas:[\s\S]*?"formations competences"/, "PJ must retain its two-column consultation layout");
assert.match(pj, /@media \(max-width: 520px\)[\s\S]*?"formations"[\s\S]*?"competences"/, "PJ must stack consultation zones on mobile");
assert.match(pj, /overflow-wrap:\s*anywhere/, "PJ must wrap long values instead of overflowing");
assert.match(pj, /\.brumes-adrenaline-pj--panel\s*\{[\s\S]*?min-width:\s*0/, "PJ panels must not impose a competing minimum width");
assert.match(pnj, /brumes-adrenaline-pnj--description/, "PNJ must keep a dedicated narrative treatment");
assert.match(pnj, /overflow-wrap:\s*anywhere/, "PNJ must wrap long values instead of overflowing");
assert.match(pnj, /\.brumes-adrenaline-pnj--panel\s*\{[\s\S]*?min-width:\s*0/, "PNJ panels must not impose a competing minimum width");
assert.match(pnj, /@media \(max-width: 520px\)[\s\S]*?max-width:\s*100%/, "PNJ must fill, not exceed, the mobile reading width");
assert.match(monstre, /brumes-adrenaline-monstre--capability-group/, "monster capabilities must remain visually grouped");
assert.match(monstre, /overflow-wrap:\s*anywhere/, "monster must wrap long values instead of overflowing");
assert.match(monstre, /\.brumes-adrenaline-monstre--panel\s*\{[\s\S]*?min-width:\s*0/, "monster panels must not impose a competing minimum width");
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
const narrativeSection = rendered.children.find((child) =>
	child.classes.includes("brumes-adrenaline-pnj--panel") &&
	child.children.some((grandChild) => grandChild.classes.includes("brumes-adrenaline-pnj--description")),
);
assert.ok(narrativeSection, "the description must render inside the narrative panel");
const description = narrativeSection!.children.find((child) =>
	child.classes.includes("brumes-adrenaline-pnj--description"),
);
assert.equal(description!.tagName, "p", "the description must be its own paragraph, not a bullet");
assert.equal(description!.textContent, parsed.description, "the description text must render verbatim");

const minimal = adrenalinePnjBlock.parse('nom = "Silhouette"\n');
assert.ok(minimal, "a name-only PNJ must still parse");
const minimalRendered = adrenalinePnjBlock.render(minimal, doc) as unknown as El;
assert.equal(minimalRendered.children.length, 1, "a minimal PNJ must render only its header, no empty panel");
assert.equal(minimalRendered.children[0]!.tagName, "header");

const groupedMonster = adrenalineMonsterBlock.parse(`nom = "Rôdeur"\ntraitsSpeciaux = ["Traque"]\n[caracteristiques]\nfor = 40\ncon = 40\ndex = 30\nrap = 30\n`);
assert.ok(groupedMonster, "a grouped monster must parse");
const groupedRendered = adrenalineMonsterBlock.render(groupedMonster, doc) as unknown as El;
const groups = groupedRendered.children
	.flatMap((child) => child.children)
	.filter((child) => child.classes.includes("brumes-adrenaline-monstre--capability-group"));
assert.equal(groups.length, 1, "a monster must render only its populated capability group");
assert.equal(groups[0]!.children[0]!.textContent, "Traits", "the populated group must be labelled");

console.log("Adrenaline Zombiology style assertions passed.");
