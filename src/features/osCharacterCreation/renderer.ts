import { renderProse } from "../blocks/proseTags";
import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { OsThemeKitReference } from "../otherscape/types";
import { OsCreationData } from "./parser";
import { osCharacterTropeShape, osLoadoutItemShape } from "./shape";
function section(doc: Document, zone: BlockZone) { const element = doc.createElement("section"); if (zone.heading) { const h = doc.createElement("h4"); h.textContent = zone.heading; element.appendChild(h); } return element; }
function span(doc: Document, className: string, text: string): HTMLElement { const element = doc.createElement("span"); element.classList.add(className); element.textContent = text; return element; }
/** A kit reference: its title tag, its themebook, and the page it is printed on when the trope cites one. */
function referenceList(values: OsThemeKitReference[], doc: Document, boxed: boolean): HTMLElement | null {
	if (!values.length) return null;
	const list = doc.createElement("ul");
	if (boxed) list.classList.add("brumes-os-creation--choice-list");
	for (const value of values) {
		const item = doc.createElement("li");
		if (boxed) { const box = doc.createElement("input"); box.type = "checkbox"; box.disabled = true; box.classList.add("brumes-os-creation--choice-box"); item.appendChild(box); }
		const title = doc.createElement("strong"); title.textContent = value.titleTag; item.appendChild(title);
		item.appendChild(span(doc, "brumes-os-creation--kit-category", value.category));
		if (value.page !== undefined) { const page = span(doc, "brumes-os-creation--kit-page", `p. ${value.page}`); page.dataset.page = String(value.page); item.appendChild(page); }
		list.appendChild(item);
	}
	return list;
}
/** The suggested loadout, each entry highlighted like a tag on the page. */
function loadoutList(values: string[], doc: Document): HTMLElement | null {
	if (!values.length) return null;
	const list = doc.createElement("ul");
	for (const value of values) { const item = doc.createElement("li"); const mark = doc.createElement("mark"); mark.classList.add("brumes-os-creation--loadout-entry"); renderProse(mark, value, doc); item.appendChild(mark); list.appendChild(item); }
	return list;
}
export function renderOsCreation(data: OsCreationData, doc: Document): HTMLElement {
	const root = doc.createElement("article"); root.classList.add("brumes-os-creation", `brumes-os-creation--${data.kind}`); const shape = data.kind === "character-trope" ? osCharacterTropeShape : osLoadoutItemShape;
	renderZones(root, shape, {
		header: () => { const header = doc.createElement("header"); const title = doc.createElement("h3"); title.textContent = data.name; header.appendChild(title); if (data.category) { const category = doc.createElement("strong"); category.textContent = data.category; header.appendChild(category); } if (data.meta) { const source = doc.createElement("small"); source.textContent = metaSourceLine(data.meta); header.appendChild(source); } return header; },
		description: () => { if (!data.description) return null; const element = doc.createElement("section"); renderProse(element, data.description, doc); return element; },
		"theme-kits": (zone) => { if (data.kind !== "character-trope") return null; const list = referenceList(data.themeKits, doc, false); if (!list) return null; const element = section(doc, zone); element.appendChild(list); return element; },
		choices: (zone) => { if (data.kind !== "character-trope") return null; const list = referenceList(data.choices, doc, true); if (!list) return null; const element = section(doc, zone); element.appendChild(list); return element; },
		loadout: (zone) => { if (data.kind !== "character-trope") return null; const list = loadoutList(data.loadout, doc); if (!list) return null; const element = section(doc, zone); element.appendChild(list); return element; },
		"feature-tags": (zone) => { if (data.kind !== "loadout-item" || !data.featureTags.length) return null; const element = section(doc, zone); const list = doc.createElement("ul"); for (const tag of data.featureTags) { const item = doc.createElement("li"); item.appendChild(renderTagSpan(tag, doc, { force: "power" })); list.appendChild(item); } element.appendChild(list); return element; },
		"weakness-tag": (zone) => { if (data.kind !== "loadout-item" || !data.weaknessTag) return null; const element = section(doc, zone); element.appendChild(renderTagSpan(data.weaknessTag, doc, { force: "weakness" })); return element; },
	}); return root;
}
