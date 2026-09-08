import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { asString, asStringList, looksLikeToml } from "../blocks/schemaValues";
import { ThemeKitData, ThemeKitImprovement } from "./parser";

/**
 * A Legend in the Mist theme kit as a TOML document.
 *
 * Like the journey, the kit has no upstream shape and writes its own. The
 * guideline grants no exemption for that
 * (aidd_docs/guidelines/schema-design.md): the dispensation the export list
 * once carried — a format without an upstream has nothing to copy — is exactly
 * what left four blocks of six unable to leave the note.
 *
 * The keys follow the theme card the kit feeds — power_tags, weakness_tags —
 * so a reader that already knows one shape reads the other.
 */
export interface ThemeKitDocument {
	name: string;
	/** The themebook the kit belongs to, spelled as the book spells it. */
	category?: string;
	power_tags?: string[];
	weakness_tags?: string[];
	quest?: string;
	improvement?: ThemeKitImprovementDocument;
}

export interface ThemeKitImprovementDocument {
	name: string;
	effect?: string;
}

function readImprovement(value: unknown): ThemeKitImprovement | undefined {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	const entry = value as Record<string, unknown>;
	const name = asString(entry.name);

	if (!name) {
		return undefined;
	}

	const improvement: ThemeKitImprovement = { name };
	const effect = asString(entry.effect);

	if (effect) {
		improvement.effect = effect;
	}

	return improvement;
}

/**
 * Turn a parsed TOML document into the shape the renderer draws.
 *
 * The terse grammar refuses a kit without a power tag; the document reader
 * refuses one without a name and lets the rest degrade. The two are not the
 * same test because they answer different questions: the grammar is guessing
 * what a run of lines meant, the document is being taken at its word.
 */
export function documentToThemeKit(value: unknown): ThemeKitData | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	const document = value as Record<string, unknown>;
	const name = asString(document.name);

	if (!name) {
		return null;
	}

	const data: ThemeKitData = {
		name,
		powerTags: asStringList(document.power_tags),
		weaknessTags: asStringList(document.weakness_tags),
	};

	const category = asString(document.category);

	if (category) {
		data.category = category;
	}

	const quest = asString(document.quest);

	if (quest) {
		data.quest = quest;
	}

	const improvement = readImprovement(document.improvement);

	if (improvement) {
		data.improvement = improvement;
	}

	return data;
}

/** Turn a parsed kit back into a schema-shaped document. */
export function themeKitToDocument(data: ThemeKitData): ThemeKitDocument {
	const document: ThemeKitDocument = { name: data.name };

	if (data.category) {
		document.category = data.category;
	}

	if (data.powerTags.length > 0) {
		document.power_tags = [...data.powerTags];
	}

	if (data.weaknessTags.length > 0) {
		document.weakness_tags = [...data.weaknessTags];
	}

	if (data.quest) {
		document.quest = data.quest;
	}

	if (data.improvement) {
		const improvement: ThemeKitImprovementDocument = {
			name: data.improvement.name,
		};

		if (data.improvement.effect) {
			improvement.effect = data.improvement.effect;
		}

		document.improvement = improvement;
	}

	return document;
}

/**
 * Read a kit written as a schema document. Only a source that opens like TOML
 * is offered to the reader, so a kit written in the terse grammar never
 * reaches it, and a malformed document falls through to the grammar rather
 * than throwing.
 */
export function parseThemeKitDocument(source: string): ThemeKitData | null {
	if (!looksLikeToml(source)) {
		return null;
	}

	try {
		return documentToThemeKit(parseToml(source));
	} catch {
		return null;
	}
}

/** Serialize a parsed kit as a schema-shaped TOML document. */
export function themeKitToToml(data: ThemeKitData): string {
	const toml = stringifyToml(themeKitToDocument(data));

	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
