import { getPbtaStatRangePresentation, type MasksPlaybook } from "schema-pbta";
import contract from "schema-pbta/packs/masks/presentation-contract.json";

type RegionId = (typeof contract.regions)[number]["id"];
type Move = MasksPlaybook["moves"][number];
type Renderer = (doc: Document, id: RegionId, data: MasksPlaybook, resolveImage?: (path: string) => string | null) => HTMLElement | null;

function el(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	if (text !== undefined) result.textContent = text;
	return result;
}

/** Headings come from the published contract, never from literals here. */
function regionOf(id: RegionId): (typeof contract.regions)[number] {
	return contract.regions.find((region) => region.id === id) as (typeof contract.regions)[number];
}

function section(doc: Document, id: RegionId, heading?: string): HTMLElement {
	const result = el(doc, "section");
	result.classList.add("handbook-masks-region");
	result.dataset.region = id;
	result.dataset.primitive = regionOf(id).primitive;
	result.style.setProperty("--pbta-region-order", String(contract.canonicalOrder.indexOf(id)));
	if (heading) result.appendChild(el(doc, "h3", heading));
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

function signed(value: number): string {
	return value > 0 ? `+${value}` : String(value);
}

function checks(doc: Document, entries: ReadonlyArray<{ label: string; checked: boolean; note?: string }>): HTMLElement {
	const list = el(doc, "ul");
	list.classList.add("handbook-masks-checks");
	for (const entry of entries) {
		const item = el(doc, "li");
		item.appendChild(checkbox(doc, entry.checked, entry.label));
		item.appendChild(el(doc, "span", entry.label));
		if (entry.note) item.appendChild(el(doc, "em", entry.note));
		list.appendChild(item);
	}
	return list;
}

function plainList(doc: Document, values: readonly string[]): HTMLElement {
	const list = el(doc, "ul");
	for (const value of values) list.appendChild(el(doc, "li", value));
	return list;
}

function moveLabel(move: Move): { label: string; note?: string; checked: boolean } {
	if ("ref" in move) return { label: move.ref, checked: move.checked === true };
	return { label: move.name, note: move.description, checked: move.checked === true };
}

/** One notch per value of the range of a Label; the value of the document is marked. */
function labelTrack(doc: Document, key: string, value: number, range: { min: number; max: number }): HTMLElement {
	const row = el(doc, "div");
	row.classList.add("handbook-masks-label");
	row.appendChild(el(doc, "span", key));
	const track = el(doc, "ol");
	track.classList.add("handbook-masks-track");
	for (let notch = range.min; notch <= range.max; notch += 1) {
		const item = el(doc, "li", signed(notch));
		item.dataset.value = String(notch);
		item.dataset.marked = String(notch === value);
		track.appendChild(item);
	}
	row.appendChild(track);
	return row;
}

const RENDERERS: Record<RegionId, Renderer> = {
	"masks-header": (doc, id, data) => {
		const result = section(doc, id);
		result.appendChild(el(doc, "h2", data.heroName ?? data.name));
		if (data.heroName) result.appendChild(el(doc, "span", data.name));
		return result;
	},
	"masks-labels": (doc, id, data) => {
		const keys = Object.keys(data.stats);
		if (keys.length === 0) return null;
		const result = section(doc, id, regionOf(id).label);
		const presentation = getPbtaStatRangePresentation("masks-playbook");
		const ranges = presentation ? data.statRanges : undefined;
		for (const key of keys) {
			const range = ranges?.[key];
			if (range) {
				result.appendChild(labelTrack(doc, key, data.stats[key], range));
				continue;
			}
			const line = el(doc, "div");
			line.classList.add("handbook-masks-label");
			line.appendChild(el(doc, "span", key));
			line.appendChild(el(doc, "strong", signed(data.stats[key])));
			result.appendChild(line);
		}
		return result;
	},
	"masks-conditions": (doc, id, data) => {
		if (!data.conditions?.length) return null;
		const result = section(doc, id, regionOf(id).label);
		result.appendChild(checks(doc, data.conditions.map((entry) => ({ label: entry.name, checked: entry.checked === true, note: entry.description }))));
		return result;
	},
	"masks-moment-of-truth": (doc, id, data) => {
		const result = section(doc, id, regionOf(id).label);
		result.appendChild(el(doc, "p", data.momentOfTruth));
		const unlock = el(doc, "label");
		unlock.classList.add("handbook-masks-unlock");
		unlock.appendChild(checkbox(doc, data.momentUnlocked === true, "Débloqué"));
		unlock.appendChild(el(doc, "span", "Débloqué"));
		result.appendChild(unlock);
		return result;
	},
	/* The booklet is drawn for play, after creation: what is chosen once (influence options) is not drawn. */
	"masks-influence-options": () => null,
	"masks-advances": (doc, id, data) => {
		const advances = data.advancement ?? [];
		if (advances.length === 0 && data.potentialMax === undefined) return null;
		const result = section(doc, id, regionOf(id).label);
		if (advances.length) result.appendChild(checks(doc, advances.map((entry) => ({ label: entry.label, checked: entry.checked === true }))));
		if (data.potentialMax !== undefined) {
			const potential = el(doc, "div");
			potential.classList.add("handbook-masks-potential");
			for (let index = 1; index <= data.potentialMax; index += 1) {
				potential.appendChild(checkbox(doc, index <= (data.potential ?? 0), `${index}`));
			}
			result.appendChild(potential);
		}
		return result;
	},
	"masks-moves": (doc, id, data) => {
		if (data.moves.length === 0) return null;
		const result = section(doc, id, regionOf(id).label);
		result.appendChild(checks(doc, data.moves.map(moveLabel)));
		return result;
	},
	"masks-drives": (doc, id, data) => {
		const chosen = (data.drives?.options ?? []).filter((entry) => entry.checked === true);
		if (chosen.length === 0) return null;
		const result = section(doc, id, regionOf(id).label);
		result.appendChild(checks(doc, chosen.map((entry) => ({ label: entry.label, checked: true }))));
		return result;
	},
	"masks-identity": (doc, id, data) => {
		const lines: Array<[string, string | undefined]> = [
			["Nom réel", data.realName],
			["Capacités", data.abilities],
			["Attitude", data.demeanor],
		];
		const filled = lines.filter((line) => line[1]);
		if (filled.length === 0) return null;
		const result = section(doc, id, regionOf(id).label);
		const dl = el(doc, "dl");
		for (const [label, value] of filled) {
			const row = el(doc, "div");
			row.classList.add("handbook-masks-row");
			row.appendChild(el(doc, "dt", label));
			row.appendChild(el(doc, "dd", value));
			dl.appendChild(row);
		}
		result.appendChild(dl);
		return result;
	},
	"masks-backstory": (doc, id, data) => {
		if (!data.backstory?.length) return null;
		const result = section(doc, id, regionOf(id).label);
		for (const paragraph of data.backstory) result.appendChild(el(doc, "p", paragraph));
		return result;
	},
	"masks-relationships": (doc, id, data) => {
		if (!data.relationships?.length) return null;
		const result = section(doc, id, regionOf(id).label);
		result.appendChild(plainList(doc, data.relationships));
		return result;
	},
	"masks-influence": (doc, id, data) => {
		if (!data.influence?.length) return null;
		const result = section(doc, id, regionOf(id).label);
		result.appendChild(plainList(doc, data.influence));
		return result;
	},
	/* The frame is always drawn, like Monsterhearts: a vault path or an https link fills it, otherwise it stays a blank frame to fill in. */
	"masks-illustration": (doc, id, data, resolveImage) => {
		const result = section(doc, id);
		const frame = el(doc, "figure");
		const reference = data.playbookImage?.trim();
		const source = reference ? resolveImage?.(reference) ?? (/^https:\/\//i.test(reference) ? reference : null) : null;
		if (source) {
			const image = el(doc, "img") as HTMLImageElement;
			image.src = source;
			image.alt = data.heroName ?? data.name;
			frame.appendChild(image);
		} else {
			frame.dataset.empty = "true";
			frame.appendChild(el(doc, "span", "Illustration à ajouter"));
		}
		result.appendChild(frame);
		return result;
	},
};

/** The regions this layout draws; `assert:masks-layout` compares them with the published contract. */
export const MASKS_LAYOUT_REGIONS: readonly string[] = Object.keys(RENDERERS);

/** Face placement follows the published presentation contract; the geometry is the pack's sheet. */
export function renderMasksLayout(data: MasksPlaybook, doc: Document, resolveImage?: (path: string) => string | null): HTMLElement {
	const root = el(doc, "article");
	root.classList.add("handbook-pbta-playbook", "handbook-masks-playbook");
	for (const face of contract.faces) {
		const faceNode = el(doc, "div");
		faceNode.classList.add("handbook-masks-face");
		faceNode.dataset.face = face.id;
		const header = (RENDERERS as Partial<Record<string, Renderer>>)[face.header]?.(doc, face.header, data, resolveImage);
		if (header) faceNode.appendChild(header);
		for (const [columnIndex, ids] of face.columns.entries()) {
			const column = el(doc, "div");
			column.classList.add("handbook-masks-column");
			column.dataset.column = String(columnIndex + 1);
			for (const id of ids) {
				const renderer = (RENDERERS as Partial<Record<string, Renderer>>)[id];
				const region = renderer?.(doc, id, data, resolveImage);
				if (region) column.appendChild(region);
			}
			faceNode.appendChild(column);
		}
		root.appendChild(faceNode);
	}
	return root;
}
