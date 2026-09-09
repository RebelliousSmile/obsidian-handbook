import { stringify as stringifyToml } from "smol-toml";
import { asBoolean, asInteger, asRecordList, asString, asStringList, readMeta, SchemaMeta } from "../blocks/schemaValues";
import { parseOtherscapeDocument } from "../otherscape/document";
import { OsSpecial, OsThreat, OsThemeType } from "../otherscape/types";
import { OsLimit, OsProfileData } from "./parser";

type PowerType = Exclude<OsThemeType, "crew">;
const POWER_TYPES: PowerType[] = ["self", "mythos", "noise"];

export interface OsProfileDocument {
	name: string; type?: PowerType; description?: string; scale?: number;
	tags_and_statuses?: string[]; limits?: OsLimitDocument[];
	specials?: OsSpecial[]; threats?: OsThreatDocument[];
	general_consequences?: string[]; meta?: SchemaMeta;
}
interface OsLimitDocument { name: string; level: number; is_polar: boolean; is_progress: boolean; on_max?: string; }
interface OsThreatDocument { name: string; description: string; consequences?: string[]; }

function readNamedDescriptions(value: unknown): OsSpecial[] {
	const result: OsSpecial[] = [];
	for (const entry of asRecordList(value)) {
		const name = asString(entry.name); const description = asString(entry.description);
		if (name && description) result.push({ name, description });
	}
	return result;
}

function readThreats(value: unknown): OsThreat[] {
	const result: OsThreat[] = [];
	for (const entry of asRecordList(value)) {
		const name = asString(entry.name); const description = asString(entry.description);
		if (name && description) result.push({ name, description, consequences: asStringList(entry.consequences) });
	}
	return result;
}

function readLimits(value: unknown): OsLimit[] {
	const result: OsLimit[] = [];
	for (const entry of asRecordList(value)) {
		const name = asString(entry.name); const level = asInteger(entry.level, 1, 6);
		if (!name || level === undefined) continue;
		const limit: OsLimit = {
			name, level,
			isPolar: asBoolean(entry.is_polar) ?? false,
			isProgress: asBoolean(entry.is_progress) ?? false,
		};
		const onMax = asString(entry.on_max); if (onMax) limit.onMax = onMax;
		result.push(limit);
	}
	return result;
}

export function parseOsProfileDocument(source: string, kind: OsProfileData["kind"]): OsProfileData | null {
	const document = parseOtherscapeDocument(source); if (!document) return null;
	const name = asString(document.name); if (!name) return null;
	const data: OsProfileData = {
		kind, name, tagsAndStatuses: [], limits: [], specials: readNamedDescriptions(document.specials),
		threats: readThreats(document.threats), generalConsequences: asStringList(document.general_consequences),
	};
	const description = asString(document.description); const meta = readMeta(document.meta);
	if (description) data.description = description; if (meta) data.meta = meta;
	if (kind === "challenge") {
		const scale = asInteger(document.scale); if (scale !== undefined) data.scale = scale;
		data.tagsAndStatuses = asStringList(document.tags_and_statuses);
		data.limits = readLimits(document.limits);
	} else {
		const type = asString(document.type).toLowerCase() as PowerType;
		if (!POWER_TYPES.includes(type)) return null;
		data.type = type;
	}
	return data;
}

export function osProfileToDocument(data: OsProfileData): OsProfileDocument {
	const document: OsProfileDocument = { name: data.name };
	if (data.description) document.description = data.description;
	if (data.kind === "challenge") {
		if (data.scale !== undefined) document.scale = data.scale;
		if (data.tagsAndStatuses.length) document.tags_and_statuses = [...data.tagsAndStatuses];
		if (data.limits.length) document.limits = data.limits.map((limit) => ({
			name: limit.name, level: limit.level, is_polar: limit.isPolar,
			is_progress: limit.isProgress, ...(limit.onMax ? { on_max: limit.onMax } : {}),
		}));
	} else if (data.type) document.type = data.type;
	if (data.specials.length) document.specials = data.specials.map((entry) => ({ ...entry }));
	if (data.threats.length) document.threats = data.threats.map((entry) => ({
		name: entry.name, description: entry.description,
		...(entry.consequences.length ? { consequences: [...entry.consequences] } : {}),
	}));
	if (data.generalConsequences.length) document.general_consequences = [...data.generalConsequences];
	if (data.meta) document.meta = data.meta;
	return document;
}

export function osProfileToToml(data: OsProfileData): string {
	const toml = stringifyToml(osProfileToDocument(data));
	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
