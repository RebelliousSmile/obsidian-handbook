import type { MonsterOfTheWeekMonster } from "schema-pbta";
import contract from "schema-pbta/packs/monster-of-the-week/monster-presentation-contract.json";
import { el, keyValue, renderCard, section, statBlockRegion } from "./motwShared";

const LABELS = { harm: "Blessures", armour: "Armure" };
const TYPE = "Type";
const BESTIARY = "Bestiaire";

function renderRegion(doc: Document, id: string, data: MonsterOfTheWeekMonster): HTMLElement | null {
	if (id === "motw-monster-header") {
		const result = section(doc, contract, id, false);
		result.appendChild(el(doc, "h2", data.name));
		const pairs = keyValue(doc, [[TYPE, data.monsterType], [BESTIARY, data.bestiary]]);
		if (pairs) result.appendChild(pairs);
		return result;
	}
	return statBlockRegion(doc, contract, "motw-monster-", id, data, LABELS);
}

/** Region placement follows the published presentation contract. */
export function renderMotwMonster(data: MonsterOfTheWeekMonster, doc: Document): HTMLElement {
	return renderCard(doc, contract, ["handbook-pbta-monster", "handbook-motw-monster"], (id) => renderRegion(doc, id, data));
}
