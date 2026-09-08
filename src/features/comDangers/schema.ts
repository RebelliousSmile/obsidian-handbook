import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import {
	asRecordList,
	asString,
	asStringList,
	looksLikeToml,
	readMeta,
	SchemaMeta,
} from "../blocks/schemaValues";
import {
	ComDangerData,
	ComDangerMove,
	ComSpectrum,
	ComSpectrumKind,
} from "./parser";

/**
 * A Danger as schema-in-the-mist defines it, with two fields of ours.
 *
 * Upstream a spectrum is a name, a maximum and an immunity flag. The printed
 * profiles hold two things that shape does not: a countdown spectrum runs
 * toward its own end instead of being overcome, and a spectrum often states
 * what maxing it out does. Dropping either would make the block worse than it
 * is today, so they are written as `is_countdown` and `on_max`, and a reader
 * that ignores them still gets a valid Danger.
 */
export interface ComDangerDocument {
	name: string;
	description?: string;
	rating?: number;
	spectrums?: ComSpectrumDocument[];
	soft_moves?: string[];
	hard_moves?: string[];
	custom_moves?: ComCustomMoveDocument[];
	meta?: SchemaMeta;
}

export interface ComSpectrumDocument {
	name: string;
	maximum?: number;
	is_immune?: boolean;
	/** Ours: a spectrum that counts down rather than one to be overcome. */
	is_countdown?: boolean;
	/** Ours: what happens when the spectrum maxes out. */
	on_max?: string;
}

export interface ComCustomMoveDocument {
	name?: string;
	description: string;
}

function documentToSpectrum(entry: Record<string, unknown>): ComSpectrum {
	const kind: ComSpectrumKind =
		entry.is_countdown === true ? "countdown" : "defeat";
	const immune = entry.is_immune === true;
	const spectrum: ComSpectrum = {
		kind,
		name: asString(entry.name),
		max: !immune && typeof entry.maximum === "number"
			? String(entry.maximum)
			: "",
		immune,
	};

	const onMax = asString(entry.on_max);

	if (onMax) {
		spectrum.outcome = onMax;
	}

	return spectrum;
}

/**
 * The moves come back grouped, soft then hard then custom, because the
 * document holds three lists where the block holds one. That is the order the
 * profiles are printed in, so a document written by hand reads as expected;
 * a profile that interleaved its kinds is regrouped rather than lost.
 */
function documentToMoves(document: Record<string, unknown>): ComDangerMove[] {
	const moves: ComDangerMove[] = [];

	for (const text of asStringList(document.soft_moves)) {
		moves.push({ kind: "soft", text });
	}

	for (const text of asStringList(document.hard_moves)) {
		moves.push({ kind: "hard", text });
	}

	for (const entry of asRecordList(document.custom_moves)) {
		const text = asString(entry.description);

		if (!text) {
			continue;
		}

		const name = asString(entry.name);

		moves.push(name ? { kind: "custom", name, text } : { kind: "custom", text });
	}

	return moves;
}

/** Turn a parsed TOML document into the shape the renderer draws. */
export function documentToComDanger(value: unknown): ComDangerData | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	const document = value as Record<string, unknown>;
	const name = asString(document.name);

	if (!name) {
		return null;
	}

	const data: ComDangerData = {
		name,
		description: [],
		spectrums: [],
		moves: documentToMoves(document),
	};

	const description = asString(document.description);

	if (description) {
		data.description.push(description);
	}

	if (typeof document.rating === "number") {
		data.rating = document.rating;
	}

	for (const entry of asRecordList(document.spectrums)) {
		data.spectrums.push(documentToSpectrum(entry));
	}

	const meta = readMeta(document.meta);

	if (meta) {
		data.meta = meta;
	}

	return data;
}

/** Turn a parsed Danger back into a schema-shaped document. */
export function comDangerToDocument(data: ComDangerData): ComDangerDocument {
	const document: ComDangerDocument = { name: data.name };

	if (data.description.length > 0) {
		document.description = data.description.join(" ");
	}

	if (typeof data.rating === "number") {
		document.rating = data.rating;
	}

	if (data.spectrums.length > 0) {
		document.spectrums = data.spectrums.map((spectrum) => {
			const entry: ComSpectrumDocument = { name: spectrum.name };
			const maximum = parseInt(spectrum.max, 10);

			if (!isNaN(maximum)) {
				entry.maximum = maximum;
			}

			if (spectrum.immune) {
				entry.is_immune = true;
			}

			if (spectrum.kind === "countdown") {
				entry.is_countdown = true;
			}

			if (spectrum.outcome) {
				entry.on_max = spectrum.outcome;
			}

			return entry;
		});
	}

	const soft: string[] = [];
	const hard: string[] = [];
	const custom: ComCustomMoveDocument[] = [];

	for (const move of data.moves) {
		if (move.kind === "soft") {
			soft.push(move.text);
		} else if (move.kind === "hard") {
			hard.push(move.text);
		} else {
			// Upstream a custom move must be named. One written without a name is
			// written without one here too, rather than given an invented title.
			custom.push(
				move.name
					? { name: move.name, description: move.text }
					: { description: move.text },
			);
		}
	}

	if (soft.length > 0) {
		document.soft_moves = soft;
	}

	if (hard.length > 0) {
		document.hard_moves = hard;
	}

	if (custom.length > 0) {
		document.custom_moves = custom;
	}

	if (data.meta) {
		document.meta = data.meta;
	}

	return document;
}

/**
 * Read a block written as a schema document. Only a source that opens like
 * TOML is offered to the reader, so a profile written in the terse grammar
 * never reaches it, and a malformed document falls through to the grammar
 * rather than throwing.
 */
export function parseComDangerDocument(source: string): ComDangerData | null {
	if (!looksLikeToml(source)) {
		return null;
	}

	try {
		return documentToComDanger(parseToml(source));
	} catch {
		return null;
	}
}

/** Serialize a parsed Danger as a schema-shaped TOML document. */
export function comDangerToToml(data: ComDangerData): string {
	const toml = stringifyToml(comDangerToDocument(data));

	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
