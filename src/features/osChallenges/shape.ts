import { BlockShape } from "../blocks/shape";
const common = [
	{ name: "header", holds: "name, type or scale and source" },
	{ name: "description", holds: "profile description", optional: true },
	{ name: "specials", holds: "special rules", heading: "Specials", optional: true },
	{ name: "threats", holds: "threats and their local consequences", heading: "Threats", optional: true },
	{ name: "general-consequences", holds: "unattached consequences", heading: "General consequences", optional: true },
];
export const osChallengeShape: BlockShape = {
	block: "os-challenge", root: "brumes-os-profile",
	zones: [common[0], common[1], { name: "limits", holds: "challenge limits", heading: "Limits", optional: true }, { name: "tags", holds: "tags and statuses", heading: "Tags & statuses", optional: true }, ...common.slice(2)],
};
export const osPowerSetShape: BlockShape = { block: "os-power-set", root: "brumes-os-profile", zones: common };
