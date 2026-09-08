import { renderProse } from "../blocks/proseTags";
import { renderTagSpan } from "../blocks/tagSpan";
import { JourneyData } from "./parser";

/** Open a card section, its heading carrying the printed journey wording. */
function addSection(
	container: HTMLElement,
	doc: Document,
	name: string,
	title: string,
): HTMLElement {
	const section = doc.createElement("section");
	section.classList.add("brumes-journey--section", `brumes-journey--${name}`);

	const heading = doc.createElement("h4");
	heading.classList.add("brumes-journey--section-title");
	heading.textContent = title;
	section.appendChild(heading);

	container.appendChild(section);
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
	line.appendChild(renderProse(text, doc));
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
		item.appendChild(renderProse(consequence, doc));
		list.appendChild(item);
	}

	parent.appendChild(list);
}

function addWarnings(
	container: HTMLElement,
	doc: Document,
	warnings: string[],
): void {
	if (warnings.length === 0) {
		return;
	}

	const footer = doc.createElement("footer");
	footer.classList.add("brumes-journey--warnings");

	const title = doc.createElement("p");
	title.classList.add("brumes-journey--warnings-title");
	title.textContent =
		warnings.length === 1
			? "1 thing was not understood while parsing this journey:"
			: `${warnings.length} things were not understood while parsing this journey:`;
	footer.appendChild(title);

	const list = doc.createElement("ul");
	list.classList.add("brumes-journey--warnings-list");

	for (const warning of warnings) {
		const item = doc.createElement("li");
		item.textContent = warning;
		list.appendChild(item);
	}

	footer.appendChild(list);
	container.appendChild(footer);
}

export function renderJourney(data: JourneyData, doc: Document): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add("brumes-journey", `brumes-journey--${data.type}`);

	const header = doc.createElement("header");
	header.classList.add("brumes-journey--header");
	addLine(header, doc, "brumes-journey--type", data.type);
	addLine(header, doc, "brumes-journey--name", data.name);
	container.appendChild(header);

	if (data.description.length > 0) {
		const description = doc.createElement("section");
		description.classList.add(
			"brumes-journey--section",
			"brumes-journey--description",
		);

		for (const paragraph of data.description) {
			const p = doc.createElement("p");
			p.appendChild(renderProse(paragraph, doc));
			description.appendChild(p);
		}

		container.appendChild(description);
	}

	if (data.tags.length > 0) {
		const section = addSection(container, doc, "tags", "Tags");
		const list = doc.createElement("ul");
		list.classList.add("brumes-journey--tag-list");

		for (const tag of data.tags) {
			const item = doc.createElement("li");
			item.appendChild(renderTagSpan(tag, doc));
			list.appendChild(item);
		}

		section.appendChild(list);
	}

	if (data.benefits) {
		const section = addSection(container, doc, "benefits", "Benefits");
		addLine(section, doc, "brumes-journey--benefits-text", data.benefits);
	}

	if (data.consequences.length > 0) {
		const section = addSection(
			container,
			doc,
			"consequences",
			"General consequences",
		);
		addConsequences(section, doc, data.consequences);
	}

	if (data.vignettes.length > 0) {
		const section = addSection(container, doc, "vignettes", "Vignettes");
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
	}

	addWarnings(container, doc, data.warnings);

	return container;
}
