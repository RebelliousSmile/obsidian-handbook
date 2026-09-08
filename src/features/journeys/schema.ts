import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { asRecordList, asString, asStringList, looksLikeToml } from "../blocks/schemaValues";
import { JourneyData, JourneyType, JourneyVignette } from "./parser";

/**
 * A Legend in the Mist journey as a TOML document.
 *
 * Nothing upstream describes a journey. That is the reason to describe one
 * here rather than a reason to skip it: the guideline grants no exemption to a
 * format without an upstream, because the first to write a shape becomes its
 * author and a shape nobody wrote stays unreadable outside Handbook
 * (aidd_docs/guidelines/schema-design.md).
 *
 * The idiom is the one the schema repository uses: snake_case keys, a required
 * identity, optional lists left out when empty.
 */
export interface JourneyDocument {
	/** "landscape", "occasion" or "undertaking". */
	type: string;
	name: string;
	description?: string[];
	tags?: string[];
	benefits?: string;
	/** The consequences that belong to the journey rather than to a vignette. */
	consequences?: string[];
	vignettes?: JourneyVignetteDocument[];
}

export interface JourneyVignetteDocument {
	name: string;
	/** What sets the vignette off, printed after the name on the card. */
	trigger?: string;
	consequences?: string[];
}

const JOURNEY_TYPES = ["landscape", "occasion", "undertaking"];

/** The type a document falls back to when it names one the shape does not know. */
const DEFAULT_TYPE: JourneyType = "landscape";

function readVignettes(value: unknown): JourneyVignette[] {
	const vignettes: JourneyVignette[] = [];

	for (const entry of asRecordList(value)) {
		const name = asString(entry.name);

		if (!name) {
			continue;
		}

		const vignette: JourneyVignette = {
			name,
			consequences: asStringList(entry.consequences),
		};
		const trigger = asString(entry.trigger);

		if (trigger) {
			vignette.trigger = trigger;
		}

		vignettes.push(vignette);
	}

	return vignettes;
}

/** Turn a parsed TOML document into the shape the renderer draws. */
export function documentToJourney(value: unknown): JourneyData | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	const document = value as Record<string, unknown>;
	const name = asString(document.name);

	if (!name) {
		return null;
	}

	const declared = asString(document.type).toLowerCase();
	const data: JourneyData = {
		// An unknown type costs the type, not the journey: the card still draws,
		// under the shape the book prints most often.
		type:
			JOURNEY_TYPES.indexOf(declared) === -1
				? DEFAULT_TYPE
				: (declared as JourneyType),
		name,
		description: asStringList(document.description),
		tags: asStringList(document.tags),
		consequences: asStringList(document.consequences),
		vignettes: readVignettes(document.vignettes),
		// A schema document is structured data, not free text: nothing here
		// is the kind of mistake parseJourney's terse grammar has to catch.
		warnings: [],
	};

	const benefits = asString(document.benefits);

	if (benefits) {
		data.benefits = benefits;
	}

	return data;
}

/** Turn a parsed journey back into a schema-shaped document. */
export function journeyToDocument(data: JourneyData): JourneyDocument {
	const document: JourneyDocument = { type: data.type, name: data.name };

	if (data.description.length > 0) {
		document.description = [...data.description];
	}

	if (data.tags.length > 0) {
		document.tags = [...data.tags];
	}

	if (data.benefits) {
		document.benefits = data.benefits;
	}

	if (data.consequences.length > 0) {
		document.consequences = [...data.consequences];
	}

	if (data.vignettes.length > 0) {
		document.vignettes = data.vignettes.map((vignette) => {
			const entry: JourneyVignetteDocument = { name: vignette.name };

			if (vignette.trigger) {
				entry.trigger = vignette.trigger;
			}

			if (vignette.consequences.length > 0) {
				entry.consequences = [...vignette.consequences];
			}

			return entry;
		});
	}

	return document;
}

/**
 * Read a journey written as a schema document. Only a source that opens like
 * TOML is offered to the reader, so a journey written in the terse grammar
 * never reaches it, and a malformed document falls through to the grammar
 * rather than throwing.
 */
export function parseJourneyDocument(source: string): JourneyData | null {
	if (!looksLikeToml(source)) {
		return null;
	}

	try {
		return documentToJourney(parseToml(source));
	} catch {
		return null;
	}
}

/** Serialize a parsed journey as a schema-shaped TOML document. */
export function journeyToToml(data: JourneyData): string {
	const toml = stringifyToml(journeyToDocument(data));

	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
