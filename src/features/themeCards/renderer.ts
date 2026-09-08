import { renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { ThemeCardData } from "./parser";
import { themeCardShape } from "./shape";

export function renderThemeCard(
	data: ThemeCardData,
	doc: Document,
): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add(
		"brumes-story-theme",
		`brumes-story-theme--might-${data.level}`,
	);

	renderZones(container, themeCardShape, {
		category: () => {
			if (!data.category) {
				return null;
			}

			const category = doc.createElement("div");
			category.textContent = data.category.toUpperCase();

			return category;
		},
		// The title tag is the card's first power tag, drawn apart from the
		// others because the frame gives it its own band.
		"title-box": () => {
			const titleBox = doc.createElement("div");
			const titleTag = doc.createElement("span");
			titleTag.classList.add("brumes-story-theme--title");
			titleTag.dataset.name = data.titleTag;
			titleTag.textContent = data.titleTag;
			titleBox.appendChild(titleTag);

			return titleBox;
		},
		tags: () => {
			const tagList = doc.createElement("ul");

			for (const tag of data.powerTags) {
				const li = doc.createElement("li");
				li.appendChild(renderTagSpan(tag, doc, { force: "power" }));
				tagList.appendChild(li);
			}

			for (const tag of data.weaknessTags) {
				const li = doc.createElement("li");
				li.appendChild(renderTagSpan(tag, doc, { force: "weakness" }));
				tagList.appendChild(li);
			}

			return tagList;
		},
	});

	return container;
}
