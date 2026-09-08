import { renderProse } from "../blocks/proseTags";
import { renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { ThemeKitData } from "./parser";
import { themeKitShape } from "./shape";

function tagList(
	doc: Document,
	tags: string[],
	force: "power" | "weakness",
): HTMLElement | null {
	if (tags.length === 0) {
		return null;
	}

	// The class the two tag zones share is declared as their family in the
	// shape, so it is posed with the zone class and not here.
	const list = doc.createElement("ul");

	for (const tag of tags) {
		const item = doc.createElement("li");
		item.appendChild(renderTagSpan(tag, doc, { force }));
		list.appendChild(item);
	}

	return list;
}

export function renderThemeKit(data: ThemeKitData, doc: Document): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add("brumes-theme-kit");

	renderZones(container, themeKitShape, {
		category: () => {
			if (!data.category) {
				return null;
			}

			const category = doc.createElement("div");
			category.textContent = data.category.toUpperCase();

			return category;
		},
		name: () => {
			const name = doc.createElement("div");
			name.textContent = data.name;

			return name;
		},
		"power-tags": () => tagList(doc, data.powerTags, "power"),
		"weakness-tags": () => tagList(doc, data.weaknessTags, "weakness"),
		quest: () => {
			if (!data.quest) {
				return null;
			}

			const quest = doc.createElement("div");
			renderProse(quest, data.quest, doc);

			return quest;
		},
		improvement: () => {
			if (!data.improvement) {
				return null;
			}

			const improvement = doc.createElement("div");

			const name = doc.createElement("span");
			name.classList.add("brumes-theme-kit--improvement-name");
			name.textContent = data.improvement.name;
			improvement.appendChild(name);

			if (data.improvement.effect) {
				const effect = doc.createElement("span");
				effect.classList.add("brumes-theme-kit--improvement-effect");
				renderProse(effect, data.improvement.effect, doc);
				improvement.appendChild(effect);
			}

			return improvement;
		},
	});

	return container;
}
