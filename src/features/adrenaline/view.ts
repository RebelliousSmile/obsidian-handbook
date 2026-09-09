import {
	AdrenalineMeta,
	CHARACTERISTIC_KEYS,
	Characteristics,
	Health,
} from "./document";

export function adrenalineSection(
	doc: Document,
	heading: string,
	className: string,
): HTMLElement {
	const section = doc.createElement("section");
	section.classList.add("brumes-adrenaline--section", className);
	const title = doc.createElement("h4");
	title.textContent = heading;
	section.appendChild(title);
	return section;
}

export function adrenalineList(
	doc: Document,
	values: string[],
	className: string,
): HTMLElement {
	const list = doc.createElement("ul");
	list.classList.add(className);
	for (const value of values) {
		const item = doc.createElement("li");
		item.textContent = value;
		list.appendChild(item);
	}
	return list;
}

export function renderCharacteristics(
	doc: Document,
	characteristics: Characteristics,
): HTMLElement {
	const grid = doc.createElement("dl");
	grid.classList.add("brumes-adrenaline--characteristics");
	for (const key of CHARACTERISTIC_KEYS) {
		const value = characteristics[key];
		if (value === undefined) continue;
		const term = doc.createElement("dt");
		term.textContent = key.toUpperCase();
		const detail = doc.createElement("dd");
		detail.textContent = `${value} %`;
		grid.appendChild(term);
		grid.appendChild(detail);
	}
	return grid;
}

export function renderHealth(doc: Document, health: Health): HTMLElement {
	const grid = doc.createElement("div");
	grid.classList.add("brumes-adrenaline--health");
	for (const sideName of ["physique", "mental"] as const) {
		const side = health[sideName];
		if (!side) continue;
		const sideElement = doc.createElement("div");
		sideElement.classList.add(`brumes-adrenaline--health-${sideName}`);
		for (const thresholdName of ["superficiel", "leger", "grave", "profond"] as const) {
			const threshold = side[thresholdName];
			if (!threshold) continue;
			const row = doc.createElement("div");
			row.textContent = `${thresholdName}: ${threshold.base}${
				threshold.couvert === undefined ? "" : ` / ${threshold.couvert}`
			}`;
			sideElement.appendChild(row);
		}
		grid.appendChild(sideElement);
	}
	return grid;
}

export function renderProvenance(doc: Document, meta: AdrenalineMeta): HTMLElement {
	const footer = doc.createElement("footer");
	footer.classList.add("brumes-adrenaline--provenance");
	const parts: string[] = [];
	if (meta.typeDePublication) parts.push(meta.typeDePublication);
	if (meta.source) parts.push(meta.source);
	if (meta.auteurs) parts.push(meta.auteurs.join(", "));
	if (meta.page !== undefined) parts.push(`p. ${meta.page}`);
	if (meta.licence) parts.push(meta.licence);
	footer.textContent = parts.join(" · ");
	return footer;
}
