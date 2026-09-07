import { ComThemeType, findComThemeType } from "../blocks/comThemebooks";

/** What drives the theme: a Mythos asks a Mystery, a Logos states an Identity. */
export type ComDriveKind = "mystery" | "identity" | "neutral";

/** Attention grows the theme, Fade and Crack erode it. */
export type ComTrackKind = "attention" | "fade" | "crack";

export interface ComThemeTag {
	text: string;
	/** The themebook question the tag answers, printed beside it on the card. */
	question?: string;
	burnt: boolean;
}

export interface ComThemeTrack {
	kind: ComTrackKind;
	filled: number;
	max: number;
}

export interface ComThemeDrive {
	kind: ComDriveKind;
	text: string;
	/** True when the key contradicts the themebook, e.g. `identity:` on a Mythos. */
	mismatched: boolean;
}

export interface ComThemeImprovement {
	name: string;
	effect: string;
}

export interface ComThemeCardData {
	themebook: string;
	/** `null` for a themebook the books do not know, homebrew included. */
	type: ComThemeType | null;
	title: string;
	drive?: ComThemeDrive;
	attention?: ComThemeTrack;
	/** The Fade of a Mythos or the Crack of a Logos. */
	deterioration?: ComThemeTrack;
	powerTags: ComThemeTag[];
	weaknessTags: ComThemeTag[];
	improvements: ComThemeImprovement[];
}

/** Both tracks hold three boxes on a printed card. */
const DEFAULT_TRACK_MAX = 3;

const KEY_PATTERN = /^([a-z]+)\s*:\s*(.*)$/i;
const TRACK_PATTERN = /^(\d+)\s*(?:\/\s*(\d+))?$/;
/** An optional question letter, an optional burn mark, then a braced tag. */
const TAG_PATTERN = /(?:(?:^|\s)([A-Za-z])\s+)?(~?)\{([^}]*)\}/g;
const EFFECT_SEPARATOR = " > ";

const DRIVE_KEYS: Record<string, ComDriveKind> = {
	mystery: "mystery",
	identity: "identity",
	motivation: "neutral",
};

const TRACK_KEYS: Record<string, ComTrackKind> = {
	attention: "attention",
	fade: "fade",
	crack: "crack",
};

/** The drive and the erosion track a themebook type calls for. */
const EXPECTED: Record<string, { drive: ComDriveKind; track: ComTrackKind }> = {
	mythos: { drive: "mystery", track: "fade" },
	logos: { drive: "identity", track: "crack" },
};

function parseTrack(kind: ComTrackKind, value: string): ComThemeTrack {
	const match = TRACK_PATTERN.exec(value.trim());

	if (!match) {
		return { kind, filled: 0, max: DEFAULT_TRACK_MAX };
	}

	const max = match[2] ? parseInt(match[2], 10) : DEFAULT_TRACK_MAX;
	const filled = parseInt(match[1], 10);

	return {
		kind,
		filled: Math.min(filled, max),
		max,
	};
}

/**
 * Read a run of tags. Power and weakness tags share a line format, so both
 * lists are filled here rather than by guessing from the line as a whole.
 */
function parseTagRun(
	line: string,
	power: ComThemeTag[],
	weakness: ComThemeTag[],
): void {
	let match = TAG_PATTERN.exec(line);

	while (match !== null) {
		const question = match[1];
		const burnt = match[2] === "~";
		const content = match[3].trim();

		if (content) {
			const isWeakness = content.startsWith("!");
			const tag: ComThemeTag = {
				text: isWeakness ? content.slice(1).trim() : content,
				burnt: burnt && !isWeakness,
			};

			if (question) {
				tag.question = question.toUpperCase();
			}

			if (isWeakness) {
				weakness.push(tag);
			} else {
				power.push(tag);
			}
		}

		match = TAG_PATTERN.exec(line);
	}

	TAG_PATTERN.lastIndex = 0;
}

/** Parse the content of a ```com-theme-card code block. */
export function parseComThemeCard(source: string): ComThemeCardData | null {
	const lines = source
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return null;
	}

	const themebook = lines[0];
	const type = findComThemeType(themebook);
	const data: ComThemeCardData = {
		themebook,
		type,
		title: "",
		powerTags: [],
		weaknessTags: [],
		improvements: [],
	};

	let index = 1;

	// The title is the second line, unless the card goes straight to its keys
	// or its tags.
	if (
		index < lines.length &&
		lines[index].indexOf("{") === -1 &&
		!KEY_PATTERN.test(lines[index])
	) {
		data.title = lines[index];
		index++;
	}

	for (const line of lines.slice(index)) {
		if (line.indexOf("{") !== -1) {
			parseTagRun(line, data.powerTags, data.weaknessTags);
			continue;
		}

		const match = KEY_PATTERN.exec(line);

		if (!match) {
			continue;
		}

		const key = match[1].toLowerCase();
		const value = match[2].trim();
		const drive = DRIVE_KEYS[key];

		if (drive) {
			data.drive = {
				kind: drive,
				text: value,
				mismatched: isMismatchedDrive(type, drive),
			};
			continue;
		}

		const track = TRACK_KEYS[key];

		if (track === "attention") {
			data.attention = parseTrack(track, value);
		} else if (track) {
			data.deterioration = parseTrack(track, value);
		} else if (key === "improvement") {
			data.improvements.push(parseImprovement(value));
		}
	}

	if (
		!data.title &&
		data.powerTags.length === 0 &&
		data.weaknessTags.length === 0
	) {
		return null;
	}

	return data;
}

function parseImprovement(value: string): ComThemeImprovement {
	const index = value.indexOf(EFFECT_SEPARATOR);

	if (index === -1) {
		return { name: value, effect: "" };
	}

	return {
		name: value.slice(0, index).trim(),
		effect: value.slice(index + EFFECT_SEPARATOR.length).trim(),
	};
}

/**
 * Crew and extra themes take either a Mystery or an Identity, so only the two
 * character types can contradict their themebook.
 */
function isMismatchedDrive(
	type: ComThemeType | null,
	drive: ComDriveKind,
): boolean {
	if (type === null || drive === "neutral") {
		return false;
	}

	const expected = EXPECTED[type];
	return expected ? expected.drive !== drive : false;
}

/** True when the erosion track is not the one the themebook type calls for. */
export function isMismatchedTrack(data: ComThemeCardData): boolean {
	if (data.type === null || !data.deterioration) {
		return false;
	}

	const expected = EXPECTED[data.type];
	return expected ? expected.track !== data.deterioration.kind : false;
}
