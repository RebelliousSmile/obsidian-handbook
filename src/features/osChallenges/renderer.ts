import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderProse } from "../blocks/proseTags";
import { renderRatedLimit, renderTagSpan } from "../blocks/tagSpan";
import { OsProfileData } from "./parser";
import { osChallengeShape, osPowerSetShape } from "./shape";

function section(doc: Document, zone: BlockZone): HTMLElement {
	const element = doc.createElement("section");
	if (zone.heading) { const h = doc.createElement("h4"); h.textContent = zone.heading; element.appendChild(h); }
	return element;
}
function prose(parent: HTMLElement, text: string, doc: Document) { const p = doc.createElement("p"); renderProse(p, text, doc); parent.appendChild(p); }
function proseList(values: string[], doc: Document): HTMLElement {
	const list = doc.createElement("ul"); for (const value of values) { const item = doc.createElement("li"); renderProse(item, value, doc); list.appendChild(item); } return list;
}

export function renderOsProfile(data: OsProfileData, doc: Document): HTMLElement {
	const root = doc.createElement("article"); root.classList.add("brumes-os-profile", `brumes-os-profile--${data.kind}`);
	const shape = data.kind === "challenge" ? osChallengeShape : osPowerSetShape;
	renderZones(root, shape, {
		header: () => { const header = doc.createElement("header"); const title = doc.createElement("h3"); title.textContent = data.name; header.appendChild(title); const kind = doc.createElement("strong"); kind.textContent = data.kind === "challenge" ? `CHALLENGE${data.scale === undefined ? "" : ` · SCALE ${data.scale}`}` : `POWER SET · ${data.type?.toUpperCase()}`; header.appendChild(kind); if (data.meta) { const small = doc.createElement("small"); small.textContent = metaSourceLine(data.meta); header.appendChild(small); } return header; },
		description: () => { if (!data.description) return null; const element = doc.createElement("section"); prose(element, data.description, doc); return element; },
		limits: (zone) => { if (!data.limits.length) return null; const element = section(doc, zone); const list = doc.createElement("ul"); for (const limit of data.limits) { const item = doc.createElement("li"); item.appendChild(renderRatedLimit(limit.name, String(limit.level), doc)); if (limit.isPolar) item.classList.add("brumes-os-profile--polar"); if (limit.isProgress) item.classList.add("brumes-os-profile--progress"); if (limit.onMax) prose(item, limit.onMax, doc); list.appendChild(item); } element.appendChild(list); return element; },
		tags: (zone) => { if (!data.tagsAndStatuses.length) return null; const element = section(doc, zone); const list = doc.createElement("ul"); for (const tag of data.tagsAndStatuses) { const item = doc.createElement("li"); item.appendChild(renderTagSpan(tag.replace(/^\{|\}$/g, ""), doc)); list.appendChild(item); } element.appendChild(list); return element; },
		specials: (zone) => { if (!data.specials.length) return null; const element = section(doc, zone); for (const special of data.specials) { const item = doc.createElement("div"); const name = doc.createElement("strong"); name.textContent = special.name; item.appendChild(name); prose(item, special.description, doc); element.appendChild(item); } return element; },
		threats: (zone) => { if (!data.threats.length) return null; const element = section(doc, zone); for (const threat of data.threats) { const item = doc.createElement("div"); item.classList.add("brumes-os-profile--threat"); const name = doc.createElement("strong"); name.textContent = threat.name; item.appendChild(name); prose(item, threat.description, doc); if (threat.consequences.length) item.appendChild(proseList(threat.consequences, doc)); element.appendChild(item); } return element; },
		"general-consequences": (zone) => { if (!data.generalConsequences.length) return null; const element = section(doc, zone); element.appendChild(proseList(data.generalConsequences, doc)); return element; },
	}); return root;
}
