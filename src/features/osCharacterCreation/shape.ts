import { BlockShape } from "../blocks/shape";
import { osZoneLabel } from "../otherscape/labels";
export const osCharacterTropeShape: BlockShape = { block: "os-character-trope", root: "brumes-os-creation", zones: [
	{ name: "header", holds: "name, category and source" }, { name: "description", holds: "description", optional: true },
	{ name: "theme-kits", holds: "required theme kit references, each with its page", heading: osZoneLabel("character-trope", "theme_kits"), optional: true },
	{ name: "choices", holds: "theme kit references to choose one from, each behind a box", heading: osZoneLabel("character-trope", "choices"), optional: true },
	{ name: "loadout", holds: "the suggested loadout, each entry highlighted", heading: osZoneLabel("character-trope", "loadout"), optional: true },
] };
/** The four cells of an item, laid out as one row of an equipment table. */
const CELL = "brumes-os-creation--cell";
export const osLoadoutItemShape: BlockShape = { block: "os-loadout-item", root: "brumes-os-creation", zones: [
	{ name: "header", holds: "name, category and source", family: CELL }, { name: "description", holds: "description", family: CELL, optional: true },
	{ name: "feature-tags", holds: "all feature tags, including a repeated item name", heading: "Feature tags", family: CELL, optional: true },
	{ name: "weakness-tag", holds: "the single optional weakness tag", heading: "Weakness", family: CELL, optional: true },
] };
