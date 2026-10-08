import type { UrbanShadowsPlaybook } from "schema-pbta";
import contract from "schema-pbta/packs/urban-shadows/presentation-contract.json";
import { t } from "../../utils/i18n";
import { logScope } from "../../utils/logger";

const log = logScope("urban-shadows-layout");

type RegionId = (typeof contract.regions)[number]["id"];
type Face = (typeof contract.regions)[number]["group"];
type MoveEntry = UrbanShadowsPlaybook["moves"][number];
type Renderer = (doc: Document, id: RegionId, data: UrbanShadowsPlaybook, resolveImage?: (path: string) => string | null) => HTMLElement | null;

/** Pips under a Circle: the printed sheet shows three. */
const STATUS_PIPS = 3;

/**
 * The harm tracks are three lines of one region and the contract publishes one
 * label per region only: their words go through the interface language.
 */
const DEBT_LINES = 4;
const HARM_TERMS = { faint: "Faint", serious: "Serious", critical: "Critical", armor: "Armor" } as const;

function el(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	if (text !== undefined) result.textContent = text;
	return result;
}

/** A term of the interface language, or `fallback` when the language has none. */
function term(key: string, fallback: string): string {
	const translated = t(key);
	return translated === key ? fallback : translated;
}

/** Region headings come from the published contract; a language may word one differently. */
function regionLabel(id: RegionId): string {
	for (const region of contract.regions) if (region.id === id) return term(`region:${id}`, region.label);
	return id;
}

/** Stats and Circles are keys of the document; the language names them. */
function statLabel(key: string): string {
	return term(`term:${key}`, key);
}

function harmLabel(key: keyof typeof HARM_TERMS): string {
	return t(HARM_TERMS[key]);
}

function regionPrimitive(id: RegionId): string {
	for (const region of contract.regions) if (region.id === id) return region.primitive;
	return "";
}

function section(doc: Document, id: RegionId, heading?: string, level: "h2" | "h3" = "h3"): HTMLElement {
	const result = el(doc, "section");
	result.classList.add("handbook-urban-shadows-region");
	result.dataset.region = id;
	result.dataset.primitive = regionPrimitive(id);
	result.style.setProperty("--pbta-region-order", String(contract.canonicalOrder.indexOf(id)));
	if (heading) result.appendChild(el(doc, level, heading));
	return result;
}

function checkbox(doc: Document, checked: boolean, label: string): HTMLInputElement {
	const input = el(doc, "input") as HTMLInputElement;
	input.type = "checkbox";
	input.checked = checked;
	input.disabled = true;
	input.setAttribute("aria-label", label);
	return input;
}

/** A blank to fill in at the table: the page shows no choices, only room to write. */
function fill(doc: Document): HTMLElement {
	const result = el(doc, "span");
	result.classList.add("handbook-urban-shadows-fill");
	return result;
}

function paragraphs(doc: Document, parent: HTMLElement, values: readonly string[]): void {
	for (const value of values) parent.appendChild(el(doc, "p", value));
}

/** A list whose lines each carry an empty box. */
function checks(doc: Document, entries: ReadonlyArray<{ label: string; checked: boolean; note?: string }>): HTMLElement {
	const list = el(doc, "ul");
	list.classList.add("handbook-urban-shadows-checks");
	for (const entry of entries) {
		const item = el(doc, "li");
		item.appendChild(checkbox(doc, entry.checked, entry.label));
		item.appendChild(el(doc, "span", entry.label));
		if (entry.note) item.appendChild(el(doc, "em", entry.note));
		list.appendChild(item);
	}
	return list;
}

function boxes(doc: Document, count: number, label: string): HTMLElement {
	const result = el(doc, "div");
	result.classList.add("handbook-urban-shadows-boxes");
	for (let index = 1; index <= count; index += 1) result.appendChild(checkbox(doc, false, `${label} ${index}`));
	return result;
}

function row(doc: Document, label: string, value: string | number): HTMLElement {
	const result = el(doc, "div");
	result.classList.add("handbook-urban-shadows-row");
	result.appendChild(el(doc, "dt", label));
	result.appendChild(el(doc, "dd", String(value)));
	return result;
}

function signed(value: number): string {
	return value > 0 ? `+${value}` : String(value);
}

/** Circles are the stats the document names as Circles, by status or by advancement mark. */
function circleKeys(data: UrbanShadowsPlaybook): string[] {
	const keys: string[] = [];
	for (const key of Object.keys(data.statuses ?? {})) if (keys.indexOf(key) < 0) keys.push(key);
	for (const key of data.advancementCircles ?? []) if (keys.indexOf(key) < 0) keys.push(key);
	return keys;
}

function marks(doc: Document, kind: "lozenge" | "ring", entries: ReadonlyArray<{ key: string; value: number; status?: number }>): HTMLElement {
	const result = el(doc, "div");
	result.classList.add("handbook-urban-shadows-marks");
	for (const entry of entries) {
		const mark = el(doc, "div");
		mark.classList.add("handbook-urban-shadows-mark");
		mark.dataset.mark = kind;
		const value = el(doc, "span", signed(entry.value));
		value.classList.add("handbook-urban-shadows-mark-value");
		mark.appendChild(value);
		mark.appendChild(el(doc, "span", statLabel(entry.key)));
		if (entry.status !== undefined) {
			const pips = el(doc, "span");
			pips.classList.add("handbook-urban-shadows-pips");
			for (let index = 1; index <= STATUS_PIPS; index += 1) {
				const pip = el(doc, "span");
				pip.classList.add("handbook-urban-shadows-pip");
				pip.dataset.filled = String(index <= entry.status);
				pips.appendChild(pip);
			}
			mark.appendChild(pips);
		}
		result.appendChild(mark);
	}
	return result;
}

function moveCard(doc: Document, move: MoveEntry, startingMoves: readonly string[]): HTMLElement {
	const card = el(doc, "article");
	card.classList.add("handbook-urban-shadows-move");
	const acquired = move.checked ?? ("ref" in move && startingMoves.indexOf(move.ref) >= 0);
	card.dataset.acquired = String(acquired);
	const heading = el(doc, "h4");
	heading.appendChild(checkbox(doc, acquired, "ref" in move ? move.ref : move.name));
	heading.appendChild(el(doc, "span", "ref" in move ? move.ref : move.name));
	card.appendChild(heading);
	if ("ref" in move) return card;
	card.appendChild(el(doc, "p", move.description));
	if (move.trigger) card.appendChild(el(doc, "p", move.trigger));
	if (move.choices) card.appendChild(el(doc, "p", move.choices));
	if (move.results) for (const key of Object.keys(move.results)) {
		const result = move.results[key];
		const outcome = el(doc, "p");
		outcome.appendChild(el(doc, "strong", `${result.label} : `));
		outcome.appendChild(el(doc, "span", result.text));
		card.appendChild(outcome);
	}
	return card;
}

function editorial(doc: Document, id: RegionId, value: { heading: string; paragraphs: readonly string[] }): HTMLElement {
	const result = section(doc, id, value.heading);
	paragraphs(doc, result, value.paragraphs);
	return result;
}

/** Each region of the contract has one renderer; a region without data is not emitted. */
const RENDERERS: Record<RegionId, Renderer> = {
	"game-identity": (doc, id, data, resolveImage) => {
		const result = section(doc, id, data.name, "h2");
		result.appendChild(el(doc, "p", data.description));
		const bar = el(doc, "div");
		bar.classList.add("handbook-urban-shadows-identity-bar");
		for (const label of ["Name (pronouns)", "Demeanor", "Look"]) {
			const field = el(doc, "p");
			field.appendChild(el(doc, "span", `${t(label)} :`)).classList.add("handbook-urban-shadows-label");
			field.appendChild(fill(doc));
			bar.appendChild(field);
		}
		result.appendChild(bar);
		const image = data.playbookImage?.trim();
		const source = image ? resolveImage?.(image) ?? (/^https:\/\//i.test(image) ? image : null) : null;
		if (source) {
			const img = el(doc, "img") as HTMLImageElement;
			img.src = source;
			img.alt = `Illustration de ${data.name}`;
			result.appendChild(img);
		}
		return result;
	},
	"urban-shadows-opening": (doc, id, data) => {
		const result = section(doc, id);
		paragraphs(doc, result, data.editorial.opening.paragraphs);
		return result;
	},
	"character-identity": (doc, id, data) => {
		const result = section(doc, id, data.editorial.identity.heading);
		const fields = el(doc, "div");
		fields.classList.add("handbook-urban-shadows-identity-fields");
		for (const paragraph of data.editorial.identity.paragraphs) {
			const labelled = /^([^:]{1,24}) : ([\s\S]+)$/.exec(paragraph);
			if (!labelled) {
				result.appendChild(el(doc, "p", paragraph));
				continue;
			}
			const line = el(doc, "p");
			line.appendChild(el(doc, "span", `${labelled[1]} :`)).classList.add("handbook-urban-shadows-label");
			line.appendChild(fill(doc));
			fields.appendChild(line);
		}
		if (fields.childElementCount) result.appendChild(fields);
		return result;
	},
	"urban-shadows-stats": (doc, id, data) => {
		const circles = circleKeys(data);
		const keys = Object.keys(data.stats).filter((key) => circles.indexOf(key) < 0);
		const profiles = data.statProfiles ?? [];
		if (!keys.length && !profiles.length) return null;
		const result = section(doc, id, regionLabel(id));
		if (data.statsDetail) result.appendChild(el(doc, "p", data.statsDetail));
		result.appendChild(marks(doc, "lozenge", keys.map((key) => ({ key, value: data.stats[key] }))));
		for (const profile of profiles) {
			const dl = el(doc, "dl");
			dl.appendChild(el(doc, "dt", profile.label));
			for (const key of Object.keys(profile.stats)) dl.appendChild(row(doc, statLabel(key), signed(profile.stats[key])));
			result.appendChild(dl);
		}
		return result;
	},
	"urban-shadows-circles": (doc, id, data) => {
		const circles = circleKeys(data).filter((key) => data.stats[key] !== undefined);
		if (!circles.length) return null;
		const result = section(doc, id, regionLabel(id));
		result.appendChild(marks(doc, "ring", circles.map((key) => ({
			key,
			value: data.stats[key],
			status: Math.min(Math.max(data.statuses?.[key] ?? 0, 0), STATUS_PIPS),
		}))));
		return result;
	},
	"playbook-moves": (doc, id, data) => {
		if (!data.moves.length) return null;
		const result = section(doc, id, regionLabel(id));
		for (const move of data.moves) result.appendChild(moveCard(doc, move, data.startingMoves ?? []));
		return result;
	},
	"urban-shadows-advancement": (doc, id, data) => {
		const circles = data.advancementCircles ?? [];
		const first = data.advancement ?? [];
		const later = data.laterAdvancement ?? [];
		if (!circles.length && !first.length && !later.length) return null;
		const result = section(doc, id, regionLabel(id));
		const intro = el(doc, "div");
		intro.classList.add("handbook-urban-shadows-progression-intro");
		intro.appendChild(el(doc, "p", t("Erase 4 checked boxes to advance.")));
		result.appendChild(intro);
		if (circles.length) {
			const grid = el(doc, "div");
			grid.classList.add("handbook-urban-shadows-circle-marks");
			for (const key of circles) {
				const cell = el(doc, "label");
				cell.appendChild(el(doc, "span", statLabel(key)));
				cell.appendChild(checkbox(doc, false, statLabel(key)));
				grid.appendChild(cell);
			}
			result.appendChild(grid);
		}
		if (first.length) result.appendChild(checks(doc, first.map((entry) => ({ label: entry.label, checked: entry.checked === true }))));
		if (later.length) {
			const block = el(doc, "div");
			block.classList.add("handbook-urban-shadows-later");
			block.appendChild(checks(doc, later.map((entry) => ({ label: entry.label, checked: entry.checked === true }))));
			result.appendChild(block);
		}
		return result;
	},
	"harm-tracker": (doc, id, data) => {
		if (!data.harm) return null;
		const result = section(doc, id);
		const head = el(doc, "div");
		head.classList.add("handbook-urban-shadows-harm-head");
		head.appendChild(el(doc, "h3", regionLabel(id)));
		if (data.harm.armor !== undefined) {
			const armor = el(doc, "div");
			armor.classList.add("handbook-urban-shadows-armor");
			armor.appendChild(el(doc, "span", harmLabel("armor")));
			armor.appendChild(boxes(doc, Math.max(data.harm.armor, 1), harmLabel("armor")));
			head.appendChild(armor);
		}
		result.appendChild(head);
		for (const key of ["faint", "serious", "critical"] as const) {
			const count = data.harm[key];
			if (!count) continue;
			const line = el(doc, "div");
			line.classList.add("handbook-urban-shadows-harm-line");
			line.appendChild(boxes(doc, count, harmLabel(key)));
			line.appendChild(el(doc, "span", harmLabel(key)));
			result.appendChild(line);
		}
		return result.childElementCount > 1 ? result : null;
	},
	"urban-shadows-scars": (doc, id, data) => {
		if (!data.scars?.length) return null;
		const result = section(doc, id, regionLabel(id));
		result.appendChild(checks(doc, data.scars.map((scar) => ({
			label: scar.name,
			checked: false,
			note: scar.stat && scar.modifier !== undefined ? `${statLabel(scar.stat)} ${signed(scar.modifier)}` : undefined,
		}))));
		return result;
	},
	"urban-shadows-let-it-out": (doc, id, data) => {
		if (!data.letItOut?.length) return null;
		const result = section(doc, id, regionLabel(id));
		const list = el(doc, "ul");
		list.classList.add("handbook-urban-shadows-lozenges");
		for (const value of data.letItOut) list.appendChild(el(doc, "li", value));
		result.appendChild(list);
		return result;
	},
	"urban-shadows-end-move": (doc, id, data) => {
		const result = section(doc, id, regionLabel(id));
		result.appendChild(el(doc, "p", data.endMove));
		return result;
	},
	/** Creation choices are made once; the sheet records only what was chosen, so it has no creation column. */
	"urban-shadows-creation": () => null,
	/** A place to write the debts in play, never the starting ones. The heading is local until the contract publishes one. */
	"urban-shadows-debts": (doc, id) => {
		const result = section(doc, id, t("Debts"));
		for (let index = 0; index < DEBT_LINES; index += 1) result.appendChild(fill(doc));
		return result;
	},
	"urban-shadows-mortal-relationships": (doc, id, data) => {
		if (!data.mortalRelationships?.length) return null;
		const result = section(doc, id, regionLabel(id));
		// Chosen at creation, so nothing to tick: a plain list.
		const list = el(doc, "ul");
		list.classList.add("handbook-urban-shadows-relations");
		for (const relation of data.mortalRelationships) {
			const item = el(doc, "li");
			item.appendChild(el(doc, "strong", relation.label));
			if (relation.description) item.appendChild(el(doc, "p", relation.description));
			list.appendChild(item);
		}
		result.appendChild(list);
		return result;
	},
	"urban-shadows-extras": (doc, id, data) => {
		if (!data.extras?.length) return null;
		const result = section(doc, id);
		for (const extra of data.extras) {
			const frame = el(doc, "div");
			frame.classList.add("handbook-urban-shadows-frame");
			frame.dataset.extra = extra.key;
			frame.appendChild(el(doc, "h4", extra.label));
			if (extra.text) frame.appendChild(el(doc, "p", extra.text));
			if (extra.items?.length) {
				const list = el(doc, "ul");
				for (const item of extra.items) list.appendChild(el(doc, "li", item));
				frame.appendChild(list);
			}
			result.appendChild(frame);
		}
		return result;
	},
	"urban-shadows-intimacy": (doc, id, data) => {
		if (!data.intimacy) return null;
		const result = section(doc, id, regionLabel(id));
		result.appendChild(el(doc, "p", data.intimacy));
		return result;
	},
	"gear": (doc, id, data) => {
		if (!data.gear?.length) return null;
		const result = section(doc, id, regionLabel(id));
		const list = el(doc, "ul");
		for (const item of data.gear) list.appendChild(el(doc, "li", `${item.name}${item.quantity ? ` × ${item.quantity}` : ""}${item.description ? ` — ${item.description}` : ""}`));
		result.appendChild(list);
		return result;
	},
	"urban-shadows-corruption": (doc, id, data) => {
		const result = section(doc, id, regionLabel(id));
		if (data.corruption.track) result.appendChild(boxes(doc, data.corruption.track, "Corruption"));
		const trigger = el(doc, "p");
		trigger.appendChild(el(doc, "strong", `${t("Trigger")} : `));
		trigger.appendChild(el(doc, "span", data.corruption.trigger));
		result.appendChild(trigger);
		result.appendChild(checks(doc, data.corruption.advances.map((entry) => ({ label: entry.label, checked: entry.checked === true }))));
		if (data.corruption.moves?.length) {
			result.appendChild(el(doc, "h4", t("Corruption actions")));
			result.appendChild(checks(doc, data.corruption.moves.map((label) => ({ label, checked: false }))));
		}
		return result;
	},
	"urban-shadows-play": (doc, id, data) => editorial(doc, id, data.editorial.playAdvice),
};

/** The regions this layout draws; `assert:urban-shadows-layout` compares them with the published contract. */
export const URBAN_SHADOWS_LAYOUT_REGIONS: readonly string[] = Object.keys(RENDERERS);

function faceOf(id: RegionId): Face {
	for (const region of contract.regions) if (region.id === id) return region.group;
	return "recto";
}

function faceElement(doc: Document, face: Face): HTMLElement {
	const result = el(doc, "div");
	result.classList.add("handbook-urban-shadows-face");
	result.dataset.face = face;
	return result;
}

/** Region placement follows the published presentation contract; the geometry is the pack's sheet. */
export function renderUrbanShadowsLayout(data: UrbanShadowsPlaybook, doc: Document, resolveImage?: (path: string) => string | null): HTMLElement {
	const root = el(doc, "article");
	root.classList.add("handbook-pbta-playbook", "handbook-urban-shadows-playbook");
	const rendered = new Map<RegionId, HTMLElement>();
	for (const id of contract.canonicalOrder) {
		const renderer = (RENDERERS as Partial<Record<string, Renderer>>)[id];
		if (!renderer) {
			// A region the contract adds before the layout knows it: noted, the rest still draws.
			log.warn(`Region "${id}" published by the contract is not drawn by this layout`);
			continue;
		}
		const region = renderer(doc, id, data, resolveImage);
		if (region) rendered.set(id, region);
	}
	const faces = new Map<Face, HTMLElement>();
	const face = (name: Face): HTMLElement => {
		let result = faces.get(name);
		if (!result) {
			result = faceElement(doc, name);
			faces.set(name, result);
			root.appendChild(result);
		}
		return result;
	};
	const placed = new Set<RegionId>();
	const identity = rendered.get("game-identity");
	if (identity) {
		face(faceOf("game-identity")).appendChild(identity);
		placed.add("game-identity");
	}
	for (const [rowIndex, columns] of contract.rows.entries()) {
		const layoutRow = el(doc, "div");
		layoutRow.classList.add("handbook-urban-shadows-layout-row");
		layoutRow.dataset.row = String(rowIndex + 1);
		for (const [columnIndex, ids] of columns.entries()) {
			const column = el(doc, "div");
			column.classList.add("handbook-urban-shadows-column");
			column.dataset.column = String(columnIndex + 1);
			for (const id of ids) {
				const region = rendered.get(id);
				if (region) column.appendChild(region);
				placed.add(id);
			}
			layoutRow.appendChild(column);
		}
		face(faceOf(columns[0][0])).appendChild(layoutRow);
	}
	for (const id of contract.canonicalOrder) if (!placed.has(id)) {
		const region = rendered.get(id);
		if (region) face(faceOf(id)).appendChild(region);
	}
	return root;
}
