import { stringify } from "smol-toml";
import { ThemeCardData } from "./parser";

/** The levels the shared Story Theme schema accepts. */
const SCHEMA_LEVELS = ["origin", "adventure", "greatness"] as const;

type SchemaLevel = (typeof SCHEMA_LEVELS)[number];

/** The level the schema falls back to when a document leaves it unsaid. */
const DEFAULT_LEVEL: SchemaLevel = "origin";

/**
 * A Story Theme as schema-in-the-mist describes it. The title tag and the
 * level are required there, so a theme card only chooses what to fill in the
 * fields around them.
 */
export interface StoryThemeDocument {
	title_tag: string;
	level: SchemaLevel;
	category?: string;
	power_tags?: string[];
	weakness_tags?: string[];
}

function toSchemaLevel(level: ThemeCardData["level"]): SchemaLevel {
	// A card with no readable might line parses as `standard`, a level the
	// schema does not know. It asks for one anyway, so the export writes the
	// value the schema would have defaulted to.
	return SCHEMA_LEVELS.includes(level as SchemaLevel)
		? (level as SchemaLevel)
		: DEFAULT_LEVEL;
}

/**
 * Turn a parsed theme card into the shape the shared schema defines. A field
 * the card leaves empty is left out of the document rather than exported as an
 * empty string or an empty list.
 */
export function themeCardToDocument(card: ThemeCardData): StoryThemeDocument {
	const document: StoryThemeDocument = {
		title_tag: card.titleTag,
		level: toSchemaLevel(card.level),
	};

	const category = card.category?.trim();
	if (category) {
		document.category = category;
	}

	if (card.powerTags.length > 0) {
		document.power_tags = [...card.powerTags];
	}

	if (card.weaknessTags.length > 0) {
		document.weakness_tags = [...card.weaknessTags];
	}

	return document;
}

/** Serialize a parsed theme card as a schema-shaped TOML document. */
export function themeCardToToml(card: ThemeCardData): string {
	const toml = stringify(themeCardToDocument(card));

	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
