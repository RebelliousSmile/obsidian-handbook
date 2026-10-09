import type { TheSprawlMatrix } from "schema-pbta";
import contract from "schema-pbta/packs/the-sprawl/matrix-presentation-contract.json";
import { boxesLine, checks, el, renderCard, section } from "./motwShared";
import { hexagons } from "./sprawlPrimitives";

const LABELS = { holds: "Retenues", resistance: "Résistance", firewall: "Pare-feu", stealth: "Furtivité", processor: "Processeur" };
const HOLD_BOXES = 3;

function renderRegion(doc: Document, id: string, data: TheSprawlMatrix): HTMLElement | null {
	switch (id) {
		case "sprawl-matrix-header": {
			const result = section(doc, contract, id, false);
			result.appendChild(el(doc, "h2", data.name));
			return result;
		}
		case "sprawl-matrix-avatar": {
			if (!data.avatarDescription && !data.avatarImage) return null;
			const result = section(doc, contract, id);
			if (data.avatarDescription) result.appendChild(el(doc, "p", data.avatarDescription));
			if (data.avatarImage) result.appendChild(el(doc, "span", data.avatarImage));
			return result;
		}
		case "sprawl-matrix-console": {
			const entries: Array<readonly [string, string | undefined]> = [
				[LABELS.resistance, data.resistance === undefined ? undefined : String(data.resistance)],
				[LABELS.firewall, data.firewall === undefined ? undefined : String(data.firewall)],
				[LABELS.stealth, data.stealth === undefined ? undefined : String(data.stealth)],
				[LABELS.processor, data.processor === undefined ? undefined : String(data.processor)],
			];
			if (entries.every((entry) => entry[1] === undefined)) return null;
			const result = section(doc, contract, id);
			result.appendChild(hexagons(doc, entries));
			return result;
		}
		case "sprawl-matrix-holds": {
			if (data.holds === undefined) return null;
			const result = section(doc, contract, id);
			const list = el(doc, "ul");
			list.appendChild(boxesLine(doc, LABELS.holds, Math.max(HOLD_BOXES, data.holds), data.holds));
			result.appendChild(list);
			return result;
		}
		case "sprawl-matrix-programs": {
			if (!data.programs?.length) return null;
			const result = section(doc, contract, id);
			result.appendChild(checks(doc, data.programs));
			return result;
		}
	}
	return null;
}

/** Region placement follows the published presentation contract. */
export function renderSprawlMatrix(data: TheSprawlMatrix, doc: Document): HTMLElement {
	return renderCard(doc, contract, ["handbook-sprawl-matrix"], (id) => renderRegion(doc, id, data));
}
