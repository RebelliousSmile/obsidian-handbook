import { renderProse } from "../blocks/proseTags";
import { renderRatedLimit } from "../blocks/tagSpan";
import { ComDangerData, ComDangerMove, ComSpectrum } from "./parser";

const MOVE_LABELS: Record<ComDangerMove["kind"], string> = {
	soft: "Soft",
	hard: "Hard",
	custom: "Custom",
};

/** Open a card section, its heading carrying the printed profile wording. */
function addSection(
	container: HTMLElement,
	doc: Document,
	name: string,
	title: string,
): HTMLElement {
	const section = doc.createElement("section");
	section.classList.add(
		"brumes-com-danger--section",
		`brumes-com-danger--${name}`,
	);

	const heading = doc.createElement("h4");
	heading.classList.add("brumes-com-danger--section-title");
	heading.textContent = title;
	section.appendChild(heading);

	container.appendChild(section);
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
		outcome.appendChild(renderProse(spectrum.outcome, doc));
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
	text.appendChild(renderProse(move.text, doc));
	item.appendChild(text);

	return item;
}

export function renderComDanger(
	data: ComDangerData,
	doc: Document,
): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add("brumes-com-danger");

	const header = doc.createElement("header");
	header.classList.add("brumes-com-danger--header");

	const name = doc.createElement("div");
	name.classList.add("brumes-com-danger--name");
	name.textContent = data.name;
	header.appendChild(name);
	container.appendChild(header);

	if (data.description.length > 0) {
		const description = doc.createElement("section");
		description.classList.add(
			"brumes-com-danger--section",
			"brumes-com-danger--description",
		);

		for (const paragraph of data.description) {
			const p = doc.createElement("p");
			p.appendChild(renderProse(paragraph, doc));
			description.appendChild(p);
		}

		container.appendChild(description);
	}

	const defeat: ComSpectrum[] = [];
	const countdown: ComSpectrum[] = [];

	for (const spectrum of data.spectrums) {
		if (spectrum.kind === "countdown") {
			countdown.push(spectrum);
		} else {
			defeat.push(spectrum);
		}
	}

	if (defeat.length > 0) {
		const section = addSection(container, doc, "spectrums", "Spectrums");
		const list = addList(section, doc, "spectrum");

		for (const spectrum of defeat) {
			list.appendChild(renderSpectrum(spectrum, doc));
		}
	}

	if (countdown.length > 0) {
		const section = addSection(
			container,
			doc,
			"countdown",
			"Countdown spectrums",
		);
		const list = addList(section, doc, "spectrum");

		for (const spectrum of countdown) {
			list.appendChild(renderSpectrum(spectrum, doc));
		}
	}

	if (data.moves.length > 0) {
		const section = addSection(container, doc, "moves", "Moves");
		const list = addList(section, doc, "move");

		for (const move of data.moves) {
			list.appendChild(renderMove(move, doc));
		}
	}

	return container;
}
