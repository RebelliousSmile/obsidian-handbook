import { BlockZone, renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { JourneyData } from "./parser";
import { journeyShape } from "./shape";

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
		heading.classList.add("brumes-journey--section-title");
		heading.textContent = zone.heading;
		section.appendChild(heading);
	}

	return section;
}

function addLine(
	parent: HTMLElement,
	doc: Document,
	className: string,
	text: string,
): HTMLElement {
	const line = doc.createElement("div");
	line.classList.add(className);
	line.textContent = text;
	parent.appendChild(line);
	return line;
}

function addConsequences(
	parent: HTMLElement,
	doc: Document,
	consequences: string[],
): void {
	const list = doc.createElement("ul");
	list.classList.add("brumes-journey--consequence-list");

	for (const consequence of consequences) {
		const item = doc.createElement("li");
		item.classList.add("brumes-journey--consequence");
		item.textContent = consequence;
		list.appendChild(item);
	}

	parent.appendChild(list);
}

export function renderJourney(data: JourneyData, doc: Document): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add("brumes-journey", `brumes-journey--${data.type}`);

	renderZones(container, journeyShape, {
		header: () => {
			const header = doc.createElement("header");
			addLine(header, doc, "brumes-journey--type", data.type);
			addLine(header, doc, "brumes-journey--name", data.name);

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
		tags: (zone) => {
			if (data.tags.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = doc.createElement("ul");
			list.classList.add("brumes-journey--tag-list");

			for (const tag of data.tags) {
				const item = doc.createElement("li");
				item.appendChild(renderTagSpan(tag, doc));
				list.appendChild(item);
			}

			section.appendChild(list);

			return section;
		},
		benefits: (zone) => {
			if (!data.benefits) {
				return null;
			}

			const section = openSection(doc, zone);
			addLine(section, doc, "brumes-journey--benefits-text", data.benefits);

			return section;
		},
		consequences: (zone) => {
			if (data.consequences.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			addConsequences(section, doc, data.consequences);

			return section;
		},
		vignettes: (zone) => {
			if (data.vignettes.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = doc.createElement("ul");
			list.classList.add("brumes-journey--vignette-list");

			for (const vignette of data.vignettes) {
				const item = doc.createElement("li");
				item.classList.add("brumes-journey--vignette");
				addLine(item, doc, "brumes-journey--vignette-name", vignette.name);

				if (vignette.trigger) {
					addLine(
						item,
						doc,
						"brumes-journey--vignette-trigger",
						vignette.trigger,
					);
				}

				if (vignette.consequences.length > 0) {
					addConsequences(item, doc, vignette.consequences);
				}

				list.appendChild(item);
			}

			section.appendChild(list);

			return section;
		},
	});

	return container;
}
