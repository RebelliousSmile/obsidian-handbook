import { SchemaMeta } from "../blocks/schemaValues";
import { parseChallengeDocument } from "./schema";

/** The scale of a Might, as the shared schema names its three steps. */
export const MIGHT_LEVELS = ["origin", "adventure", "greatness"] as const;

export type MightLevel = (typeof MIGHT_LEVELS)[number];

export interface ChallengeLimit {
	name: string;
	rating: string;
	/** A limit that builds up toward its consequence instead of ending the
	 * challenge when it maxes out. */
	progress?: boolean;
	consequence?: string;
}

export interface ChallengeMight {
	aspect: string;
	level?: MightLevel;
	vulnerability?: string;
}

export interface ChallengeFeature {
	name: string;
	effect: string;
}

export interface ChallengeThreat {
	name: string;
	trigger?: string;
	consequences: string[];
}

export interface ChallengeSecret {
	label: string;
	text: string;
}

export interface ChallengeData {
	name: string;
	roles: string[];
	description: string[];
	/** How dangerous the profile is overall, 1 to 5, when it says. */
	rating?: number;
	limits: ChallengeLimit[];
	mights: ChallengeMight[];
	tags: string[];
	features: ChallengeFeature[];
	threats: ChallengeThreat[];
	/** What the challenge does on a consequence outside any threat. */
	generalConsequences: string[];
	secrets: ChallengeSecret[];
	/** Where the profile comes from, when a document said. */
	meta?: SchemaMeta;
}

type Section =
	| "limits"
	| "might"
	| "tags"
	| "features"
	| "threats"
	| "consequences"
	| "secrets";

/** Uppercase keywords opening a section, as printed in the challenge profiles. */
const SECTIONS: Record<string, Section> = {
	LIMITS: "limits",
	MIGHT: "might",
	TAGS: "tags",
	FEATURES: "features",
	THREATS: "threats",
	CONSEQUENCES: "consequences",
	"GENERAL CONSEQUENCES": "consequences",
	SECRETS: "secrets",
};

const ROLES_PREFIX = "roles:";
const RATING_PREFIX = "rating:";
const CONSEQUENCE_SEPARATOR = " > ";
const TRIGGER_SEPARATOR = " : ";
const MIGHT_PATTERN = /^(.*?)\s*\(([^)]*)\)\s*$/;
const LIMIT_PATTERN = /^(.*?)\s+(\d+|~|-)$/;
const TAG_PATTERN = /\{([^}]*)\}|(\S+)/g;

/** Split a line into what it is about and the consequence trailing a `>`. */
function splitConsequence(line: string): [string, string | undefined] {
	const index = line.indexOf(CONSEQUENCE_SEPARATOR);

	if (index === -1) {
		return [line.trim(), undefined];
	}

	return [
		line.slice(0, index).trim(),
		line.slice(index + CONSEQUENCE_SEPARATOR.length).trim(),
	];
}

/** A general consequence may be written as a `>` bullet, like a threat's. */
function stripBullet(line: string): string {
	return line.charAt(0) === ">" ? line.slice(1).trim() : line;
}

/** A tag run mixes braced multi-word tags and bare single-word ones. */
function parseTagRun(line: string): string[] {
	const tags: string[] = [];
	let match = TAG_PATTERN.exec(line);

	while (match !== null) {
		const tag = (match[1] ?? match[2] ?? "").trim();

		if (tag) {
			tags.push(tag);
		}

		match = TAG_PATTERN.exec(line);
	}

	TAG_PATTERN.lastIndex = 0;
	return tags;
}

function parseLimit(line: string): ChallengeLimit {
	const [subject, consequence] = splitConsequence(line);
	const match = LIMIT_PATTERN.exec(subject);
	const limit: ChallengeLimit = match
		? { name: match[1].trim(), rating: match[2] }
		: { name: subject, rating: "" };

	// A limit that spells out what maxing it out does is a progress limit: the
	// books give an `on_max` outcome to those and to no others.
	if (consequence) {
		limit.progress = true;
		limit.consequence = consequence;
	}

	return limit;
}

/** Read the optional `level:` opening a Might line, e.g. `greatness: Wings`. */
function splitMightLevel(line: string): [MightLevel | undefined, string] {
	const separator = line.indexOf(":");

	if (separator === -1) {
		return [undefined, line];
	}

	const candidate = line.slice(0, separator).trim().toLowerCase();

	return MIGHT_LEVELS.indexOf(candidate as MightLevel) === -1
		? [undefined, line]
		: [candidate as MightLevel, line.slice(separator + 1).trim()];
}

function parseMight(line: string): ChallengeMight {
	const [level, rest] = splitMightLevel(line);
	const match = MIGHT_PATTERN.exec(rest);
	const might: ChallengeMight = {
		aspect: match ? match[1].trim() : rest,
	};

	if (level) {
		might.level = level;
	}

	const vulnerability = match ? match[2].trim() : "";

	if (vulnerability) {
		might.vulnerability = vulnerability;
	}

	return might;
}

/**
 * A challenge profile, read either as a schema-in-the-mist document or in the
 * terse grammar. The document comes first because it announces itself: a TOML
 * key or table opens it, which the grammar never does.
 */
export function parseChallenge(source: string): ChallengeData | null {
	const document = parseChallengeDocument(source);

	if (document !== null) {
		return document;
	}

	return parseChallengeGrammar(source);
}

function parseChallengeGrammar(source: string): ChallengeData | null {
	const lines = source
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0 || SECTIONS[lines[0].toUpperCase()]) {
		return null;
	}

	const data: ChallengeData = {
		name: lines[0],
		roles: [],
		description: [],
		limits: [],
		mights: [],
		tags: [],
		features: [],
		threats: [],
		generalConsequences: [],
		secrets: [],
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
			if (line.toLowerCase().startsWith(ROLES_PREFIX)) {
				data.roles = line
					.slice(ROLES_PREFIX.length)
					.split(",")
					.map((role) => role.trim())
					.filter((role) => role.length > 0);
			} else if (line.toLowerCase().startsWith(RATING_PREFIX)) {
				const rating = parseInt(line.slice(RATING_PREFIX.length).trim(), 10);

				if (!isNaN(rating)) {
					data.rating = rating;
				}
			} else if (line.startsWith(":")) {
				data.description.push(line.slice(1).trim());
			}

			continue;
		}

		if (section === "limits") {
			data.limits.push(parseLimit(line));
		} else if (section === "might") {
			data.mights.push(parseMight(line));
		} else if (section === "tags") {
			data.tags.push(...parseTagRun(line));
		} else if (section === "features") {
			const [name, effect] = splitConsequence(line);
			data.features.push({ name, effect: effect ?? "" });
		} else if (section === "threats") {
			appendThreatLine(data.threats, line);
		} else if (section === "consequences") {
			data.generalConsequences.push(stripBullet(line));
		} else if (section === "secrets") {
			const separator = line.indexOf(":");

			if (separator === -1) {
				data.secrets.push({ label: "", text: line });
			} else {
				data.secrets.push({
					label: line.slice(0, separator).trim(),
					text: line.slice(separator + 1).trim(),
				});
			}
		}
	}

	return sectionsSeen > 0 ? data : null;
}

/** A threat opens on its own line, then owns every `>` line below it. */
function appendThreatLine(threats: ChallengeThreat[], line: string): void {
	if (line.startsWith(">")) {
		const consequence = line.slice(1).trim();
		const current = threats[threats.length - 1];

		if (current && consequence) {
			current.consequences.push(consequence);
		}

		return;
	}

	const index = line.indexOf(TRIGGER_SEPARATOR);

	if (index === -1) {
		threats.push({ name: line, consequences: [] });
		return;
	}

	threats.push({
		name: line.slice(0, index).trim(),
		trigger: line.slice(index + TRIGGER_SEPARATOR.length).trim(),
		consequences: [],
	});
}
