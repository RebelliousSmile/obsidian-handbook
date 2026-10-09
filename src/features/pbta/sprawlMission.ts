import type { TheSprawlMission } from "schema-pbta";
import contract from "schema-pbta/packs/the-sprawl/mission-presentation-contract.json";
import { el, keyValue, paragraphs, plainList, renderCard, section } from "./motwShared";
import { hourTrack } from "./sprawlPrimitives";

type Countdown = NonNullable<TheSprawlMission["investigation"]>;

/** A countdown prints its hours, then what happens at each printed hour. */
function countdown(doc: Document, id: string, value: Countdown | undefined): HTMLElement | null {
	if (!value || (value.hoursMarked === undefined && !value.steps?.length)) return null;
	const result = section(doc, contract, id);
	const label = contract.regions.find((region) => region.id === id)?.label ?? "";
	result.appendChild(hourTrack(doc, label, value.hoursMarked));
	if (value.steps?.length) result.appendChild(plainList(doc, value.steps));
	return result;
}

function lines(doc: Document, id: string, list: string[] | undefined): HTMLElement | null {
	if (!list?.length) return null;
	const result = section(doc, contract, id);
	result.appendChild(plainList(doc, list));
	return result;
}

function prose(doc: Document, id: string, text: string | undefined): HTMLElement | null {
	if (!text) return null;
	const result = section(doc, contract, id);
	paragraphs(doc, result, text);
	return result;
}

function renderRegion(doc: Document, id: string, data: TheSprawlMission): HTMLElement | null {
	switch (id) {
		case "sprawl-mission-header": {
			const result = section(doc, contract, id, false);
			result.appendChild(el(doc, "h2", data.name));
			const pairs = keyValue(doc, [[contract.regions[0].label, data.getTheJob]]);
			if (pairs) result.appendChild(pairs);
			return result;
		}
		case "sprawl-mission-investigation": return countdown(doc, id, data.investigation);
		case "sprawl-mission-action": return countdown(doc, id, data.action);
		case "sprawl-mission-parties": return lines(doc, id, data.involvedParties);
		case "sprawl-mission-security": return lines(doc, id, data.security);
		case "sprawl-mission-going-on": return prose(doc, id, data.whatIsGoingOn);
		case "sprawl-mission-twist": return prose(doc, id, data.twist);
		case "sprawl-mission-directives": return lines(doc, id, data.missionDirectives);
		case "sprawl-mission-pay": return prose(doc, id, data.getPaid);
	}
	return null;
}

/** Region placement follows the published presentation contract. */
export function renderSprawlMission(data: TheSprawlMission, doc: Document): HTMLElement {
	return renderCard(doc, contract, ["handbook-sprawl-mission"], (id) => renderRegion(doc, id, data));
}
