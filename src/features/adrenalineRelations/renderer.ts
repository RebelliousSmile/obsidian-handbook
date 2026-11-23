import {
	RELATIONS_PRESENTATION,
	placesPerRow,
	type AdrenalineAttitudeLevel,
	type AdrenalinePresentationBlock,
	type AdrenalinePresentationSection,
} from "schema-adrenaline/presentation";
import { adrenalineSourceDocument, asRecord, type AdrenalineDocument } from "../adrenaline/document";
import { publishedDefaultNumber, publishedMaxItems } from "../adrenaline/publishedContract";
import { renderZones } from "../blocks/shape";
import { logScope } from "../../utils/logger";
import { AdrenalineRelationsData } from "./parser";
import { relationsToDocument } from "./schema";
import { adrenalineRelationsShape } from "./shape";

const ROOT = "brumes-adrenaline-relations";
const log = logScope("adrenaline-relations");
const reportedForms = new Set<string>();
const reportedFields = new Set<string>();

/* Labels the published presentation leaves to the consumer: the field names and the enum values of the sheet. */
const FIELD_LABELS: Record<string, string> = {
	numero: "N°",
	nom: "Nom",
	ceQueJeSais: "Ce que je sais",
	ceQueJeLuiDois: "Ce que je lui dois",
	ceQuOnMeDoit: "Ce qu'iel me doit",
	attitude: "Attitude",
	lien: "Lien",
	reliesA: "Relié à",
	resume: "Résumé",
	notes: "Notes",
	toucheParLeDrame: "Touché",
};
const LINK_LABELS: Record<string, string> = { familial: "Familial", amitie: "Amitié", travail: "Travail" };

function node(doc: Document, tag: string, className: string, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	result.classList.add(`${ROOT}__${className}`);
	if (text !== undefined) result.textContent = text;
	return result;
}

function add(parent: HTMLElement, doc: Document, tag: string, className: string, text?: string): HTMLElement {
	return parent.appendChild(node(doc, tag, className, text));
}

function at(source: AdrenalineDocument, pointer: string): unknown {
	return pointer.slice(1).split("/").reduce<unknown>((value, key) => asRecord(value)?.[key], source);
}

function lastSegment(pointer: string): string {
	return pointer.split("/").pop() ?? "";
}

function humanize(value: string): string {
	const spaced = value.replace(/([A-Z])/g, " $1").replace(/-/g, " ").toLowerCase();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function shown(value: unknown): string {
	return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/** A handwritten value: the text as entered, in the sheet's value font. */
function value(doc: Document, content: string, className = "value"): HTMLElement {
	const result = node(doc, "span", className, content);
	if (className !== "value") result.classList.add(`${ROOT}__value`);
	return result;
}

/** A label, a dotted handwritten field. */
function writeLine(doc: Document, parent: HTMLElement, label: string, content: string): HTMLElement {
	const line = add(parent, doc, "div", "write-line");
	add(line, doc, "b", "write-label", label);
	line.appendChild(value(doc, content, "write-field"));
	return line;
}

function fieldRows(block: AdrenalinePresentationBlock): readonly (readonly string[])[] {
	return block.fieldRows ?? [];
}

/** The slots the sheet prints for a list: the bound the contract publishes, never fewer than the entries the document holds. */
function slotCount(pointer: string, entries: number): number {
	return Math.max(entries, publishedMaxItems("relations", pointer) ?? 0);
}

function entriesAt(source: AdrenalineDocument, pointer: string): Record<string, unknown>[] {
	const found = at(source, pointer);
	return Array.isArray(found) ? found.map((item) => asRecord(item) ?? {}) : [];
}

function renderNameCard(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	for (const row of block.pointerRows ?? []) {
		const line = add(box, doc, "div", "card-row");
		for (const cell of row) {
			const field = add(line, doc, "div", "card");
			add(field, doc, "span", "card-label", cell.label ?? humanize(lastSegment(cell.path)));
			field.appendChild(value(doc, shown(at(source, cell.path)), "card-value"));
		}
	}
}

/** The label of a field of another character: the published wording that follows their gender when there is one, else the plain label. */
function tieLabel(block: AdrenalinePresentationBlock, key: string, entry: Record<string, unknown>): string {
	const worded = (block.genderedLabels ?? []).find((candidate) => candidate.key === key);
	if (worded) {
		const gender = entry[worded.genderKey];
		const labels: Record<string, string> = worded.labels;
		return typeof gender === "string" && labels[gender] !== undefined ? labels[gender] : worded.labels.default;
	}
	return FIELD_LABELS[key] ?? humanize(key);
}

/**
 * One slot per place the sheet prints: the count the document sets at `countPath`, else the default the contract publishes,
 * never fewer than the entries the document holds. The section columns are the most places a row holds: the places fill
 * the width up to that, and split into even rows beyond it (`placesPerRow`).
 */
function renderPcTies(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument, maxPerRow: number): void {
	const pointer = block.paths[0];
	const entries = entriesAt(source, pointer);
	const entered = block.countPath === undefined ? undefined : at(source, block.countPath);
	const printed = typeof entered === "number" ? entered : block.countPath === undefined ? undefined : publishedDefaultNumber("relations", block.countPath);
	const slots = printed === undefined ? slotCount(pointer, entries.length) : Math.max(entries.length, printed);
	box.style.setProperty("--ties-per-row", String(placesPerRow(slots, maxPerRow)));
	for (let index = 0; index < slots; index += 1) {
		const entry = entries[index] ?? {};
		const tie = add(box, doc, "div", "tie");
		for (const row of fieldRows(block)) {
			for (const key of row) writeLine(doc, tie, tieLabel(block, key, entry), shown(entry[key]));
		}
	}
}

/** The attitude as the presentation words it, read from the levels it publishes; the modifier it sets is not printed. */
function attitudeLabel(key: unknown, levels: readonly AdrenalineAttitudeLevel[]): string {
	if (typeof key !== "string") return "";
	const level = levels.find((candidate) => candidate.key === key);
	return level ? level.label : key;
}

/** What an NPC field prints, whether on a card line or in a table cell. */
function npcFieldText(key: string, entry: Record<string, unknown>, levels: readonly AdrenalineAttitudeLevel[]): string {
	switch (key) {
		case "attitude":
			return attitudeLabel(entry.attitude, levels);
		case "lien": {
			const link = asRecord(entry.lien);
			const type = typeof link?.type === "string" ? LINK_LABELS[link.type] ?? link.type : "";
			return [type, shown(link?.description)].filter(Boolean).join(" · ");
		}
		case "reliesA":
			return (Array.isArray(entry.reliesA) ? entry.reliesA.filter((item): item is number => typeof item === "number") : []).join(", ");
		default:
			if (!(key in FIELD_LABELS) && !reportedFields.has(key)) {
				reportedFields.add(key);
				log.warn(`Relations NPC field "${key}" has no dedicated rendering; it is shown as plain text.`);
			}
			return shown(entry[key]);
	}
}

/** The box a drama test is ticked in: filled when the document says a test was made on the NPC. */
function tickBox(doc: Document, parent: HTMLElement, done: boolean): HTMLElement {
	const box = add(parent, doc, "span", "tick", done ? "✓" : "");
	if (done) box.classList.add(`${ROOT}__tick--on`);
	return box;
}

function renderNpcField(doc: Document, card: HTMLElement, key: string, entry: Record<string, unknown>, levels: readonly AdrenalineAttitudeLevel[]): void {
	const label = FIELD_LABELS[key] ?? humanize(key);
	if (key === "toucheParLeDrame") {
		const line = add(card, doc, "div", "write-line");
		add(line, doc, "b", "write-label", label);
		tickBox(doc, line, entry.toucheParLeDrame === true);
		return;
	}
	writeLine(doc, card, label, npcFieldText(key, entry, levels));
}

/** One card per slot, filled column by column: the first half down the left column, the rest down the next. */
function renderNpcEntries(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const pointer = block.paths[0];
	const entries = entriesAt(source, pointer);
	const slots = slotCount(pointer, entries.length);
	const columns = Math.max(1, block.columns ?? 1);
	const perColumn = Math.ceil(slots / columns);
	const levels = block.attitudeLevels ?? [];
	const grid = add(box, doc, "div", "npc-columns");
	for (let column = 0; column < columns; column += 1) {
		const side = add(grid, doc, "div", "npc-column");
		for (let index = column * perColumn; index < Math.min(slots, (column + 1) * perColumn); index += 1) {
			const entry = entries[index];
			const card = add(side, doc, "div", "npc");
			if (!entry) card.classList.add(`${ROOT}__npc--empty`);
			for (const row of fieldRows(block)) {
				if (row.length === 2 && row[0] === "numero") {
					const head = add(card, doc, "div", "npc-head");
					head.appendChild(value(doc, shown(entry?.numero), "npc-number"));
					head.appendChild(value(doc, shown(entry?.nom), "npc-name"));
					continue;
				}
				// A row of several fields is one line of the card: each field takes its share of it.
				const line = row.length > 1 ? add(card, doc, "div", "npc-row") : card;
				for (const key of row) renderNpcField(doc, line, key, entry ?? {}, levels);
			}
		}
	}
}

function renderUnknown(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const form = block.form ?? "(none)";
	box.classList.add(`${ROOT}__block--plain`);
	if (!reportedForms.has(form)) {
		reportedForms.add(form);
		log.warn(`Relations block form "${form}" has no dedicated rendering; block "${block.id}" is shown as plain lines.`);
	}
	for (const pointer of block.paths) writeLine(doc, box, humanize(lastSegment(pointer)), shown(at(source, pointer)));
}

/* These forms print their own labels; any other block prints its title unless it repeats its section's. */
const TITLED_ELSEWHERE = new Set(["name-card"]);

function renderBlock(doc: Document, block: AdrenalinePresentationBlock, section: AdrenalinePresentationSection, source: AdrenalineDocument): HTMLElement {
	const sectionLabel = section.label;
	const box = node(doc, "div", block.id);
	box.classList.add(`${ROOT}__block`, `${ROOT}__form-${block.form ?? "none"}`, `${ROOT}__layout-${block.layout}`);
	if (block.columns) box.classList.add(`${ROOT}__block-columns-${block.columns}`);
	if (!TITLED_ELSEWHERE.has(block.form ?? "") && block.label !== sectionLabel) add(box, doc, "h5", "block-title", block.label);
	switch (block.form) {
		case "name-card": renderNameCard(doc, box, block, source); break;
		case "pc-ties": renderPcTies(doc, box, block, source, section.columns ?? 1); break;
		case "npc-entries": renderNpcEntries(doc, box, block, source); break;
		default: renderUnknown(doc, box, block, source);
	}
	for (const note of block.notes ?? []) add(box, doc, "p", "block-note", note);
	return box;
}

function renderSection(doc: Document, section: AdrenalinePresentationSection, source: AdrenalineDocument): HTMLElement {
	const container = node(doc, "section", "section");
	container.classList.add(`${ROOT}__section--${section.id}`);
	// The banner is the header line: its cards carry their own labels, so it prints no title.
	if (section.layout !== "banner" && section.showTitle !== false) add(container, doc, "h4", "section-title", section.label);
	const body = add(container, doc, "div", "section-body");
	body.classList.add(`${ROOT}__columns-${section.columns ?? 1}`, `${ROOT}__layout-${section.layout}`);
	for (const block of [...section.blocks].sort((a, b) => a.order - b.order)) body.appendChild(renderBlock(doc, block, section, source));
	return container;
}

export function renderAdrenalineRelations(data: AdrenalineRelationsData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	const appearance = RELATIONS_PRESENTATION.appearance;
	root.classList.add(
		adrenalineRelationsShape.root,
		`${ROOT}--variant-${appearance.variant}`,
		`${ROOT}--surface-${appearance.surface}`,
		`${ROOT}--titles-${appearance.sectionTitles.align}`,
		`${ROOT}--titles-${appearance.sectionTitles.font}`,
		`${ROOT}--values-${appearance.values.align}`,
		`${ROOT}--values-${appearance.values.font}`,
	);
	if (appearance.outerRule) root.classList.add(`${ROOT}--outer-rule`);
	const source = adrenalineSourceDocument(data) ?? relationsToDocument(data);
	const builders: Record<string, () => HTMLElement | null> = {};
	for (const section of RELATIONS_PRESENTATION.sections) builders[section.id] = () => renderSection(doc, section, source);
	renderZones(root, adrenalineRelationsShape, builders);
	return root;
}
