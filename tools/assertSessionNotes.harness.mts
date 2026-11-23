import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OTHERSCAPE_CHARACTER_PAGES } from "schema-in-the-mist";
import { getPbtaPlaybookPages } from "schema-pbta";
import { PJ_PRESENTATION, type AdrenalinePresentationPage } from "schema-adrenaline/presentation";
import { documentToPj } from "../src/features/adrenalinePj/schema";
import { renderAdrenalinePj } from "../src/features/adrenalinePj/renderer";
import { SESSION_NOTES_CLASS } from "../src/features/blocks/sessionNotes";
import { parseOsCharacterDocument, osCharacterToToml } from "../src/features/osCharacter/schema";
import { renderOsCharacter } from "../src/features/osCharacter/renderer";
import { pbtaPlaybookBlock } from "../src/features/pbta/block";
import { parsePbtaPlaybookToml } from "../src/features/pbta/specializedPlaybooks";

/*
 * The notes page of a sheet: drawn after the sheet from the field the pack publishes, with the label
 * the pack publishes; a blank or absent text draws nothing; City of Mist and Legend in the Mist never
 * draw it. The sources are the witnesses the producers publish, so a field renamed upstream fails here.
 */
class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	classes: string[] = [];
	attributes: Record<string, string> = {};
	style = { setProperty: (_name: string, _value: string) => undefined };
	classList = { add: (...names: string[]) => { for (const name of names) this.classes.push(name); } };
	checked = false;
	disabled = false;
	type = "";
	src = "";
	alt = "";
	constructor(readonly tagName: string) {}
	setAttribute(name: string, value: string): void { this.attributes[name] = value; }
	appendChild(child: El): El { this.children.push(child); return child; }
	walk(): El[] { return [this, ...this.children.reduce<El[]>((all, child) => all.concat(child.walk()), [])]; }
}
const doc = { createElement: (tagName: string) => new El(tagName) } as unknown as Document;

const notesOf = (root: unknown): El[] => (root as El).walk().filter((node) => node.classes.indexOf(SESSION_NOTES_CLASS) >= 0);
const textOf = (node: El): string => node.children.find((child) => child.classes.indexOf(`${SESSION_NOTES_CLASS}--text`) >= 0)?.textContent ?? "";
const titleOf = (node: El): string => node.children.find((child) => child.classes.indexOf(`${SESSION_NOTES_CLASS}--title`) >= 0)?.textContent ?? "";

/** The page is the last thing the sheet draws, and it is drawn once. */
function assertNotesLast(root: unknown, label: string, text: string, what: string): void {
	const notes = notesOf(root);
	assert.equal(notes.length, 1, `${what}: the notes page is drawn once`);
	assert.equal(titleOf(notes[0]), label, `${what}: the notes page carries the published label`);
	assert.equal(textOf(notes[0]), text, `${what}: the notes page carries the text as typed`);
	const children = (root as El).children;
	assert.equal(children[children.length - 1], notes[0], `${what}: the notes page comes last`);
}

/* Adrenaline player character: its game notes are a block of the identity section, not a page after the sheet. */
const pjBlock = PJ_PRESENTATION.sections.reduce<{ id: string; label: string; section: string } | undefined>((found, section) => found ?? section.blocks.filter((block) => block.paths.indexOf("/notesDePartie") >= 0).map((block) => ({ id: block.id, label: block.label, section: section.id }))[0], undefined);
assert.ok(pjBlock, "the Adrenaline contract publishes the game notes as a block of a section");
assert.equal((PJ_PRESENTATION.pages as readonly AdrenalinePresentationPage[]).filter((page) => page.notesPath).length, 0, "the Adrenaline contract publishes no separate notes page");
const pjWitness = JSON.parse(readFileSync("node_modules/schema-adrenaline/corpus/temoins/pj/temoin.json", "utf8")) as Record<string, unknown>;
const pjText = String(pjWitness.notesDePartie ?? "");
assert.ok(pjText.trim() !== "", "the Adrenaline witness carries session notes");
const pj = documentToPj(pjWitness);
assert.ok(pj, "the Adrenaline witness is read");
const pjBlocksOf = (root: unknown): El[] => (root as El).walk().filter((node) => node.classes.indexOf(`brumes-adrenaline-pj__${pjBlock.id}`) >= 0);
const pjSheet = renderAdrenalinePj(pj, doc);
const pjNotes = pjBlocksOf(pjSheet);
assert.equal(pjNotes.length, 1, "adrenaline-pj: the game notes are drawn once");
assert.equal(notesOf(pjSheet).length, 0, "adrenaline-pj: no notes page follows the sheet");
assert.ok(pjNotes[0].walk().some((node) => node.textContent === pjText), "adrenaline-pj: the notes carry the text as typed");
const pjSection = (pjSheet as El).walk().find((node) => node.classes.indexOf(`brumes-adrenaline-pj--${pjBlock.section}`) >= 0);
assert.ok(pjSection && pjSection.walk().indexOf(pjNotes[0]) >= 0, "adrenaline-pj: the notes sit in the section the contract publishes");
for (const blank of [undefined, "", "  \n "]) {
	// An absent field is a missing key: the contract types it as a string, so `undefined` is not a value.
	const { notesDePartie: _typed, ...withoutNotes } = pjWitness;
	const emptied = documentToPj(blank === undefined ? withoutNotes : { ...withoutNotes, notesDePartie: blank });
	assert.ok(emptied, `adrenaline-pj: a sheet with notes ${JSON.stringify(blank)} is still read`);
	assert.equal(pjBlocksOf(renderAdrenalinePj(emptied, doc)).length, 0, `adrenaline-pj: notes ${JSON.stringify(blank)} draw nothing`);
}

/* Otherscape character. */
const osNotes = OTHERSCAPE_CHARACTER_PAGES.find((page) => "notes_field" in page);
assert.ok(osNotes, "the Otherscape contract publishes a notes page");
assert.equal(("notes_field" in osNotes ? osNotes.notes_field : ""), "session_notes", "the Otherscape notes field is the one the sheet reads");
const osSource = readFileSync("node_modules/schema-in-the-mist/corpus/contract/valid/otherscape--character-session-notes.toml", "utf8");
const os = parseOsCharacterDocument(osSource);
assert.ok(os?.sessionNotes, "the Otherscape witness carries session notes");
assertNotesLast(renderOsCharacter(os, doc), osNotes.label.fr, os.sessionNotes, "os-character");
const osAgain = parseOsCharacterDocument(osCharacterToToml(os));
assert.equal(osAgain?.sessionNotes, os.sessionNotes, "os-character: the notes survive a copy to TOML");
assert.equal(notesOf(renderOsCharacter({ ...os, sessionNotes: undefined }, doc)).length, 0, "os-character: absent notes draw nothing");
assert.equal(notesOf(renderOsCharacter({ ...os, sessionNotes: " \n" }, doc)).length, 0, "os-character: blank notes draw nothing");

/* PbtA playbooks: the generic target, and a pack layout. */
const pbtaWitness = (name: string) => readFileSync(`node_modules/schema-pbta/corpus/contract/valid/${name}.toml`, "utf8");
const generic = parsePbtaPlaybookToml(pbtaWitness("playbook-session-notes"));
assert.ok(generic && "sessionNotes" in generic.data && generic.data.sessionNotes, "the generic PbtA witness carries session notes");
const genericPage = getPbtaPlaybookPages(generic.target)?.find((page) => page.notes_field);
assert.ok(genericPage, "the PbtA contract publishes a notes page for the generic playbook");
assertNotesLast(pbtaPlaybookBlock.render(generic, doc), genericPage.label.fr, String(generic.data.sessionNotes), "pbta-playbook");
const masks = parsePbtaPlaybookToml(pbtaWitness("masks-playbook-complete"));
assert.equal(masks?.target, "masks-playbook", "the masks witness resolves to its target");
const withNotes = { ...masks, data: { ...masks.data, sessionNotes: "Séance 2 : le toit.\n\nRetenir : la radio." } } as typeof masks;
const masksPage = getPbtaPlaybookPages(withNotes.target)?.find((page) => page.notes_field);
assert.ok(masksPage, "the PbtA contract publishes a notes page for the masks playbook");
assertNotesLast(pbtaPlaybookBlock.render(withNotes, doc, { packId: "masks" } as never), masksPage.label.fr, "Séance 2 : le toit.\n\nRetenir : la radio.", "masks layout");
assert.equal(notesOf(pbtaPlaybookBlock.render(masks, doc, { packId: "masks" } as never)).length, 0, "masks layout: a sheet without notes draws no notes page");
const emptiedMasks = { ...masks, data: { ...masks.data, sessionNotes: "" } } as typeof masks;
assert.equal(notesOf(pbtaPlaybookBlock.render(emptiedMasks, doc, { packId: "masks" } as never)).length, 0, "masks layout: emptied notes draw nothing");

/* City of Mist and Legend in the Mist keep their own sheets: no block of theirs draws a notes page. */
const importers: string[] = [];
const visit = (dir: string): void => {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) visit(path);
		else if (/\.ts$/.test(entry.name) && /blocks\/sessionNotes"|\.\/sessionNotes"/.test(readFileSync(path, "utf8"))) importers.push(path.split("\\").join("/"));
	}
};
visit("src");
for (const path of importers) {
	assert.ok(
		/src\/features\/(adrenalinePj|osCharacter|pbta)\//.test(path) || path.endsWith("src/features/blocks/sessionNotes.ts"),
		`${path} draws a notes page outside the sheets of the scope`,
	);
}

console.log("session notes: three families draw the published page last, blank draws nothing, scope held");
