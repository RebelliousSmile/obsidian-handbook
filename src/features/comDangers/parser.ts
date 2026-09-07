/** A spectrum is overcome (defeat) or runs toward its own end (countdown). */
export type ComSpectrumKind = "defeat" | "countdown";

export interface ComSpectrum {
	kind: ComSpectrumKind;
	name: string;
	/** Tier needed to max it out, 1 to 6. Empty when the Danger is immune. */
	max: string;
	/** A spectrum with no maximum: statuses on it are ignored. */
	immune: boolean;
	/** What maxing it out does, when the profile spells it out. */
	outcome?: string;
}

export type ComMoveKind = "soft" | "hard" | "custom";

export interface ComDangerMove {
	kind: ComMoveKind;
	/** Custom moves are named rules; soft and hard moves are not. */
	name?: string;
	text: string;
}

export interface ComDangerData {
	name: string;
	description: string[];
	spectrums: ComSpectrum[];
	moves: ComDangerMove[];
}

type Section = "spectrums" | "countdown" | "moves";

/** Uppercase keywords opening a section, as printed in the Danger profiles. */
const SECTIONS: Record<string, Section> = {
	SPECTRUMS: "spectrums",
	COUNTDOWN: "countdown",
	"COUNTDOWN SPECTRUMS": "countdown",
	MOVES: "moves",
};

const MOVE_KINDS: Record<string, ComMoveKind> = {
	soft: "soft",
	hard: "hard",
	custom: "custom",
};

const OUTCOME_SEPARATOR = " > ";
const SPECTRUM_PATTERN = /^(.*?)\s*(?::|\s)\s*(\d+|∞|inf|~|-)$/i;
const IMMUNE_VALUES = ["∞", "inf", "~", "-"];
const MOVE_PATTERN = /^([a-z]+)\s*:\s*(.*)$/i;

/** Split a line into what it is about and the outcome trailing a `>`. */
function splitOutcome(line: string): [string, string | undefined] {
	const index = line.indexOf(OUTCOME_SEPARATOR);

	if (index === -1) {
		return [line.trim(), undefined];
	}

	return [
		line.slice(0, index).trim(),
		line.slice(index + OUTCOME_SEPARATOR.length).trim(),
	];
}

/**
 * A spectrum is a descriptive tag and a maximum, written `hurt:3` as in the
 * books or `hurt 3`. A maximum of `∞` marks an immunity.
 */
function parseSpectrum(line: string, kind: ComSpectrumKind): ComSpectrum {
	const [subject, outcome] = splitOutcome(line);
	const match = SPECTRUM_PATTERN.exec(subject);
	const raw = match ? match[2].toLowerCase() : "";
	const immune = IMMUNE_VALUES.indexOf(raw) !== -1;

	const spectrum: ComSpectrum = {
		kind,
		name: match ? match[1].trim() : subject,
		max: immune || !match ? "" : match[2],
		immune,
	};

	if (outcome) {
		spectrum.outcome = outcome;
	}

	return spectrum;
}

/** `soft:`, `hard:`, or a named `custom: Name > What it does.` */
function parseMove(line: string): ComDangerMove | null {
	const match = MOVE_PATTERN.exec(line);

	if (!match) {
		return null;
	}

	const kind = MOVE_KINDS[match[1].toLowerCase()];

	if (!kind) {
		return null;
	}

	const body = match[2].trim();

	if (kind !== "custom") {
		return body ? { kind, text: body } : null;
	}

	const [name, effect] = splitOutcome(body);

	if (effect === undefined) {
		return body ? { kind, text: body } : null;
	}

	return { kind, name, text: effect };
}

export function parseComDanger(source: string): ComDangerData | null {
	const lines = source
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0 || SECTIONS[lines[0].toUpperCase()]) {
		return null;
	}

	const data: ComDangerData = {
		name: lines[0],
		description: [],
		spectrums: [],
		moves: [],
	};

	let section: Section | null = null;
	let sectionsSeen = 0;

	for (const line of lines.slice(1)) {
		const keyword = SECTIONS[line.toUpperCase()];

		if (keyword) {
			section = keyword;
			sectionsSeen++;
			continue;
		}

		if (section === null) {
			if (line.startsWith(":")) {
				data.description.push(line.slice(1).trim());
			}

			continue;
		}

		if (section === "spectrums") {
			data.spectrums.push(parseSpectrum(line, "defeat"));
		} else if (section === "countdown") {
			data.spectrums.push(parseSpectrum(line, "countdown"));
		} else if (section === "moves") {
			const move = parseMove(line);

			if (move) {
				data.moves.push(move);
			}
		}
	}

	if (sectionsSeen === 0) {
		return null;
	}

	return data.spectrums.length > 0 || data.moves.length > 0 ? data : null;
}
