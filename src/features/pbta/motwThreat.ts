import type { MonsterOfTheWeekThreat } from "schema-pbta";
import contract from "schema-pbta/packs/monster-of-the-week/threat-presentation-contract.json";
import { checks, el, keyValue, renderCard, section, statBlockRegion } from "./motwShared";

const LABELS = { harm: "Blessures", armour: "Armure" };
const TYPE = "Type";
const MYSTERY = "Mystère";

function renderRegion(doc: Document, id: string, data: MonsterOfTheWeekThreat): HTMLElement | null {
	if (id === "motw-threat-header") {
		const result = section(doc, contract, id, false);
		result.appendChild(el(doc, "h2", data.name));
		const pairs = keyValue(doc, [[TYPE, data.threatType], [MYSTERY, data.mystery]]);
		if (pairs) result.appendChild(pairs);
		return result;
	}
	if (id === "motw-threat-stages") {
		if (!data.stages?.length) return null;
		const result = section(doc, contract, id);
		result.appendChild(checks(doc, data.stages));
		return result;
	}
	return statBlockRegion(doc, contract, "motw-threat-", id, data, LABELS);
}

/** Region placement follows the published presentation contract. */
export function renderMotwThreat(data: MonsterOfTheWeekThreat, doc: Document): HTMLElement {
	return renderCard(doc, contract, ["handbook-pbta-threat", "handbook-motw-threat"], (id) => renderRegion(doc, id, data));
}
