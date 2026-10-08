import type { MasksNpc } from "schema-pbta";
import contract from "schema-pbta/packs/masks/npc-presentation-contract.json";

type RegionId = (typeof contract.regions)[number]["id"];

function el(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	if (text !== undefined) result.textContent = text;
	return result;
}

function regionOf(id: RegionId): (typeof contract.regions)[number] {
	return contract.regions.find((region) => region.id === id) as (typeof contract.regions)[number];
}

/** Headings come from the published contract, never from literals here. */
function section(doc: Document, id: RegionId, heading?: string): HTMLElement {
	const region = regionOf(id);
	const result = el(doc, "section");
	result.classList.add("handbook-masks-npc-region");
	result.dataset.region = id;
	result.dataset.primitive = region.primitive;
	if (heading) result.appendChild(el(doc, "h3", heading));
	return result;
}

function pair(doc: Document, label: string, value: string): HTMLElement {
	const result = el(doc, "div");
	result.classList.add("handbook-masks-npc-row");
	result.appendChild(el(doc, "dt", label));
	result.appendChild(el(doc, "dd", value));
	return result;
}

function keyValue(doc: Document, id: RegionId, entries: Array<[string, string | undefined]>): HTMLElement | null {
	const present = entries.filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "");
	if (present.length === 0) return null;
	const result = section(doc, id);
	const dl = el(doc, "dl");
	for (const [label, value] of present) dl.appendChild(pair(doc, label, value));
	result.appendChild(dl);
	return result;
}

/** One notch per value from `min` to `max`; the current one is marked. */
function selfTrack(doc: Document, data: MasksNpc): HTMLElement {
	const result = section(doc, "masks-npc-self", regionOf("masks-npc-self").label);
	const track = el(doc, "ol");
	track.classList.add("handbook-masks-npc-track");
	for (let value = data.self.min; value <= data.self.max; value += 1) {
		const notch = el(doc, "li", value > 0 ? `+${value}` : String(value));
		notch.dataset.value = String(value);
		notch.dataset.marked = String(value === data.self.value);
		track.appendChild(notch);
	}
	result.appendChild(track);
	return result;
}

function renderRegion(doc: Document, id: RegionId, data: MasksNpc): HTMLElement | null {
	switch (id) {
		case "masks-npc-header": {
			const result = section(doc, id);
			result.appendChild(el(doc, "h2", data.name));
			if (data.generation) result.appendChild(el(doc, "span", data.generation));
			return result;
		}
		case "masks-npc-identity":
			return keyValue(doc, id, [
				["Nom réel", data.realName],
				["Drive", data.drive],
				["Capacités", data.abilities],
			]);
		case "masks-npc-resistance": {
			if (data.resistance === undefined && !data.conditions?.length) return null;
			const result = section(doc, id, regionOf(id).label);
			if (data.resistance !== undefined) {
				const circle = el(doc, "span", String(data.resistance));
				circle.classList.add("handbook-masks-npc-resistance");
				result.appendChild(circle);
			}
			if (data.conditions?.length) {
				const ul = el(doc, "ul");
				for (const name of data.conditions) ul.appendChild(el(doc, "li", name));
				result.appendChild(ul);
			}
			return result;
		}
		case "masks-npc-self": return selfTrack(doc, data);
		case "masks-npc-worst-self":
		case "masks-npc-best-self": {
			const text = id === "masks-npc-worst-self" ? data.worstSelf : data.bestSelf;
			if (!text) return null;
			const result = section(doc, id, regionOf(id).label);
			result.appendChild(el(doc, "p", text));
			return result;
		}
		case "masks-npc-moves": {
			if (!data.moves?.length) return null;
			const result = section(doc, id, regionOf(id).label);
			const ul = el(doc, "ul");
			for (const line of data.moves) ul.appendChild(el(doc, "li", line));
			result.appendChild(ul);
			return result;
		}
		case "masks-npc-context": {
			const result = section(doc, id, regionOf(id).label);
			for (const paragraph of data.description.split(/\n{2,}/)) result.appendChild(el(doc, "p", paragraph));
			return result;
		}
	}
	return null;
}

/** Region placement follows the published presentation contract. */
export function renderMasksNpc(data: MasksNpc, doc: Document): HTMLElement {
	const root = el(doc, "article");
	root.classList.add("handbook-pbta-npc", "handbook-masks-npc");
	const rendered = new Map<RegionId, HTMLElement>();
	for (const id of contract.canonicalOrder) {
		const region = renderRegion(doc, id, data);
		if (region) rendered.set(id, region);
	}
	const placed = new Set<RegionId>();
	const card = el(doc, "div");
	card.classList.add("handbook-masks-npc-card");
	for (const [rowIndex, columns] of contract.rows.entries()) {
		const layoutRow = el(doc, "div");
		layoutRow.classList.add("handbook-masks-npc-layout-row");
		layoutRow.dataset.row = String(rowIndex + 1);
		for (const [columnIndex, ids] of columns.entries()) {
			const column = el(doc, "div");
			column.classList.add("handbook-masks-npc-column");
			column.dataset.column = String(columnIndex + 1);
			for (const id of ids) {
				const region = rendered.get(id);
				if (region) column.appendChild(region);
				placed.add(id);
			}
			layoutRow.appendChild(column);
		}
		card.appendChild(layoutRow);
	}
	root.appendChild(card);
	/* Regions the contract keeps outside the card, then any it did not place, in canonical order. */
	for (const id of contract.canonicalOrder) {
		if (placed.has(id)) continue;
		const region = rendered.get(id);
		if (region) root.appendChild(region);
	}
	return root;
}
