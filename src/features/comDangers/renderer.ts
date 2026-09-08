import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderRatedLimit } from "../blocks/tagSpan";
import { ComDangerData, ComDangerMove, ComSpectrum } from "./parser";
import { comDangerShape } from "./shape";

const MOVE_LABELS: Record<ComDangerMove["kind"], string> = {
	soft: "Soft",
	hard: "Hard",
	custom: "Custom",
};

/**
 * Open a card section, its heading carrying the printed wording of the zone.
 *
 * The zone class and the section family come from the shape; the heading has
 * to be posed here, because it must be the first thing inside the section and
 * only this side holds the element while it is still empty.
 */
function openSection(doc: Document, zone: BlockZone): HTMLElement {
	const section = doc.createElement("section");

	if (zone.heading) {
		const heading = doc.createElement("h4");
		heading.classList.add("brumes-com-danger--section-title");
		heading.textContent = zone.heading;
		section.appendChild(heading);
	}

	return section;
}

function addList(
	section: HTMLElement,
	doc: Document,
	name: string,
): HTMLElement {
	const list = doc.createElement("ul");
	list.classList.add(`brumes-com-danger--${name}-list`);
	section.appendChild(list);
	return list;
}

function renderSpectrum(spectrum: ComSpectrum, doc: Document): HTMLElement {
	const item = doc.createElement("li");
	item.classList.add("brumes-com-danger--spectrum");

	if (spectrum.immune) {
		item.dataset.immune = "true";
	}

	item.appendChild(renderRatedLimit(spectrum.name, spectrum.max, doc));

	if (spectrum.outcome) {
		const outcome = doc.createElement("span");
		outcome.classList.add("brumes-com-danger--outcome");
		outcome.textContent = spectrum.outcome;
		item.appendChild(outcome);
	}

	return item;
}

function renderMove(move: ComDangerMove, doc: Document): HTMLElement {
	const item = doc.createElement("li");
	item.classList.add(
		"brumes-com-danger--move",
		`brumes-com-danger--move-${move.kind}`,
	);

	const label = doc.createElement("span");
	label.classList.add("brumes-com-danger--move-label");
	label.textContent = MOVE_LABELS[move.kind];
	item.appendChild(label);

	if (move.name) {
		const name = doc.createElement("span");
		name.classList.add("brumes-com-danger--move-name");
		name.textContent = move.name;
		item.appendChild(name);
	}

	const text = doc.createElement("span");
	text.classList.add("brumes-com-danger--move-text");
	text.textContent = move.text;
	item.appendChild(text);

	return item;
}

export function renderComDanger(
	data: ComDangerData,
	doc: Document,
): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add("brumes-com-danger");

	// One parsed list, split in two by each spectrum's kind. The zones name the
	// halves; nothing in the vocabulary says they were ever one list.
	const defeat: ComSpectrum[] = [];
	const countdown: ComSpectrum[] = [];

	for (const spectrum of data.spectrums) {
		if (spectrum.kind === "countdown") {
			countdown.push(spectrum);
		} else {
			defeat.push(spectrum);
		}
	}

	function spectrumSection(
		zone: BlockZone,
		spectrums: ComSpectrum[],
	): HTMLElement | null {
		if (spectrums.length === 0) {
			return null;
		}

		const section = openSection(doc, zone);
		const list = addList(section, doc, "spectrum");

		for (const spectrum of spectrums) {
			list.appendChild(renderSpectrum(spectrum, doc));
		}

		return section;
	}

	renderZones(container, comDangerShape, {
		header: () => {
			const header = doc.createElement("header");

			const name = doc.createElement("div");
			name.classList.add("brumes-com-danger--name");
			name.textContent = data.name;
			header.appendChild(name);

			if (typeof data.rating === "number") {
				const rating = doc.createElement("div");
				rating.classList.add("brumes-com-danger--rating");
				rating.textContent = String(data.rating);
				header.appendChild(rating);
			}

			return header;
		},
		description: (zone) => {
			if (data.description.length === 0) {
				return null;
			}

			const description = openSection(doc, zone);

			for (const paragraph of data.description) {
				const p = doc.createElement("p");
				p.textContent = paragraph;
				description.appendChild(p);
			}

			return description;
		},
		spectrums: (zone) => spectrumSection(zone, defeat),
		countdown: (zone) => spectrumSection(zone, countdown),
		moves: (zone) => {
			if (data.moves.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = addList(section, doc, "move");

			for (const move of data.moves) {
				list.appendChild(renderMove(move, doc));
			}

			return section;
		},
		source: () => {
			if (!data.meta) {
				return null;
			}

			const source = metaSourceLine(data.meta);

			if (!source) {
				return null;
			}

			const footer = doc.createElement("footer");
			footer.textContent = source;

			return footer;
		},
	});

	return container;
}
