import {
	RELATIONS_PRESENTATION,
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
	nom: "Nom",
	ceQueJeSais: "Ce que je sais",
	ceQueJeLuiDois: "Ce que je lui dois",
	ceQuIlMeDoit: "Ce qu'il me doit",
	attitude: "Attitude",
	lien: "Lien",
	reliesA: "Relié à",
	ceQuiLuiEstArrive: "Ce qui lui est arrivé",
	notes: "Notes",
};
const LINK_LABELS: Record<string, string> = { familial: "Familial", amitie: "Amitié", travail: "Travail" };
/* The nature of a modifier, as the sheet words it; the count is the one `ATTITUDE_LEVELS` publishes. */
const NATURE_LABELS: Record<string, string> = { bonus: "bonus", malus: "malus", aucun: "aucun" };

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

/**
 * One slot per place the sheet prints: the count the document sets at `countPath`, else the default the contract publishes,
 * never fewer than the entries the document holds. The places are laid out by rows of the section columns.
 */
function renderPcTies(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const pointer = block.paths[0];
	const entries = entriesAt(source, pointer);
	const entered = block.countPath === undefined ? undefined : at(source, block.countPath);
	const printed = typeof entered === "number" ? entered : block.countPath === undefined ? undefined : publishedDefaultNumber("relations", block.countPath);
	const slots = printed === undefined ? slotCount(pointer, entries.length) : Math.max(entries.length, printed);
	for (let index = 0; index < slots; index += 1) {
		const entry = entries[index] ?? {};
		const tie = add(box, doc, "div", "tie");
		for (const row of fieldRows(block)) {
			for (const key of row) writeLine(doc, tie, FIELD_LABELS[key] ?? humanize(key), shown(entry[key]));
		}
	}
}

function renderCounter(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const line = add(box, doc, "div", "counter");
	add(line, doc, "span", "card-label", block.label);
	line.appendChild(value(doc, shown(at(source, block.paths[0])), "counter-value"));
}

/** The modifier an attitude sets, read from the levels the presentation publishes and never from the document. */
function attitudeText(doc: Document, line: HTMLElement, key: unknown, levels: readonly AdrenalineAttitudeLevel[]): void {
	if (typeof key !== "string") return;
	const level = levels.find((candidate) => candidate.key === key);
	if (!level) {
		line.appendChild(value(doc, key, "write-field"));
		return;
	}
	const text = value(doc, level.label, "write-field");
	line.appendChild(text);
	const nature = NATURE_LABELS[level.nature] ?? level.nature;
	add(line, doc, "span", "npc-modifier", level.nature === "aucun" ? nature : `${nature} ${level.count}`).classList.add(`${ROOT}__modifier--${level.nature}`);
}

function renderNpcField(doc: Document, card: HTMLElement, key: string, entry: Record<string, unknown>, levels: readonly AdrenalineAttitudeLevel[]): void {
	const label = FIELD_LABELS[key] ?? humanize(key);
	switch (key) {
		case "attitude": {
			const line = add(card, doc, "div", "write-line");
			add(line, doc, "b", "write-label", label);
			if (entry.attitude === undefined) line.appendChild(value(doc, "", "write-field"));
			else attitudeText(doc, line, entry.attitude, levels);
			break;
		}
		case "lien": {
			const link = asRecord(entry.lien);
			const type = typeof link?.type === "string" ? LINK_LABELS[link.type] ?? link.type : "";
			writeLine(doc, card, label, [type, shown(link?.description)].filter(Boolean).join(" · "));
			break;
		}
		case "reliesA": {
			const numbers = Array.isArray(entry.reliesA) ? entry.reliesA.filter((item): item is number => typeof item === "number") : [];
			writeLine(doc, card, label, numbers.join(", "));
			break;
		}
		case "ceQuiLuiEstArrive":
		case "notes":
			writeLine(doc, card, label, shown(entry[key]));
			break;
		default:
			if (!reportedFields.has(key)) {
				reportedFields.add(key);
				log.warn(`Relations NPC field "${key}" has no dedicated rendering; it is shown as a plain line.`);
			}
			writeLine(doc, card, label, shown(entry[key]));
	}
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
				for (const key of row) renderNpcField(doc, card, key, entry ?? {}, levels);
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
const TITLED_ELSEWHERE = new Set(["name-card", "counter"]);

function renderBlock(doc: Document, block: AdrenalinePresentationBlock, sectionLabel: string, source: AdrenalineDocument): HTMLElement {
	const box = node(doc, "div", block.id);
	box.classList.add(`${ROOT}__block`, `${ROOT}__form-${block.form ?? "none"}`, `${ROOT}__layout-${block.layout}`);
	if (block.columns) box.classList.add(`${ROOT}__block-columns-${block.columns}`);
	if (!TITLED_ELSEWHERE.has(block.form ?? "") && block.label !== sectionLabel) add(box, doc, "h5", "block-title", block.label);
	switch (block.form) {
		case "name-card": renderNameCard(doc, box, block, source); break;
		case "pc-ties": renderPcTies(doc, box, block, source); break;
		case "counter": renderCounter(doc, box, block, source); break;
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
	for (const block of [...section.blocks].sort((a, b) => a.order - b.order)) body.appendChild(renderBlock(doc, block, section.label, source));
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
