import {
	OTHERSCAPE_QUEST_LABELS,
	OTHERSCAPE_THEME_TYPE_LABELS,
	OTHERSCAPE_ZONE_LABELS,
	type OtherscapeLabel,
} from "schema-in-the-mist";
import { OsThemeType } from "./types";

/**
 * The printed wordings of the Otherscape cards, read from the labels the
 * contract publishes. French comes first, as everywhere in Handbook: the
 * English wording is the contract's second language, not a local fallback.
 */
const say = (label: OtherscapeLabel): string => label.fr;

export const osThemeTypeLabel = (type: OsThemeType): string => say(OTHERSCAPE_THEME_TYPE_LABELS[type]);
export const osQuestLabel = (type: OsThemeType): string => say(OTHERSCAPE_QUEST_LABELS[type]);

type ZoneLabels = typeof OTHERSCAPE_ZONE_LABELS;
export function osZoneLabel<Block extends keyof ZoneLabels>(
	block: Block,
	zone: keyof ZoneLabels[Block],
): string {
	return say(OTHERSCAPE_ZONE_LABELS[block][zone] as OtherscapeLabel);
}
