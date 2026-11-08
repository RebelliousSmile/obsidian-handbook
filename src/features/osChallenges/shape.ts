import { BlockShape } from "../blocks/shape";
import { osZoneLabel } from "../otherscape/labels";
const common = [
	{ name: "header", holds: "name, type or scale and source" },
	{ name: "description", holds: "profile description", optional: true },
	{ name: "specials", holds: "special rules", heading: "Specials", optional: true },
	{ name: "threats", holds: "threats and their local consequences", heading: "Threats", optional: true },
	{ name: "general-consequences", holds: "unattached consequences", heading: "General consequences", optional: true },
];
export const osChallengeShape: BlockShape = {
	block: "os-challenge", root: "brumes-os-profile",
	zones: [{ name: "header", holds: "name, the rating stars and source" }, { name: "description", holds: "the scale line, then the profile description", optional: true }, { name: "limits", holds: "challenge limits", heading: "Limits", optional: true }, { name: "tags", holds: "tags and statuses", heading: "Tags & statuses", optional: true }, ...common.slice(2)],
};
/** A power set prints its own wordings, published with the contract. */
export const osPowerSetShape: BlockShape = {
	block: "os-power-set", root: "brumes-os-profile",
	zones: [
		{ name: "header", holds: "the type icon slot, the typed power set label, the name, the rating stars and source" },
		common[1],
		{ name: "tags", holds: "tags and statuses the power set adds", heading: osZoneLabel("power-set", "tags_and_statuses"), optional: true },
		{ ...common[2], heading: osZoneLabel("power-set", "specials") },
		{ ...common[3], heading: osZoneLabel("power-set", "threats") },
		{ ...common[4], heading: osZoneLabel("power-set", "general_consequences") },
	],
};
