import { renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import {
	ComThemeCardData,
	ComThemeTag,
	ComThemeTrack,
	isMismatchedTrack,
} from "./parser";
import { comThemeCardShape } from "./shape";

const DRIVE_LABELS: Record<string, string> = {
	mystery: "Mystery",
	identity: "Identity",
	neutral: "Mystery or identity",
};

const TRACK_LABELS: Record<string, string> = {
	attention: "Attention",
	fade: "Fade",
	crack: "Crack",
};

const MISMATCH_HINT =
	"This key does not match the themebook: a Mythos has a Mystery and a Fade, a Logos an Identity and a Crack.";

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

/** A track is a label followed by its boxes, ticked from the left. */
function renderTrack(track: ComThemeTrack, doc: Document): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add(
		"brumes-com-theme-card--track",
		`brumes-com-theme-card--track-${track.kind}`,
	);

	const label = doc.createElement("span");
	label.classList.add("brumes-com-theme-card--track-label");
	label.textContent = TRACK_LABELS[track.kind];
	container.appendChild(label);

	const boxes = doc.createElement("span");
	boxes.classList.add("brumes-com-theme-card--track-boxes");

	for (let index = 0; index < track.max; index++) {
		const box = doc.createElement("span");
		box.classList.add("brumes-com-theme-card--box");
		box.dataset.state = index < track.filled ? "filled" : "empty";
		boxes.appendChild(box);
	}

	container.appendChild(boxes);
	return container;
}

/** A tag sits behind the letter of the themebook question it answers. */
function renderTagItem(
	tag: ComThemeTag,
	doc: Document,
	kind: "power" | "weakness",
): HTMLElement {
	const item = doc.createElement("li");
	item.classList.add(
		"brumes-com-theme-card--tag",
		`brumes-com-theme-card--tag-${kind}`,
	);

	const question = doc.createElement("span");
	question.classList.add("brumes-com-theme-card--question");
	question.textContent = tag.question ?? "";
	item.appendChild(question);

	const span = renderTagSpan(tag.text, doc, {
		force: kind,
		burnt: tag.burnt,
	});
	item.appendChild(span);

	return item;
}

export function renderComThemeCard(
	data: ComThemeCardData,
	doc: Document,
): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add("brumes-com-theme-card");

	// The card's type is a state of the whole card, not a zone of it.
	if (data.type) {
		container.classList.add(`brumes-com-theme-card--${data.type}`);
	}

	renderZones(container, comThemeCardShape, {
		header: () => {
			const header = doc.createElement("header");
			addLine(header, doc, "brumes-com-theme-card--themebook", data.themebook);

			if (data.title) {
				addLine(header, doc, "brumes-com-theme-card--title", data.title);
			}

			return header;
		},
		drive: () => {
			if (!data.drive) {
				return null;
			}

			const drive = doc.createElement("div");
			drive.classList.add(`brumes-com-theme-card--drive-${data.drive.kind}`);

			const label = doc.createElement("span");
			label.classList.add("brumes-com-theme-card--drive-label");
			label.textContent = DRIVE_LABELS[data.drive.kind];
			drive.appendChild(label);

			const text = doc.createElement("span");
			text.classList.add("brumes-com-theme-card--drive-text");
			text.textContent = data.drive.text;
			drive.appendChild(text);

			if (data.drive.mismatched) {
				drive.classList.add("brumes-com-theme-card--mismatch");
				drive.title = MISMATCH_HINT;
			}

			return drive;
		},
		tags: () => {
			if (data.powerTags.length === 0 && data.weaknessTags.length === 0) {
				return null;
			}

			const list = doc.createElement("ul");

			for (const tag of data.powerTags) {
				list.appendChild(renderTagItem(tag, doc, "power"));
			}

			for (const tag of data.weaknessTags) {
				list.appendChild(renderTagItem(tag, doc, "weakness"));
			}

			return list;
		},
		improvements: () => {
			if (data.improvements.length === 0) {
				return null;
			}

			const list = doc.createElement("ul");

			for (const improvement of data.improvements) {
				const item = doc.createElement("li");
				item.classList.add("brumes-com-theme-card--improvement");

				const name = doc.createElement("span");
				name.classList.add("brumes-com-theme-card--improvement-name");
				name.textContent = improvement.name;
				item.appendChild(name);

				if (improvement.effect) {
					const effect = doc.createElement("span");
					effect.classList.add("brumes-com-theme-card--improvement-effect");
					effect.textContent = improvement.effect;
					item.appendChild(effect);
				}

				list.appendChild(item);
			}

			return list;
		},
		tracks: () => {
			if (!data.attention && !data.deterioration) {
				return null;
			}

			const footer = doc.createElement("footer");

			if (data.attention) {
				footer.appendChild(renderTrack(data.attention, doc));
			}

			if (data.deterioration) {
				const track = renderTrack(data.deterioration, doc);

				if (isMismatchedTrack(data)) {
					track.classList.add("brumes-com-theme-card--mismatch");
					track.title = MISMATCH_HINT;
				}

				footer.appendChild(track);
			}

			return footer;
		},
	});

	return container;
}
