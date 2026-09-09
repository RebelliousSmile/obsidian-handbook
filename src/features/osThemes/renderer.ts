import { metaSourceLine } from "../blocks/schemaValues";
import { renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { OsThemeData } from "./parser";
import { osThemeKitShape, osThemeShape } from "./shape";

const TYPE_LABELS = { self: "SELF", mythos: "MYTHOS", noise: "NOISE", crew: "CREW" };
const TYPE_MARKERS = { self: "●", mythos: "◆", noise: "▲", crew: "■" };
const QUEST_LABELS = { self: "Identity", mythos: "Ritual", noise: "Itch", crew: "Motivation" };

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
			const type = doc.createElement("div");
			type.classList.add("brumes-os-theme--type");
			type.textContent = `${TYPE_MARKERS[data.themeType]} ${TYPE_LABELS[data.themeType]}${data.category ? ` · ${data.category}` : ""}`;
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
		quest: () => {
			if (!data.quest) return null;
			const quest = doc.createElement("p");
			quest.textContent = `${QUEST_LABELS[data.themeType]} · ${data.quest}`;
			return quest;
		},
		"power-tags": () => renderTags(data.powerTags, doc, false),
		"weakness-tags": () => renderTags(data.weaknessTags, doc, true),
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
