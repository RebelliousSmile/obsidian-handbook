import { BlockShape } from "../blocks/shape";
import { osZoneLabel } from "../otherscape/labels";

/** The three bands above the cards share their frame: a label tab, then their contents. */
const BAND = "brumes-os-character--band";

export const osCharacterShape: BlockShape = { block: "os-character", root: "brumes-os-character", zones: [
	{ name: "header", holds: "the character's name, and the source when the sheet credits one" },
	{ name: "upgrades", holds: "the published Upgrades rule and its two choices, each behind a box; the document holds nothing for it", heading: osZoneLabel("character", "upgrades"), family: BAND },
	{ name: "tag-combos", holds: "one column per combo: its label, its tags joined by +, its Power and its effect", heading: osZoneLabel("character", "tag_combos"), family: BAND, optional: true },
	{ name: "loadout", holds: "the loaded items, then the unloaded ones dimmed, each with its other feature tags and its weakness", heading: osZoneLabel("character", "loadout"), family: BAND, optional: true },
	{ name: "themes", holds: "up to four theme cards, each drawn by the os-theme renderer", optional: true },
] };
