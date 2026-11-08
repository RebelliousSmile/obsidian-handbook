import { renderProse } from "../blocks/proseTags";
import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { osQuestLabel, osThemeTypeLabel } from "../otherscape/labels";
import { OsThemeData } from "./parser";
import { osThemeKitShape, osThemeShape } from "./shape";

function span(doc: Document, className: string, text: string): HTMLElement {
	const element = doc.createElement("span");
	element.classList.add(className);
	element.textContent = text;
	return element;
}

/** A tag list, under its zone heading when the shape prints one (a kit does, a played theme does not). */
function tagZone(zone: BlockZone, tags: string[], doc: Document, weakness: boolean): HTMLElement | null {
	const list = renderTags(tags, doc, weakness);
	if (!list || !zone.heading) return list;
	const element = doc.createElement("section");
	const heading = doc.createElement("h4");
	heading.textContent = zone.heading;
	element.appendChild(heading);
	element.appendChild(list);
	return element;
}

function osTag(raw: string, doc: Document, weakness = false): HTMLElement {
	const burnt = raw.startsWith("~{") && raw.endsWith("}");
	const braced = (burnt || (raw.startsWith("{") && raw.endsWith("}")))
		? raw.slice(burnt ? 2 : 1, -1).trim()
		: raw;
	return renderTagSpan(braced, doc, { force: weakness ? "weakness" : "power", burnt });
}

function renderTags(data: string[], doc: Document, weakness: boolean): HTMLElement | null {
	if (!data.length) return null;
	const list = doc.createElement("ul");
	for (const tag of data) {
		const item = doc.createElement("li");
		item.appendChild(osTag(tag, doc, weakness));
		list.appendChild(item);
	}
	return list;
}

function renderTrack(label: string, value: number, doc: Document): HTMLElement {
	const track = doc.createElement("div");
	track.classList.add("brumes-os-theme--track");
	const name = doc.createElement("span");
	name.textContent = label;
	track.appendChild(name);
	for (let index = 0; index < 3; index++) {
		const mark = doc.createElement("span");
		mark.classList.add("brumes-os-theme--track-mark");
		mark.dataset.state = index < value ? "filled" : "empty";
		mark.textContent = index < value ? "●" : "○";
		track.appendChild(mark);
	}
	return track;
}

export function renderOsTheme(data: OsThemeData, doc: Document): HTMLElement {
	const container = doc.createElement("article");
	container.classList.add("brumes-os-theme", `brumes-os-theme--${data.themeType}`);
	if (data.isKit) container.classList.add("brumes-os-theme--kit");
	const shape = data.isKit ? osThemeKitShape : osThemeShape;

	renderZones(container, shape, {
		header: () => {
			const header = doc.createElement("header");
			// The icon is the pack's, drawn from the theme type class on the root.
			header.appendChild(span(doc, "brumes-os-theme--icon", ""));
			const type = doc.createElement("div");
			type.classList.add("brumes-os-theme--type");
			if (data.category) {
				type.appendChild(span(doc, "brumes-os-theme--category", data.category));
			}
			type.appendChild(span(doc, "brumes-os-theme--type-name", osThemeTypeLabel(data.themeType)));
			header.appendChild(type);
			const title = doc.createElement("h3");
			title.appendChild(osTag(data.titleTag, doc));
			header.appendChild(title);
			if (data.meta) {
				const source = doc.createElement("small");
				source.textContent = metaSourceLine(data.meta);
				header.appendChild(source);
			}
			return header;
		},
		description: () => {
			if (!data.description) return null;
			const element = doc.createElement("section");
			for (const paragraph of data.description.split(/\n\s*\n/)) {
				const p = doc.createElement("p");
				renderProse(p, paragraph.trim(), doc);
				element.appendChild(p);
			}
			return element;
		},
		quest: () => {
			if (!data.quest) return null;
			const quest = doc.createElement("p");
			quest.appendChild(span(doc, "brumes-os-theme--quest-label", osQuestLabel(data.themeType)));
			quest.appendChild(span(doc, "brumes-os-theme--quest-text", data.quest));
			return quest;
		},
		"power-tags": (zone) => tagZone(zone, data.powerTags, doc, false),
		"weakness-tags": (zone) => tagZone(zone, data.weaknessTags, doc, true),
		special: (zone) => {
			if (!data.special) return null;
			const element = doc.createElement("section");
			if (zone.heading) {
				const heading = doc.createElement("h4");
				heading.textContent = zone.heading;
				element.appendChild(heading);
			}
			const line = doc.createElement("p");
			const box = doc.createElement("input");
			box.type = "checkbox";
			box.disabled = true;
			box.classList.add("brumes-os-theme--special-box");
			line.appendChild(box);
			line.appendChild(span(doc, "brumes-os-theme--special-name", data.special.name));
			const description = doc.createElement("span");
			description.classList.add("brumes-os-theme--special-text");
			renderProse(description, data.special.description, doc);
			line.appendChild(description);
			element.appendChild(line);
			return element;
		},
		tracks: () => {
			if (data.isKit) return null;
			const tracks = doc.createElement("footer");
			tracks.appendChild(renderTrack("Upgrade", data.upgrade ?? 0, doc));
			tracks.appendChild(renderTrack("Decay", data.decay ?? 0, doc));
			return tracks;
		},
	});
	return container;
}
