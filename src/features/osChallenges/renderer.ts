import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderProse } from "../blocks/proseTags";
import { renderRatedLimit, renderTagSpan } from "../blocks/tagSpan";
import { OsProfileData } from "./parser";
import { osThemeTypeLabel, osZoneLabel } from "../otherscape/labels";
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

function span(doc: Document, className: string, text: string): HTMLElement { const element = doc.createElement("span"); element.classList.add(className); element.textContent = text; return element; }
function source(header: HTMLElement, data: OsProfileData, doc: Document) { if (data.meta) { const small = doc.createElement("small"); small.textContent = metaSourceLine(data.meta); header.appendChild(small); } }
function challengeHeader(data: OsProfileData, doc: Document): HTMLElement {
	const header = doc.createElement("header"); const title = doc.createElement("h3"); title.textContent = data.name; header.appendChild(title);
	// The book prints the Challenge's stars on its tab (Core Book pp. 302-303) and
	// nothing else: the scale belongs to the prose, where the description opens with it.
	const kind = doc.createElement("strong"); kind.classList.add("brumes-os-profile--kind"); kind.textContent = "CHALLENGE"; header.appendChild(kind);
	if (data.rating !== undefined) {
		const stars = span(doc, "brumes-os-profile--rating", "⊕".repeat(data.rating));
		stars.dataset.rating = String(data.rating);
		header.appendChild(stars);
	}
	source(header, data, doc); return header;
}
function challengeDescription(data: OsProfileData, doc: Document): HTMLElement | null {
	if (!data.description && data.scale === undefined) return null;
	const element = doc.createElement("section");
	if (data.scale !== undefined) { const scale = doc.createElement("p"); scale.classList.add("brumes-os-profile--scale"); scale.textContent = `Scale ${data.scale}`; element.appendChild(scale); }
	if (data.description) prose(element, data.description, doc);
	return element;
}
/** `+⊕(⊕)`: the stars a power set adds, the parenthesised ones only with their upgrade threat. */
export function powerSetStars(rating: number, optional?: number): string {
	return `+${"⊕".repeat(rating)}${optional ? `(${"⊕".repeat(optional)})` : ""}`;
}
function powerSetHeader(data: OsProfileData, doc: Document): HTMLElement {
	const header = doc.createElement("header");
	// The icon is the pack's, drawn from the type class on the root.
	header.appendChild(span(doc, "brumes-os-profile--icon", ""));
	const kind = doc.createElement("strong"); kind.classList.add("brumes-os-profile--kind");
	if (data.type) kind.appendChild(span(doc, "brumes-os-profile--type-name", osThemeTypeLabel(data.type)));
	kind.appendChild(span(doc, "brumes-os-profile--kind-name", osZoneLabel("power-set", "kind")));
	header.appendChild(kind);
	const title = doc.createElement("h3"); title.textContent = data.name; header.appendChild(title);
	if (data.rating !== undefined) {
		const stars = span(doc, "brumes-os-profile--rating", powerSetStars(data.rating, data.optionalRating));
		stars.dataset.rating = String(data.rating);
		if (data.optionalRating !== undefined) stars.dataset.optionalRating = String(data.optionalRating);
		header.appendChild(stars);
	}
	source(header, data, doc); return header;
}

export function renderOsProfile(data: OsProfileData, doc: Document): HTMLElement {
	const root = doc.createElement("article"); root.classList.add("brumes-os-profile", `brumes-os-profile--${data.kind}`); if (data.kind === "power-set" && data.type) root.classList.add(`brumes-os-profile--${data.type}`);
	const shape = data.kind === "challenge" ? osChallengeShape : osPowerSetShape;
	renderZones(root, shape, {
		header: () => data.kind === "challenge" ? challengeHeader(data, doc) : powerSetHeader(data, doc),
		description: () => { if (data.kind === "challenge") return challengeDescription(data, doc); if (!data.description) return null; const element = doc.createElement("section"); prose(element, data.description, doc); return element; },
		limits: (zone) => { if (!data.limits.length) return null; const element = section(doc, zone); const list = doc.createElement("ul"); for (const limit of data.limits) { const item = doc.createElement("li"); item.appendChild(renderRatedLimit(limit.name, String(limit.level), doc)); if (limit.isPolar) item.classList.add("brumes-os-profile--polar"); if (limit.isProgress) item.classList.add("brumes-os-profile--progress"); if (limit.onMax) prose(item, limit.onMax, doc); list.appendChild(item); } element.appendChild(list); return element; },
		tags: (zone) => { if (!data.tagsAndStatuses.length) return null; const element = section(doc, zone); const list = doc.createElement("ul"); for (const tag of data.tagsAndStatuses) { const item = doc.createElement("li"); item.appendChild(renderTagSpan(tag.replace(/^\{|\}$/g, ""), doc)); list.appendChild(item); } element.appendChild(list); return element; },
		specials: (zone) => { if (!data.specials.length) return null; const element = section(doc, zone); for (const special of data.specials) { const item = doc.createElement("div"); const name = doc.createElement("strong"); name.textContent = special.name; item.appendChild(name); prose(item, special.description, doc); element.appendChild(item); } return element; },
		threats: (zone) => { if (!data.threats.length) return null; const element = section(doc, zone); for (const threat of data.threats) { const item = doc.createElement("div"); item.classList.add("brumes-os-profile--threat"); const name = doc.createElement("strong"); name.textContent = threat.name; item.appendChild(name); prose(item, threat.description, doc); if (threat.consequences.length) item.appendChild(proseList(threat.consequences, doc)); element.appendChild(item); } return element; },
		"general-consequences": (zone) => { if (!data.generalConsequences.length) return null; const element = section(doc, zone); element.appendChild(proseList(data.generalConsequences, doc)); return element; },
	}); return root;
}
