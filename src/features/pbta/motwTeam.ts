import type { MonsterOfTheWeekTeam } from "schema-pbta";
import contract from "schema-pbta/packs/monster-of-the-week/team-presentation-contract.json";
import { boxesLine, checks, el, paragraphs, plainList, renderCard, section } from "./motwShared";

type RegionId = (typeof contract.regions)[number]["id"];

function entries(doc: Document, id: RegionId, list: MonsterOfTheWeekTeam["enemies"] | undefined): HTMLElement | null {
	if (!list?.length) return null;
	const result = section(doc, contract, id);
	result.appendChild(checks(doc, list));
	return result;
}

function lines(doc: Document, id: RegionId, list: string[] | undefined): HTMLElement | null {
	if (!list?.length) return null;
	const result = section(doc, contract, id);
	result.appendChild(plainList(doc, list));
	return result;
}

function renderRegion(doc: Document, id: RegionId, data: MonsterOfTheWeekTeam): HTMLElement | null {
	switch (id) {
		case "motw-team-header": {
			const result = section(doc, contract, id, false);
			result.appendChild(el(doc, "h2", data.name));
			if (data.quote) result.appendChild(el(doc, "span", data.quote));
			return result;
		}
		case "motw-team-getting-started": return lines(doc, id, data.gettingStarted);
		case "motw-team-setup": return lines(doc, id, data.setup);
		case "motw-team-enemies": return entries(doc, id, data.enemies);
		case "motw-team-allies": return entries(doc, id, data.allies);
		case "motw-team-maneuvers": return entries(doc, id, data.maneuvers);
		case "motw-team-assets": return entries(doc, id, data.assets);
		case "motw-team-style": return entries(doc, id, data.style);
		case "motw-team-improvement": {
			if (data.improvementMax === undefined && !data.improvement?.length) return null;
			const result = section(doc, contract, id);
			if (data.improvementMax !== undefined) {
				const list = el(doc, "ul");
				list.appendChild(boxesLine(doc, contract.regions.find((region) => region.id === id)?.label ?? "", data.improvementMax, data.improvementMarked ?? 0));
				result.appendChild(list);
			}
			if (data.improvement?.length) result.appendChild(checks(doc, data.improvement));
			return result;
		}
		case "motw-team-context": {
			if (!data.description) return null;
			const result = section(doc, contract, id);
			paragraphs(doc, result, data.description);
			return result;
		}
	}
	return null;
}

/** Region placement follows the published presentation contract. */
export function renderMotwTeam(data: MonsterOfTheWeekTeam, doc: Document): HTMLElement {
	return renderCard(doc, contract, ["handbook-pbta-team", "handbook-motw-team"], (id) => renderRegion(doc, id, data));
}
