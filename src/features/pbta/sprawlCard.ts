import type { TheSprawlCorporation, TheSprawlResource, TheSprawlThreat } from "schema-pbta";
import corporation from "schema-pbta/packs/the-sprawl/corporation-presentation-contract.json";
import resource from "schema-pbta/packs/the-sprawl/resource-presentation-contract.json";
import threat from "schema-pbta/packs/the-sprawl/threat-presentation-contract.json";
import { el, keyValue, paragraphs, plainList, renderCard, section, type MotwCardContract } from "./motwShared";
import { hourTrack } from "./sprawlPrimitives";

const TYPE = "Type";
const THREAT_TYPES: Record<TheSprawlThreat["threatType"], string> = {
	group: "Groupe",
	lone: "Loup solitaire",
	place: "Lieu",
	"current-event": "Événement en cours",
};

function labelOf(contract: MotwCardContract, id: string): string {
	return contract.regions.find((region) => region.id === id)?.label ?? "";
}

function lines(doc: Document, contract: MotwCardContract, id: string, list: readonly string[] | undefined): HTMLElement | null {
	if (!list?.length) return null;
	const result = section(doc, contract, id);
	result.appendChild(plainList(doc, list));
	return result;
}

function clock(doc: Document, contract: MotwCardContract, id: string, marked: number | undefined): HTMLElement | null {
	if (marked === undefined) return null;
	const result = section(doc, contract, id);
	result.appendChild(hourTrack(doc, labelOf(contract, id), marked));
	return result;
}

function context(doc: Document, contract: MotwCardContract, id: string, description: string | undefined): HTMLElement | null {
	if (!description) return null;
	const result = section(doc, contract, id);
	paragraphs(doc, result, description);
	return result;
}

function renderThreatRegion(doc: Document, id: string, data: TheSprawlThreat): HTMLElement | null {
	switch (id) {
		case "sprawl-threat-header": {
			const result = section(doc, threat, id, false);
			result.appendChild(el(doc, "h2", data.name));
			const pairs = keyValue(doc, [[TYPE, THREAT_TYPES[data.threatType]]]);
			if (pairs) result.appendChild(pairs);
			return result;
		}
		case "sprawl-threat-objective": {
			if (!data.objective) return null;
			const result = section(doc, threat, id);
			result.appendChild(el(doc, "p", data.objective));
			return result;
		}
		case "sprawl-threat-clock": return clock(doc, threat, id, data.hoursMarked);
		case "sprawl-threat-context": return context(doc, threat, id, data.description);
	}
	return null;
}

function renderCorporationRegion(doc: Document, id: string, data: TheSprawlCorporation): HTMLElement | null {
	switch (id) {
		case "sprawl-corporation-header": {
			const result = section(doc, corporation, id, false);
			result.appendChild(el(doc, "h2", data.name));
			return result;
		}
		case "sprawl-corporation-clock": return clock(doc, corporation, id, data.hoursMarked);
		case "sprawl-corporation-expertise": return lines(doc, corporation, id, data.expertise);
		case "sprawl-corporation-moves": return lines(doc, corporation, id, data.customMoves);
		case "sprawl-corporation-context": return context(doc, corporation, id, data.description);
	}
	return null;
}

function renderResourceRegion(doc: Document, id: string, data: TheSprawlResource): HTMLElement | null {
	switch (id) {
		case "sprawl-resource-header": {
			const result = section(doc, resource, id, false);
			result.appendChild(el(doc, "h2", data.name));
			if (data.tags?.length) result.appendChild(plainList(doc, data.tags));
			return result;
		}
		case "sprawl-resource-skills": return lines(doc, resource, id, data.skills);
		case "sprawl-resource-context": return context(doc, resource, id, data.description);
	}
	return null;
}

/** Region placement follows the published presentation contract. */
export function renderSprawlThreat(data: TheSprawlThreat, doc: Document): HTMLElement {
	return renderCard(doc, threat, ["handbook-sprawl-card", "handbook-sprawl-threat"], (id) => renderThreatRegion(doc, id, data));
}

export function renderSprawlCorporation(data: TheSprawlCorporation, doc: Document): HTMLElement {
	return renderCard(doc, corporation, ["handbook-sprawl-card", "handbook-sprawl-corporation"], (id) => renderCorporationRegion(doc, id, data));
}

export function renderSprawlResource(data: TheSprawlResource, doc: Document): HTMLElement {
	return renderCard(doc, resource, ["handbook-sprawl-card", "handbook-sprawl-resource"], (id) => renderResourceRegion(doc, id, data));
}
