/** What the three Monster of the Week cards and the booklet share: the hooks of a region, the boxes, the lists. */
export interface MotwContract {
	regions: ReadonlyArray<{ id: string; label: string; primitive: string }>;
	canonicalOrder: readonly string[];
}

/** A card contract also places its regions in rows of columns and keeps some outside the frame. */
export interface MotwCardContract extends MotwContract {
	rows: ReadonlyArray<ReadonlyArray<readonly string[]>>;
	outsideCard: readonly string[];
}

export type MotwEntry = { label: string; checked?: boolean; note?: string };

export function el(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	if (text !== undefined) result.textContent = text;
	return result;
}

export function regionOf(contract: MotwContract, id: string): MotwContract["regions"][number] {
	return contract.regions.find((region) => region.id === id) as MotwContract["regions"][number];
}

/** Headings come from the published contract, never from literals here. */
export function section(doc: Document, contract: MotwContract, id: string, withHeading = true): HTMLElement {
	const region = regionOf(contract, id);
	const result = el(doc, "section");
	result.classList.add("handbook-motw-region");
	result.dataset.region = id;
	result.dataset.primitive = region.primitive;
	result.setAttribute("style", `--pbta-region-order: ${contract.canonicalOrder.indexOf(id)}`);
	if (withHeading) result.appendChild(el(doc, "h3", region.label));
	return result;
}

export function checkbox(doc: Document, checked: boolean, label: string): HTMLInputElement {
	const input = el(doc, "input") as HTMLInputElement;
	input.type = "checkbox";
	input.checked = checked;
	input.disabled = true;
	input.setAttribute("aria-label", label);
	return input;
}

/** A line to tick per entry; the entry the document holds is ticked. */
export function checks(doc: Document, entries: readonly MotwEntry[]): HTMLElement {
	const list = el(doc, "ul");
	list.classList.add("handbook-motw-checks");
	for (const entry of entries) {
		const item = el(doc, "li");
		item.appendChild(checkbox(doc, entry.checked === true, entry.label));
		item.appendChild(el(doc, "span", entry.label));
		if (entry.note) item.appendChild(el(doc, "em", entry.note));
		list.appendChild(item);
	}
	return list;
}

export function plainList(doc: Document, values: readonly string[]): HTMLElement {
	const list = el(doc, "ul");
	for (const value of values) list.appendChild(el(doc, "li", value));
	return list;
}

export function paragraphs(doc: Document, parent: HTMLElement, text: string): void {
	for (const paragraph of text.split(/\n{2,}/)) parent.appendChild(el(doc, "p", paragraph));
}

/** `max` boxes, the first `marked` of them ticked, then the name of the track. */
export function boxesLine(doc: Document, label: string, max: number, marked: number): HTMLElement {
	const item = el(doc, "li");
	item.classList.add("handbook-motw-boxes");
	for (let index = 1; index <= max; index += 1) item.appendChild(checkbox(doc, index <= marked, `${label} ${index}`));
	item.appendChild(el(doc, "span", label));
	return item;
}

/** A key and its value on one line; a missing value is not drawn. */
export function keyValue(doc: Document, entries: ReadonlyArray<readonly [string, string | undefined]>): HTMLElement | null {
	const present = entries.filter((entry): entry is readonly [string, string] => entry[1] !== undefined && entry[1] !== "");
	if (present.length === 0) return null;
	const dl = el(doc, "dl");
	for (const [label, value] of present) {
		const row = el(doc, "div");
		row.appendChild(el(doc, "dt", label));
		row.appendChild(el(doc, "dd", value));
		dl.appendChild(row);
	}
	return dl;
}

/** The harm boxes of a creature and its armour: the part its monster sheet and its threat page print alike. */
export function harmRegion(
	doc: Document,
	contract: MotwContract,
	id: string,
	data: { harmCapacity?: number; harmMarked?: number; armour?: number; armourNote?: string },
	labels: { harm: string; armour: string },
): HTMLElement | null {
	if (data.harmCapacity === undefined && data.armour === undefined) return null;
	const result = section(doc, contract, id);
	if (data.harmCapacity !== undefined) {
		const list = el(doc, "ul");
		list.appendChild(boxesLine(doc, labels.harm, data.harmCapacity, data.harmMarked ?? 0));
		result.appendChild(list);
	}
	if (data.armour !== undefined) {
		result.appendChild(el(doc, "p", data.armourNote ? `${labels.armour} ${data.armour} — ${data.armourNote}` : `${labels.armour} ${data.armour}`));
	}
	return result;
}

/** Headings of the stat block both creature documents print. */
export interface MotwStatBlock {
	motivation: string;
	description?: string;
	powers?: string[];
	attacks?: string[];
	harmCapacity?: number;
	harmMarked?: number;
	armour?: number;
	armourNote?: string;
	weaknesses?: string[];
}

/** The regions a monster sheet and a threat page draw alike; `prefix` is the part of the id before the field. */
export function statBlockRegion(
	doc: Document,
	contract: MotwContract,
	prefix: string,
	id: string,
	data: MotwStatBlock,
	labels: { harm: string; armour: string },
): HTMLElement | null {
	switch (id.slice(prefix.length)) {
		case "motivation": {
			const result = section(doc, contract, id);
			result.appendChild(el(doc, "p", data.motivation));
			return result;
		}
		case "powers":
		case "attacks":
		case "weaknesses": {
			const lines = data[id.slice(prefix.length) as "powers" | "attacks" | "weaknesses"];
			if (!lines?.length) return null;
			const result = section(doc, contract, id);
			result.appendChild(plainList(doc, lines));
			return result;
		}
		case "harm": return harmRegion(doc, contract, id, data, labels);
		case "context": {
			if (!data.description) return null;
			const result = section(doc, contract, id);
			paragraphs(doc, result, data.description);
			return result;
		}
	}
	return null;
}

/**
 * Places the regions a card draws in the rows and columns of its contract; the ones the contract
 * keeps outside the frame, then any it did not place, follow in canonical order.
 */
export function renderCard(
	doc: Document,
	contract: MotwCardContract,
	classes: readonly string[],
	draw: (id: string) => HTMLElement | null,
): HTMLElement {
	const root = el(doc, "article");
	root.classList.add(...classes);
	const rendered = new Map<string, HTMLElement>();
	for (const id of contract.canonicalOrder) {
		const region = draw(id);
		if (region) rendered.set(id, region);
	}
	const placed = new Set<string>();
	const card = el(doc, "div");
	card.classList.add("handbook-motw-card");
	for (const [rowIndex, columns] of contract.rows.entries()) {
		const row = el(doc, "div");
		row.classList.add("handbook-motw-row");
		row.dataset.row = String(rowIndex + 1);
		for (const [columnIndex, ids] of columns.entries()) {
			const column = el(doc, "div");
			column.classList.add("handbook-motw-column");
			column.dataset.column = String(columnIndex + 1);
			for (const id of ids) {
				const region = rendered.get(id);
				if (region) column.appendChild(region);
				placed.add(id);
			}
			row.appendChild(column);
		}
		card.appendChild(row);
	}
	root.appendChild(card);
	for (const id of contract.canonicalOrder) {
		if (placed.has(id)) continue;
		const region = rendered.get(id);
		if (region) root.appendChild(region);
	}
	return root;
}
