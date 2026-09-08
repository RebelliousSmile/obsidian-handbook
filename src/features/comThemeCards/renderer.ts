import { renderProse } from "../blocks/proseTags";
import { renderTagSpan } from "../blocks/tagSpan";
import {
	ComThemeCardData,
	ComThemeTag,
	ComThemeTrack,
	isMismatchedTrack,
} from "./parser";

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
	line.appendChild(renderProse(text, doc));
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

	if (data.type) {
		container.classList.add(`brumes-com-theme-card--${data.type}`);
	}

	const header = doc.createElement("header");
	header.classList.add("brumes-com-theme-card--header");
	addLine(
		header,
		doc,
		"brumes-com-theme-card--themebook",
		data.themebook,
	);

	if (data.title) {
		addLine(header, doc, "brumes-com-theme-card--title", data.title);
	}

	container.appendChild(header);

	if (data.drive) {
		const drive = doc.createElement("div");
		drive.classList.add(
			"brumes-com-theme-card--drive",
			`brumes-com-theme-card--drive-${data.drive.kind}`,
		);

		const label = doc.createElement("span");
		label.classList.add("brumes-com-theme-card--drive-label");
		label.textContent = DRIVE_LABELS[data.drive.kind];
		drive.appendChild(label);

		const text = doc.createElement("span");
		text.classList.add("brumes-com-theme-card--drive-text");
		text.appendChild(renderProse(data.drive.text, doc));
		drive.appendChild(text);

		if (data.drive.mismatched) {
			drive.classList.add("brumes-com-theme-card--mismatch");
			drive.title = MISMATCH_HINT;
		}

		container.appendChild(drive);
	}

	if (data.powerTags.length > 0 || data.weaknessTags.length > 0) {
		const list = doc.createElement("ul");
		list.classList.add("brumes-com-theme-card--tags");

		for (const tag of data.powerTags) {
			list.appendChild(renderTagItem(tag, doc, "power"));
		}

		for (const tag of data.weaknessTags) {
			list.appendChild(renderTagItem(tag, doc, "weakness"));
		}

		container.appendChild(list);
	}

	if (data.improvements.length > 0) {
		const list = doc.createElement("ul");
		list.classList.add("brumes-com-theme-card--improvements");

		for (const improvement of data.improvements) {
			const item = doc.createElement("li");
			item.classList.add("brumes-com-theme-card--improvement");

			const name = doc.createElement("span");
			name.classList.add("brumes-com-theme-card--improvement-name");
			name.textContent = improvement.name;
			item.appendChild(name);

			if (improvement.effect) {
				const effect = doc.createElement("span");
				effect.classList.add(
					"brumes-com-theme-card--improvement-effect",
				);
				effect.appendChild(renderProse(improvement.effect, doc));
				item.appendChild(effect);
			}

			list.appendChild(item);
		}

		container.appendChild(list);
	}

	if (data.attention || data.deterioration) {
		const footer = doc.createElement("footer");
		footer.classList.add("brumes-com-theme-card--tracks");

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

		container.appendChild(footer);
	}

	return container;
}
