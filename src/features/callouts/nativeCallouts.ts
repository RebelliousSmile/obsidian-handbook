import { ADRENALINE_VISUAL_CALLOUTS } from "schema-adrenaline/presentation";
import { PBTA_PACK_CALLOUTS, PBTA_VISUAL_CALLOUTS } from "schema-pbta";
import { CalloutDefinition } from "./types";

const PBTA_VISUAL_ICONS: Record<(typeof PBTA_VISUAL_CALLOUTS)[number]["id"], string> = {
	"pbta-clock": "clock-3",
	"pbta-move": "swords",
	"pbta-npc-reaction": "messages-square",
	"pbta-playbook-change": "book-open-check",
};

const PBTA_CALLOUTS: CalloutDefinition[] = [
	...PBTA_VISUAL_CALLOUTS.map((entry): CalloutDefinition => ({
		id: entry.id,
		name: entry.label,
		aliases: [entry.id],
		scope: "all",
		template: entry.template,
		icon: PBTA_VISUAL_ICONS[entry.id],
		font: "header",
		color: { kind: "theme" },
		native: true,
		styleKey: entry.id,
		capability: entry.capability,
	})),
];

const PACK_CALLOUT_DEFAULT_ICON = "sticky-note";

// Keyed by id as text, with a default: a pack callout the schema publishes later
// must not break the build of a Handbook that has not adopted it yet.
const PBTA_PACK_ICONS: Record<string, string> = {
	"monsterhearts-note": "notebook-pen",
	"monsterhearts-note-dark": "moon",
	"urban-shadows-move": "swords",
	"urban-shadows-choice": "list-checks",
	"urban-shadows-aside": "message-square-quote",
	"urban-shadows-solid": "panel-top",
	"urban-shadows-archetype": "id-card",
	"urban-shadows-example": "quote",
};

// A pack callout belongs to the pack the schema names: its scope is that pack's
// id, read from the published entry, and its stylesheet ships with the pack.
const PBTA_PACK_NATIVE_CALLOUTS: CalloutDefinition[] = PBTA_PACK_CALLOUTS.map(
	(entry): CalloutDefinition => {
		const id: string = entry.id;
		return {
			id,
			name: entry.label,
			aliases: [id],
			scope: entry.pack,
			template: entry.template,
			icon: PBTA_PACK_ICONS[id] ?? PACK_CALLOUT_DEFAULT_ICON,
			font: "header",
			color: { kind: "theme" },
			native: true,
			styleKey: id,
			capability: entry.capability,
		};
	},
);

// Keyed by id as text: Handbook picks the icon of a callout the schema declares, and a schema
// release that adds one must not break the build of a Handbook that has not adopted it yet.
const ADRENALINE_VISUAL_ICONS: Record<string, string> = {
	"adrenaline-exemple": "message-square-quote",
	"adrenaline-description": "scroll-text",
	"adrenaline-encart": "panel-top",
	"adrenaline-role": "id-card",
	"adrenaline-formation": "backpack",
	"adrenaline-action": "swords",
	"adrenaline-roller": "dices",
	"adrenaline-mention": "bookmark",
};

// The schema owns ids and default aliases; the pack's `requires` gates them.
// Unlike the namespaced PbtA aliases, these are plain words (`action`,
// `example`): scoping them to the Adrenaline game leaves them free for user
// callouts in every other game.
const ADRENALINE_CALLOUTS: CalloutDefinition[] = ADRENALINE_VISUAL_CALLOUTS.map(
	(entry): CalloutDefinition => ({
		id: entry.id,
		name: entry.label,
		aliases: [...entry.aliases],
		scope: "adrenaline",
		template: entry.template,
		icon: ADRENALINE_VISUAL_ICONS[entry.id],
		font: "header",
		color: { kind: "theme" },
		native: true,
		styleKey: entry.id,
		capability: entry.capability,
	}),
);

/**
 * Every native callout, locked: `styleKey`, scope and default aliases come from
 * the old `aliasSupport.ts` constants and from the schema packages. `color`,
 * `font` and `template` fill the type but `styleWriter.ts` ignores them for a
 * native entry: its rendering lives in `_callouts.scss`.
 */
/** Ids of the callouts the schema packages declare, the ones a saved list may predate. */
export const SCHEMA_CALLOUT_IDS: readonly string[] = [
	...PBTA_VISUAL_CALLOUTS.map((definition): string => definition.id),
	...PBTA_PACK_CALLOUTS.map((definition): string => definition.id),
	...ADRENALINE_VISUAL_CALLOUTS.map((definition): string => definition.id),
];

export const NATIVE_CALLOUTS: CalloutDefinition[] = [
	{
		id: "city-of-mist-clue",
		name: "Indice",
		aliases: ["clue"],
		scope: "city-of-mist",
		template: "body-only",
		icon: "search",
		font: "text",
		color: { kind: "theme" },
		native: true,
		styleKey: "clue",
	},
	{
		id: "city-of-mist-red-clue",
		name: "Indice rouge",
		aliases: ["red-clue"],
		scope: "city-of-mist",
		template: "body-only",
		icon: "badge-alert",
		font: "text",
		color: { kind: "theme" },
		native: true,
		styleKey: "red-clue",
	},
	{
		id: "city-of-mist-move",
		name: "Mouvement",
		aliases: ["move"],
		scope: "city-of-mist",
		template: "title-body",
		icon: "swords",
		font: "header",
		color: { kind: "theme" },
		native: true,
		styleKey: "move",
	},
	{
		id: "city-of-mist-description",
		name: "Description",
		aliases: ["description", "read-aloud"],
		scope: "city-of-mist",
		template: "body-only",
		icon: "scroll-text",
		font: "text",
		color: { kind: "theme" },
		native: true,
		styleKey: "description",
	},
	{
		id: "city-of-mist-note",
		name: "Note",
		aliases: ["note", "aside"],
		scope: "city-of-mist",
		template: "title-body",
		icon: "sticky-note",
		font: "header",
		color: { kind: "theme" },
		native: true,
		styleKey: "note",
	},
	{
		id: "legend-in-the-mist-note",
		name: "Note",
		aliases: ["note"],
		scope: "legend-in-the-mist",
		template: "title-body",
		icon: "sticky-note",
		font: "header",
		color: { kind: "theme" },
		native: true,
		styleKey: "note",
	},
	{
		id: "legend-in-the-mist-read-aloud",
		name: "Lecture à voix haute",
		aliases: ["read-aloud"],
		scope: "legend-in-the-mist",
		template: "body-only",
		icon: "mic",
		font: "text",
		color: { kind: "theme" },
		native: true,
		styleKey: "read-aloud",
	},
	...PBTA_CALLOUTS,
	...PBTA_PACK_NATIVE_CALLOUTS,
	...ADRENALINE_CALLOUTS,
];
