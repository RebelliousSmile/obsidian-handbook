import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { findComThemeType } from "../blocks/comThemebooks";
import { asRecordList, asString, looksLikeToml } from "../blocks/schemaValues";
import {
	ComDriveKind,
	ComThemeCardData,
	ComThemeImprovement,
	ComThemeTag,
	ComThemeTrack,
	ComTrackKind,
} from "./parser";

/**
 * A City of Mist theme card as a TOML document.
 *
 * schema-in-the-mist describes no theme card, so this shape is ours, written
 * in that repository's idiom: snake_case keys, a required identity, optional
 * tables left out when empty. The guideline forbids the dispensation that
 * would let a format without an upstream stay unwritten
 * (aidd_docs/guidelines/schema-design.md); a format nobody describes stays
 * unusable outside Handbook.
 *
 * Two values are deliberately absent because they are derived, never stored:
 * the themebook type comes from the themebook name, and a drive or a track
 * that contradicts its themebook is computed at render time. Writing them down
 * would let a document disagree with itself.
 */
export interface ComThemeCardDocument {
	themebook: string;
	title?: string;
	drive?: ComDriveDocument;
	attention?: ComTrackDocument;
	deterioration?: ComTrackDocument;
	power_tags?: ComThemeTagDocument[];
	weakness_tags?: ComThemeTagDocument[];
	improvements?: ComImprovementDocument[];
}

export interface ComDriveDocument {
	/** "mystery", "identity", or "neutral" for a motivation. */
	kind: string;
	text: string;
}

export interface ComTrackDocument {
	/** "attention", "fade" or "crack". */
	kind: string;
	filled?: number;
	maximum?: number;
}

export interface ComThemeTagDocument {
	text: string;
	/** The themebook question letter the tag answers. */
	question?: string;
	burnt?: boolean;
}

export interface ComImprovementDocument {
	name: string;
	effect?: string;
}

/** Both tracks hold three boxes on a printed card. */
const DEFAULT_TRACK_MAX = 3;

const DRIVE_KINDS = ["mystery", "identity", "neutral"];
const TRACK_KINDS = ["attention", "fade", "crack"];

/** The drive and the erosion track a themebook type calls for. */
const EXPECTED: Record<string, { drive: ComDriveKind; track: ComTrackKind }> = {
	mythos: { drive: "mystery", track: "fade" },
	logos: { drive: "identity", track: "crack" },
};

function readTags(value: unknown, weakness: boolean): ComThemeTag[] {
	const tags: ComThemeTag[] = [];

	for (const entry of asRecordList(value)) {
		const text = asString(entry.text);

		if (!text) {
			continue;
		}

		// Only power tags burn on a printed card. A document that marks a
		// weakness as burnt loses the mark, not the tag.
		const tag: ComThemeTag = {
			text,
			burnt: !weakness && entry.burnt === true,
		};
		const question = asString(entry.question);

		if (question) {
			tag.question = question.toUpperCase();
		}

		tags.push(tag);
	}

	return tags;
}

function readTrack(
	value: unknown,
	fallback: ComTrackKind,
): ComThemeTrack | undefined {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	const entry = value as Record<string, unknown>;
	const declared = asString(entry.kind).toLowerCase();
	const max =
		typeof entry.maximum === "number" && entry.maximum > 0
			? entry.maximum
			: DEFAULT_TRACK_MAX;
	const filled = typeof entry.filled === "number" ? entry.filled : 0;

	return {
		kind:
			TRACK_KINDS.indexOf(declared) === -1
				? fallback
				: (declared as ComTrackKind),
		filled: Math.max(0, Math.min(filled, max)),
		max,
	};
}

function readImprovements(value: unknown): ComThemeImprovement[] {
	const improvements: ComThemeImprovement[] = [];

	for (const entry of asRecordList(value)) {
		const name = asString(entry.name);

		if (!name) {
			continue;
		}

		improvements.push({ name, effect: asString(entry.effect) });
	}

	return improvements;
}

/**
 * Crew and extra themes take either a Mystery or an Identity, so only the two
 * character types can contradict their themebook.
 */
function isMismatchedDrive(type: string | null, drive: ComDriveKind): boolean {
	if (type === null || drive === "neutral") {
		return false;
	}

	const expected = EXPECTED[type];

	return expected ? expected.drive !== drive : false;
}

/** Turn a parsed TOML document into the shape the renderer draws. */
export function documentToComThemeCard(
	value: unknown,
): ComThemeCardData | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	const document = value as Record<string, unknown>;
	const themebook = asString(document.themebook);

	if (!themebook) {
		return null;
	}

	const type = findComThemeType(themebook);
	const data: ComThemeCardData = {
		themebook,
		type,
		title: asString(document.title),
		powerTags: readTags(document.power_tags, false),
		weaknessTags: readTags(document.weakness_tags, true),
		improvements: readImprovements(document.improvements),
	};

	if (
		document.drive !== null &&
		typeof document.drive === "object" &&
		!Array.isArray(document.drive)
	) {
		const entry = document.drive as Record<string, unknown>;
		const declared = asString(entry.kind).toLowerCase();
		// An unnamed drive is a motivation: neutral is the kind that neither
		// matches nor contradicts a themebook.
		const kind: ComDriveKind =
			DRIVE_KINDS.indexOf(declared) === -1
				? "neutral"
				: (declared as ComDriveKind);

		data.drive = {
			kind,
			text: asString(entry.text),
			mismatched: isMismatchedDrive(type, kind),
		};
	}

	const attention = readTrack(document.attention, "attention");

	if (attention) {
		data.attention = attention;
	}

	// The erosion track defaults to the one the themebook calls for, so a
	// document that names no kind still draws the right boxes.
	const deterioration = readTrack(
		document.deterioration,
		type && EXPECTED[type] ? EXPECTED[type].track : "fade",
	);

	if (deterioration) {
		data.deterioration = deterioration;
	}

	return data;
}

function tagToDocument(tag: ComThemeTag): ComThemeTagDocument {
	const entry: ComThemeTagDocument = { text: tag.text };

	if (tag.question) {
		entry.question = tag.question;
	}

	if (tag.burnt) {
		entry.burnt = true;
	}

	return entry;
}

function trackToDocument(track: ComThemeTrack): ComTrackDocument {
	return { kind: track.kind, filled: track.filled, maximum: track.max };
}

/** Turn a parsed theme card back into a schema-shaped document. */
export function comThemeCardToDocument(
	data: ComThemeCardData,
): ComThemeCardDocument {
	const document: ComThemeCardDocument = { themebook: data.themebook };

	if (data.title) {
		document.title = data.title;
	}

	if (data.drive) {
		// The mismatch flag is derived from the themebook and is not written
		// back: a document that carried it could contradict its own themebook.
		document.drive = { kind: data.drive.kind, text: data.drive.text };
	}

	if (data.attention) {
		document.attention = trackToDocument(data.attention);
	}

	if (data.deterioration) {
		document.deterioration = trackToDocument(data.deterioration);
	}

	if (data.powerTags.length > 0) {
		document.power_tags = data.powerTags.map(tagToDocument);
	}

	if (data.weaknessTags.length > 0) {
		document.weakness_tags = data.weaknessTags.map(tagToDocument);
	}

	if (data.improvements.length > 0) {
		document.improvements = data.improvements.map((improvement) => {
			const entry: ComImprovementDocument = { name: improvement.name };

			if (improvement.effect) {
				entry.effect = improvement.effect;
			}

			return entry;
		});
	}

	return document;
}

/**
 * Read a card written as a schema document. Only a source that opens like TOML
 * is offered to the reader, so a card written in the terse grammar never
 * reaches it, and a malformed document falls through to the grammar rather
 * than throwing.
 */
export function parseComThemeCardDocument(
	source: string,
): ComThemeCardData | null {
	if (!looksLikeToml(source)) {
		return null;
	}

	try {
		return documentToComThemeCard(parseToml(source));
	} catch {
		return null;
	}
}

/** Serialize a parsed theme card as a schema-shaped TOML document. */
export function comThemeCardToToml(data: ComThemeCardData): string {
	const toml = stringifyToml(comThemeCardToDocument(data));

	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
