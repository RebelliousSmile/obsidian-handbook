import { BlockShape } from "../blocks/shape";
import { osZoneLabel } from "../otherscape/labels";

const header = { name: "header", holds: "the type icon slot, the category and theme type, the title tag and source" };
const quest = { name: "quest", holds: "the theme's quest, after the label its type prints", optional: true };

export const osThemeShape: BlockShape = {
	block: "os-theme",
	root: "brumes-os-theme",
	zones: [
		header,
		quest,
		{ name: "power-tags", holds: "the power tags", optional: true },
		{ name: "weakness-tags", holds: "the weakness tags", optional: true },
		{ name: "tracks", holds: "the three-place Upgrade and Decay tracks", optional: true },
	],
};

export const osThemeKitShape: BlockShape = {
	block: "os-theme-kit",
	root: "brumes-os-theme",
	zones: [
		header,
		{ name: "description", holds: "the kit's prose", optional: true },
		quest,
		{ name: "power-tags", holds: "the power tags", heading: osZoneLabel("theme-kit", "power_tags"), family: "brumes-os-theme--tag-list", optional: true },
		{ name: "weakness-tags", holds: "the weakness tags", heading: osZoneLabel("theme-kit", "weakness_tags"), family: "brumes-os-theme--tag-list", optional: true },
		{ name: "special", holds: "the suggested Theme Special, its box, name and description", heading: osZoneLabel("theme-kit", "special"), optional: true },
	],
};
