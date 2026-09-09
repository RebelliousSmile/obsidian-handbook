import { BlockShape } from "../blocks/shape";
export const osCharacterTropeShape: BlockShape = { block: "os-character-trope", root: "brumes-os-creation", zones: [
	{ name: "header", holds: "name, category and source" }, { name: "description", holds: "description", optional: true },
	{ name: "theme-kits", holds: "required theme kit references", heading: "Theme Kits", optional: true },
	{ name: "choices", holds: "optional theme kit references", heading: "Choices", optional: true },
	{ name: "loadout", holds: "free-form suggested loadout", heading: "Loadout", optional: true },
] };
export const osLoadoutItemShape: BlockShape = { block: "os-loadout-item", root: "brumes-os-creation", zones: [
	{ name: "header", holds: "name, category and source" }, { name: "description", holds: "description", optional: true },
	{ name: "feature-tags", holds: "all feature tags, including a repeated item name", heading: "Feature tags", optional: true },
	{ name: "weakness-tag", holds: "the single optional weakness tag", heading: "Weakness", optional: true },
] };
