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
	ChallengeData,
	ChallengeLimit,
	ChallengeMight,
	ChallengeThreat,
	MIGHT_LEVELS,
	MightLevel,
} from "./parser";

/**
 * A challenge as schema-in-the-mist defines it: the interchange shape Lantern
 * in the Mist reads and writes. It is a data format, not a writing syntax, so
 * it sits beside the terse grammar rather than replacing it. Both front-ends
 * produce a `ChallengeData`, and one renderer draws it.
 *
 * One field is ours: `secrets`, which the printed profiles carry and the
 * upstream schema does not describe yet.
 */
export interface ChallengeDocument {
	name: string;
	description?: string;
	rating?: number;
	roles?: string[];
	tags_and_statuses?: string[];
	mights?: ChallengeMightDocument[];
	limits?: ChallengeLimitDocument[];
	threats?: ChallengeThreatDocument[];
	general_consequences?: string[];
	special_features?: ChallengeFeatureDocument[];
	secrets?: ChallengeSecretDocument[];
	meta?: SchemaMeta;
}

export interface ChallengeMightDocument {
	name: string;
	level?: MightLevel;
	vulnerability?: string;
}

export interface ChallengeLimitDocument {
	name: string;
	level?: number;
	is_immune?: boolean;
	is_progress?: boolean;
	on_max?: string;
}

export interface ChallengeThreatDocument {
	name: string;
	description?: string;
	consequences?: string[];
}

export interface ChallengeFeatureDocument {
	name: string;
	description?: string;
}

export interface ChallengeSecretDocument {
	label?: string;
	text: string;
}

/** The rating a limit carries when the profile grants it immunity. */
const IMMUNE_RATING = "~";

function asLevel(value: unknown): MightLevel | undefined {
	const text = asString(value).toLowerCase();

	return MIGHT_LEVELS.indexOf(text as MightLevel) === -1
		? undefined
		: (text as MightLevel);
}

/**
 * The schema holds a tier and an immunity flag where the grammar writes a
 * single rating: a number, or the mark that means statuses on this vector are
 * ignored.
 */
function documentToLimit(entry: Record<string, unknown>): ChallengeLimit {
	let rating = "";

	if (entry.is_immune === true) {
		rating = IMMUNE_RATING;
	} else if (typeof entry.level === "number") {
		rating = String(entry.level);
	}

	const limit: ChallengeLimit = { name: asString(entry.name), rating };

	if (entry.is_progress === true) {
		limit.progress = true;
	}

	const onMax = asString(entry.on_max);

	if (onMax) {
		limit.consequence = onMax;
	}

	return limit;
}

function documentToMight(entry: Record<string, unknown>): ChallengeMight {
	const might: ChallengeMight = { aspect: asString(entry.name) };
	const level = asLevel(entry.level);

	if (level) {
		might.level = level;
	}

	const vulnerability = asString(entry.vulnerability);

	if (vulnerability) {
		might.vulnerability = vulnerability;
	}

	return might;
}

/**
 * The trigger is written before the consequences, as the terse grammar writes
 * it, so a profile keeps the same shape whichever front-end read it.
 */
function documentToThreat(entry: Record<string, unknown>): ChallengeThreat {
	const name = asString(entry.name);
	const description = asString(entry.description);
	const consequences = asStringList(entry.consequences);

	return description
		? { name, trigger: description, consequences }
		: { name, consequences };
}

/** Turn a parsed TOML document into the shape the renderer draws. */
export function documentToChallenge(value: unknown): ChallengeData | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	const document = value as Record<string, unknown>;
	const name = asString(document.name);

	if (!name) {
		return null;
	}

	const data: ChallengeData = {
		name,
		roles: asStringList(document.roles),
		description: [],
		limits: [],
		mights: [],
		tags: asStringList(document.tags_and_statuses),
		features: [],
		threats: [],
		generalConsequences: asStringList(document.general_consequences),
		secrets: [],
	};

	const description = asString(document.description);

	if (description) {
		data.description.push(description);
	}

	if (typeof document.rating === "number") {
		data.rating = document.rating;
	}

	for (const entry of asRecordList(document.mights)) {
		data.mights.push(documentToMight(entry));
	}

	for (const entry of asRecordList(document.limits)) {
		data.limits.push(documentToLimit(entry));
	}

	for (const entry of asRecordList(document.threats)) {
		data.threats.push(documentToThreat(entry));
	}

	for (const entry of asRecordList(document.special_features)) {
		data.features.push({
			name: asString(entry.name),
			effect: asString(entry.description),
		});
	}

	for (const entry of asRecordList(document.secrets)) {
		const text = asString(entry.text);

		if (text) {
			data.secrets.push({ label: asString(entry.label), text });
		}
	}

	const meta = readMeta(document.meta);

	if (meta) {
		data.meta = meta;
	}

	return data;
}

/**
 * Turn a parsed challenge back into a schema-shaped document. A field the
 * profile leaves empty is left out rather than written as an empty value.
 */
export function challengeToDocument(data: ChallengeData): ChallengeDocument {
	const document: ChallengeDocument = { name: data.name };

	if (data.description.length > 0) {
		document.description = data.description.join(" ");
	}

	if (typeof data.rating === "number") {
		document.rating = data.rating;
	}

	if (data.roles.length > 0) {
		document.roles = data.roles.slice();
	}

	if (data.tags.length > 0) {
		document.tags_and_statuses = data.tags.slice();
	}

	if (data.mights.length > 0) {
		document.mights = data.mights.map((might) => {
			const entry: ChallengeMightDocument = { name: might.aspect };

			if (might.level) {
				entry.level = might.level;
			}

			if (might.vulnerability) {
				entry.vulnerability = might.vulnerability;
			}

			return entry;
		});
	}

	if (data.limits.length > 0) {
		document.limits = data.limits.map((limit) => {
			const entry: ChallengeLimitDocument = { name: limit.name };
			const level = parseInt(limit.rating, 10);

			if (!isNaN(level)) {
				entry.level = level;
			} else if (limit.rating) {
				entry.is_immune = true;
			}

			if (limit.progress) {
				entry.is_progress = true;
			}

			if (limit.consequence) {
				entry.on_max = limit.consequence;
			}

			return entry;
		});
	}

	if (data.threats.length > 0) {
		document.threats = data.threats.map((threat) => {
			const entry: ChallengeThreatDocument = { name: threat.name };

			if (threat.trigger) {
				entry.description = threat.trigger;
			}

			if (threat.consequences.length > 0) {
				entry.consequences = threat.consequences.slice();
			}

			return entry;
		});
	}

	if (data.generalConsequences.length > 0) {
		document.general_consequences = data.generalConsequences.slice();
	}

	if (data.features.length > 0) {
		document.special_features = data.features.map((feature) =>
			feature.effect
				? { name: feature.name, description: feature.effect }
				: { name: feature.name },
		);
	}

	if (data.secrets.length > 0) {
		document.secrets = data.secrets.map((secret) =>
			secret.label
				? { label: secret.label, text: secret.text }
				: { text: secret.text },
		);
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
export function parseChallengeDocument(source: string): ChallengeData | null {
	if (!looksLikeToml(source)) {
		return null;
	}

	try {
		return documentToChallenge(parseToml(source));
	} catch {
		return null;
	}
}

/** Serialize a parsed challenge as a schema-shaped TOML document. */
export function challengeToToml(data: ChallengeData): string {
	const toml = stringifyToml(challengeToDocument(data));

	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
