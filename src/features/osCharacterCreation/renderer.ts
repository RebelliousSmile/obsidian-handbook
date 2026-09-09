import { renderProse } from "../blocks/proseTags";
import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { OsThemeKitReference } from "../otherscape/types";
import { OsCreationData } from "./parser";
import { osCharacterTropeShape, osLoadoutItemShape } from "./shape";
function section(doc: Document, zone: BlockZone) { const element = doc.createElement("section"); if (zone.heading) { const h = doc.createElement("h4"); h.textContent = zone.heading; element.appendChild(h); } return element; }
function referenceList(values: OsThemeKitReference[], doc: Document): HTMLElement | null { if (!values.length) return null; const list = doc.createElement("ul"); for (const value of values) { const item = doc.createElement("li"); const title = doc.createElement("strong"); title.textContent = value.titleTag; item.appendChild(title); const category = doc.createElement("span"); category.textContent = ` · ${value.category}`; item.appendChild(category); list.appendChild(item); } return list; }
function stringList(values: string[], doc: Document): HTMLElement | null { if (!values.length) return null; const list = doc.createElement("ul"); for (const value of values) { const item = doc.createElement("li"); renderProse(item, value, doc); list.appendChild(item); } return list; }
export function renderOsCreation(data: OsCreationData, doc: Document): HTMLElement {
	const root = doc.createElement("article"); root.classList.add("brumes-os-creation", `brumes-os-creation--${data.kind}`); const shape = data.kind === "character-trope" ? osCharacterTropeShape : osLoadoutItemShape;
	renderZones(root, shape, {
		header: () => { const header = doc.createElement("header"); const title = doc.createElement("h3"); title.textContent = data.name; header.appendChild(title); if (data.category) { const category = doc.createElement("strong"); category.textContent = data.category; header.appendChild(category); } if (data.meta) { const source = doc.createElement("small"); source.textContent = metaSourceLine(data.meta); header.appendChild(source); } return header; },
		description: () => { if (!data.description) return null; const element = doc.createElement("section"); renderProse(element, data.description, doc); return element; },
		"theme-kits": (zone) => { if (data.kind !== "character-trope") return null; const list = referenceList(data.themeKits, doc); if (!list) return null; const element = section(doc, zone); element.appendChild(list); return element; },
		choices: (zone) => { if (data.kind !== "character-trope") return null; const list = referenceList(data.choices, doc); if (!list) return null; const element = section(doc, zone); element.appendChild(list); return element; },
		loadout: (zone) => { if (data.kind !== "character-trope") return null; const list = stringList(data.loadout, doc); if (!list) return null; const element = section(doc, zone); element.appendChild(list); return element; },
		"feature-tags": (zone) => { if (data.kind !== "loadout-item" || !data.featureTags.length) return null; const element = section(doc, zone); const list = doc.createElement("ul"); for (const tag of data.featureTags) { const item = doc.createElement("li"); item.appendChild(renderTagSpan(tag, doc, { force: "power" })); list.appendChild(item); } element.appendChild(list); return element; },
		"weakness-tag": (zone) => { if (data.kind !== "loadout-item" || !data.weaknessTag) return null; const element = section(doc, zone); element.appendChild(renderTagSpan(data.weaknessTag, doc, { force: "weakness" })); return element; },
	}); return root;
}
