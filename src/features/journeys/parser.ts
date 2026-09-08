export type JourneyType = "landscape" | "occasion" | "undertaking";

export interface JourneyVignette {
	name: string;
	trigger?: string;
	consequences: string[];
}

export interface JourneyData {
	type: JourneyType;
	name: string;
	description: string[];
	tags: string[];
	benefits?: string;
	consequences: string[];
	vignettes: JourneyVignette[];
	/** Malformed or suspicious input, surfaced instead of dropped silently. */
	warnings: string[];
}

const JOURNEY_TYPES: JourneyType[] = ["landscape", "occasion", "undertaking"];
const TYPE_PREFIX = "journey - ";
const TAGS_PREFIX = "tags:";
const BENEFITS_PREFIX = "benefits:";
/** The books print `CONSEQUENCES`; some profiles print `GENERAL CONSEQUENCES`. */
const CONSEQUENCES_KEYWORDS = ["CONSEQUENCES", "GENERAL CONSEQUENCES"];
const VIGNETTE_PREFIX = "VIGNETTE ";
const TRIGGER_SEPARATOR = " : ";

/** Accept both the bare type and the `Journey - Type` heading the book prints. */
function readType(line: string): JourneyType | null {
	let candidate = line.trim().toLowerCase();

	if (candidate.startsWith(TYPE_PREFIX)) {
		candidate = candidate.slice(TYPE_PREFIX.length).trim();
	}

	return JOURNEY_TYPES.indexOf(candidate as JourneyType) === -1
		? null
		: (candidate as JourneyType);
}

/** A brace-wrapped entry has no other legitimate meaning here: unwrap it. */
function unwrapBraces(entry: string): string {
	if (entry.length >= 2 && entry.startsWith("{") && entry.endsWith("}")) {
		return entry.slice(1, -1).trim();
	}

	return entry;
}

function splitList(value: string): string[] {
	return value
		.split(",")
		.map((entry) => unwrapBraces(entry.trim()))
		.filter((entry) => entry.length > 0);
}

export function parseJourney(source: string): JourneyData | null {
	const lines = source
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length < 2) {
		return null;
	}

	const type = readType(lines[0]);

	if (type === null) {
		return null;
	}

	const name = lines[1];

	if (
		!name ||
		CONSEQUENCES_KEYWORDS.indexOf(name) !== -1 ||
		name.startsWith(VIGNETTE_PREFIX)
	) {
		return null;
	}

	const data: JourneyData = {
		type,
		name,
		description: [],
		tags: [],
		consequences: [],
		vignettes: [],
		warnings: [],
	};

	let sawConsequencesKeyword = false;
	let warnedSharedConsequenceBeforeKeyword = false;

	for (const line of lines.slice(2)) {
		if (CONSEQUENCES_KEYWORDS.indexOf(line) !== -1) {
			sawConsequencesKeyword = true;
			continue;
		}

		if (line.startsWith(VIGNETTE_PREFIX)) {
			const rest = line.slice(VIGNETTE_PREFIX.length).trim();
			const index = rest.indexOf(TRIGGER_SEPARATOR);

			if (index === -1) {
				data.vignettes.push({ name: rest, consequences: [] });
				data.warnings.push(
					`Vignette "${rest}" has no trigger: is the " : " separator missing?`,
				);
			} else {
				data.vignettes.push({
					name: rest.slice(0, index).trim(),
					trigger: rest.slice(index + TRIGGER_SEPARATOR.length).trim(),
					consequences: [],
				});
			}

			continue;
		}

		// A consequence belongs to the open vignette, or to the shared list
		// while no vignette has started yet.
		if (line.startsWith(">")) {
			const consequence = line.slice(1).trim();

			if (!consequence) {
				continue;
			}

			const current = data.vignettes[data.vignettes.length - 1];

			if (current) {
				current.consequences.push(consequence);
			} else {
				if (!sawConsequencesKeyword && !warnedSharedConsequenceBeforeKeyword) {
					warnedSharedConsequenceBeforeKeyword = true;
					data.warnings.push(
						'A consequence was written before any "CONSEQUENCES" (or "GENERAL CONSEQUENCES") heading.',
					);
				}

				data.consequences.push(consequence);
			}

			continue;
		}

		const lowered = line.toLowerCase();

		if (lowered.startsWith(TAGS_PREFIX)) {
			data.tags = splitList(line.slice(TAGS_PREFIX.length));
		} else if (lowered.startsWith(BENEFITS_PREFIX)) {
			data.benefits = line.slice(BENEFITS_PREFIX.length).trim();

			if (data.type !== "undertaking") {
				data.warnings.push(
					`Benefits are only printed on Undertaking journeys, but this one is a ${data.type}.`,
				);
			}
		} else if (line.startsWith(":")) {
			data.description.push(line.slice(1).trim());
		} else {
			data.warnings.push(`Line not understood: "${line}"`);
		}
	}

	return data;
}
