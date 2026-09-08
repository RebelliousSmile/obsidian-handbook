import { parse as parseToml, stringify } from "smol-toml";
import { asString, asStringList, looksLikeToml } from "../blocks/schemaValues";
import { ThemeCardData } from "./parser";

/** The levels a theme card can carry, named as schema-in-the-mist names
 * the Might levels of a Legend in the Mist challenge. */
const SCHEMA_LEVELS = ["origin", "adventure", "greatness"] as const;

type SchemaLevel = (typeof SCHEMA_LEVELS)[number];

/** The level the document falls back to when a card leaves it unsaid. */
const DEFAULT_LEVEL: SchemaLevel = "origin";

/**
 * A theme card as a TOML document. schema-in-the-mist describes the City of
 * Mist danger and the Legend in the Mist challenge and no theme card, so this
 * shape is ours, written in that repository's idiom: snake_case keys, a
 * required identity, optional lists left out when empty. If a theme schema
 * lands upstream, this is the file that follows it.
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
 * Turn a parsed theme card into the document shape above. A field
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

/**
 * Turn a parsed TOML document into the shape the renderer draws.
 *
 * `title_tag` is the identity of a card, so a document without one is no card
 * at all and the terse grammar gets its turn. Everything else loses only
 * itself: an unknown level falls back the same way a card with no might line
 * does, and a list written as something other than a list comes back empty.
 */
export function documentToThemeCard(value: unknown): ThemeCardData | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	const document = value as Record<string, unknown>;
	const titleTag = asString(document.title_tag);

	if (!titleTag) {
		return null;
	}

	const declared = asString(document.level).toLowerCase();
	const card: ThemeCardData = {
		level: SCHEMA_LEVELS.indexOf(declared as SchemaLevel) === -1
			? "standard"
			: (declared as ThemeCardData["level"]),
		titleTag,
		powerTags: asStringList(document.power_tags),
		weaknessTags: asStringList(document.weakness_tags),
		// The terse grammar keeps the lines it read; a document has none to keep.
		// Nothing renders from them, so an empty list is the honest answer.
		rawLines: [],
	};

	const category = asString(document.category);

	if (category) {
		card.category = category;
	}

	return card;
}

/**
 * Read a card written as a schema document. Only a source that opens like TOML
 * is offered to the reader, so a card written in the terse grammar never
 * reaches it, and a malformed document falls through to the grammar rather
 * than throwing.
 */
export function parseThemeCardDocument(source: string): ThemeCardData | null {
	if (!looksLikeToml(source)) {
		return null;
	}

	try {
		return documentToThemeCard(parseToml(source));
	} catch {
		return null;
	}
}

/** Serialize a parsed theme card as a schema-shaped TOML document. */
export function themeCardToToml(card: ThemeCardData): string {
	const toml = stringify(themeCardToDocument(card));

	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
