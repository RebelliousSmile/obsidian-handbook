import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import {
	asInteger,
	asRecordList,
	asString,
	asStringList,
	looksLikeToml,
} from "../blocks/schemaValues";
import { logScope } from "../../utils/logger";

export const CHARACTERISTIC_KEYS = [
	"for",
	"con",
	"dex",
	"rap",
	"log",
	"vol",
	"per",
	"cha",
] as const;
export type CharacteristicKey = (typeof CHARACTERISTIC_KEYS)[number];
export type AdrenalineDocument = Record<string, unknown>;
export type Characteristics = Partial<Record<CharacteristicKey, number>>;

export interface Threshold {
	base: number;
	couvert?: number;
}

export interface HealthSide {
	superficiel?: Threshold;
	leger?: Threshold;
	grave?: Threshold;
	profond?: Threshold;
}

export interface Health {
	physique?: HealthSide;
	mental?: HealthSide;
}

export interface ProtectionSide {
	solidite?: number;
	armure?: Record<string, unknown>;
	caractere?: Record<string, unknown>;
	bouclier?: Record<string, unknown>;
}

export interface Protections {
	physiques?: ProtectionSide;
	mentales?: ProtectionSide;
}

export interface Competence {
	nom: string;
	specialite?: string;
	pourcentage: number;
	caracteristique?: CharacteristicKey;
	total?: number;
	avantages?: string[];
}

export interface Formation {
	type: string;
	nom: string;
	pourcentage: number;
	competences?: Competence[];
}

export interface EquipmentWeapon {
	nom: string;
	pourcentage?: number;
	desDeDegats?: number;
	type?: string;
	notes?: string;
}

export interface Equipment {
	possessions?: string[];
	equipementFavori?: string;
	armesPhysiques?: EquipmentWeapon[];
	armesMentales?: EquipmentWeapon[];
}

export interface AdrenalineMeta {
	typeDePublication?: "officiel" | "tiers" | "communautaire" | "maison";
	source?: string;
	auteurs?: string[];
	page?: number;
	licence?: string;
}

export interface Identity {
	nationalite?: string;
	genre?: string;
	cheveux?: string;
	age?: number;
	yeux?: string;
	taille?: string;
	peau?: string;
	poids?: string;
	signesParticuliers?: string[];
}

export interface Narrative {
	role?: string;
	attitude?: string;
	personnalite?: string[];
	historique?: string;
	evolutionPossible?: string;
	interpretation?: string[];
	repliques?: string[];
	notesMj?: string[];
}

const log = logScope("Adrenaline");
const warned = new Set<string>();
const THRESHOLD_KEYS = ["superficiel", "leger", "grave", "profond"];
const CHARACTERISTIC_SET = new Set<string>(CHARACTERISTIC_KEYS);

export function asRecord(value: unknown): AdrenalineDocument | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as AdrenalineDocument)
		: undefined;
}

function warnOnce(key: string, message: string): void {
	if (warned.has(key)) return;
	warned.add(key);
	log.warn(message);
}

export function warnUnknownKeys(
	value: AdrenalineDocument,
	allowed: string[],
	scope: string,
): void {
	for (const key of Object.keys(value)) {
		if (allowed.indexOf(key) === -1) {
			warnOnce(`${scope}.${key}`, `Ignoring unknown ${scope} key "${key}".`);
		}
	}
}

export function parseAdrenalineDocument(source: string): AdrenalineDocument | null {
	if (!looksLikeToml(source)) return null;
	try {
		return asRecord(parseToml(source)) ?? null;
	} catch {
		return null;
	}
}

export function stringifyAdrenalineDocument(value: AdrenalineDocument): string {
	return `${stringifyToml(value).replace(/\s+$/, "")}\n`;
}

export function readCharacteristics(value: unknown): Characteristics | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(record, [...CHARACTERISTIC_KEYS], "caracteristiques");
	const result: Characteristics = {};
	for (const key of CHARACTERISTIC_KEYS) {
		const score = asInteger(record[key], 0, 200);
		if (score !== undefined) result[key] = score;
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

function readThreshold(value: unknown): Threshold | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const base = asInteger(record.base, 0, 100);
	if (base === undefined) return undefined;
	const threshold: Threshold = { base };
	const covered = asInteger(record.couvert, 0, 100);
	if (covered !== undefined) threshold.couvert = covered;
	return threshold;
}

function readHealthSide(value: unknown): HealthSide | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(record, THRESHOLD_KEYS, "sante");
	const side: HealthSide = {};
	for (const key of THRESHOLD_KEYS) {
		const threshold = readThreshold(record[key]);
		if (threshold) side[key as keyof HealthSide] = threshold;
	}
	return Object.keys(side).length > 0 ? side : undefined;
}

export function readHealth(value: unknown): Health | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(record, ["physique", "mental"], "sante");
	const physique = readHealthSide(record.physique);
	const mental = readHealthSide(record.mental);
	return physique || mental ? { physique, mental } : undefined;
}

function cleanFreeRecord(value: unknown, allowed: string[], scope: string): AdrenalineDocument | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(record, allowed, scope);
	const clean: AdrenalineDocument = {};
	for (const key of allowed) {
		if (record[key] !== undefined) clean[key] = record[key];
	}
	return Object.keys(clean).length > 0 ? clean : undefined;
}

function readProtectionSide(value: unknown, mental: boolean): ProtectionSide | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const allowed = mental
		? ["solidite", "caractere", "bouclier"]
		: ["solidite", "armure", "bouclier"];
	warnUnknownKeys(record, allowed, mental ? "protections.mentales" : "protections.physiques");
	const result: ProtectionSide = {};
	const solidite = asInteger(record.solidite, 0, 100);
	if (solidite !== undefined) result.solidite = solidite;
	if (mental) {
		result.caractere = cleanFreeRecord(
			record.caractere,
			["trait", "points", "localisations"],
			"protections.mentales.caractere",
		);
	} else {
		result.armure = cleanFreeRecord(
			record.armure,
			["nom", "points", "localisations"],
			"protections.physiques.armure",
		);
	}
	result.bouclier = cleanFreeRecord(
		record.bouclier,
		["nom", "proprietes"],
		mental ? "protections.mentales.bouclier" : "protections.physiques.bouclier",
	);
	return Object.keys(result).some((key) => result[key as keyof ProtectionSide] !== undefined)
		? result
		: undefined;
}

export function readProtections(value: unknown): Protections | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(record, ["physiques", "mentales"], "protections");
	const physiques = readProtectionSide(record.physiques, false);
	const mentales = readProtectionSide(record.mentales, true);
	return physiques || mentales ? { physiques, mentales } : undefined;
}

export function readCompetences(value: unknown): Competence[] {
	const result: Competence[] = [];
	for (const record of asRecordList(value)) {
		warnUnknownKeys(
			record,
			["nom", "specialite", "pourcentage", "caracteristique", "total", "avantages"],
			"competence",
		);
		const nom = asString(record.nom);
		const pourcentage = asInteger(record.pourcentage, 0, 200);
		if (!nom || pourcentage === undefined) continue;
		const competence: Competence = { nom, pourcentage };
		const specialite = asString(record.specialite);
		if (specialite) competence.specialite = specialite;
		const characteristic = asString(record.caracteristique);
		if (CHARACTERISTIC_SET.has(characteristic)) {
			competence.caracteristique = characteristic as CharacteristicKey;
		}
		const total = asInteger(record.total, 0, 200);
		if (total !== undefined) competence.total = total;
		const avantages = asStringList(record.avantages);
		if (avantages.length > 0) competence.avantages = avantages;
		result.push(competence);
	}
	return result;
}

export function displayedCompetenceTotal(
	competence: Competence,
	characteristics?: Characteristics,
): number | undefined {
	const key = competence.caracteristique;
	if (!key || !characteristics || characteristics[key] === undefined) return undefined;
	return competence.pourcentage + (characteristics[key] ?? 0);
}

export function readFormations(value: unknown): Formation[] {
	const result: Formation[] = [];
	for (const record of asRecordList(value)) {
		warnUnknownKeys(record, ["type", "nom", "pourcentage", "competences"], "formation");
		const type = asString(record.type);
		const nom = asString(record.nom);
		const pourcentage = asInteger(record.pourcentage, 0, 200);
		if (!type || !nom || pourcentage === undefined) continue;
		const formation: Formation = { type, nom, pourcentage };
		const competences = readCompetences(record.competences);
		if (competences.length > 0) formation.competences = competences;
		result.push(formation);
	}
	return result;
}

function readWeapons(value: unknown): EquipmentWeapon[] {
	const result: EquipmentWeapon[] = [];
	for (const record of asRecordList(value)) {
		const nom = asString(record.nom);
		if (!nom) continue;
		const weapon: EquipmentWeapon = { nom };
		const pourcentage = asInteger(record.pourcentage, 0, 200);
		const damage = asInteger(record.desDeDegats, 0, 100);
		const type = asString(record.type);
		const notes = asString(record.notes);
		if (pourcentage !== undefined) weapon.pourcentage = pourcentage;
		if (damage !== undefined) weapon.desDeDegats = damage;
		if (type) weapon.type = type;
		if (notes) weapon.notes = notes;
		result.push(weapon);
	}
	return result;
}

export function readEquipment(value: unknown): Equipment | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(record, ["possessions", "equipementFavori", "armesPhysiques", "armesMentales"], "equipement");
	const equipment: Equipment = {};
	const possessions = asStringList(record.possessions);
	const favorite = asString(record.equipementFavori);
	const physical = readWeapons(record.armesPhysiques);
	const mental = readWeapons(record.armesMentales);
	if (possessions.length > 0) equipment.possessions = possessions;
	if (favorite) equipment.equipementFavori = favorite;
	if (physical.length > 0) equipment.armesPhysiques = physical;
	if (mental.length > 0) equipment.armesMentales = mental;
	return Object.keys(equipment).length > 0 ? equipment : undefined;
}

export function readIdentity(value: unknown): Identity | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const identity: Identity = {};
	for (const key of ["nationalite", "genre", "cheveux", "yeux", "taille", "peau", "poids"] as const) {
		const text = asString(record[key]);
		if (text) identity[key] = text;
	}
	const age = asInteger(record.age, 0, 200);
	if (age !== undefined) identity.age = age;
	const signs = asStringList(record.signesParticuliers);
	if (signs.length > 0) identity.signesParticuliers = signs;
	return Object.keys(identity).length > 0 ? identity : undefined;
}

export function readNarrative(value: unknown): Narrative | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const narrative: Narrative = {};
	for (const key of ["role", "attitude", "historique", "evolutionPossible"] as const) {
		const text = asString(record[key]);
		if (text) narrative[key] = text;
	}
	for (const key of ["personnalite", "interpretation", "repliques", "notesMj"] as const) {
		const list = asStringList(record[key]);
		if (list.length > 0) narrative[key] = list;
	}
	return Object.keys(narrative).length > 0 ? narrative : undefined;
}

export function readAdrenalineMeta(value: unknown): AdrenalineMeta | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(record, ["typeDePublication", "source", "auteurs", "page", "licence"], "meta");
	const meta: AdrenalineMeta = {};
	const publication = asString(record.typeDePublication);
	if (["officiel", "tiers", "communautaire", "maison"].indexOf(publication) !== -1) {
		meta.typeDePublication = publication as AdrenalineMeta["typeDePublication"];
	}
	const source = asString(record.source);
	const auteurs = asStringList(record.auteurs);
	const page = asInteger(record.page, 1, 10000);
	const licence = asString(record.licence);
	if (source) meta.source = source;
	if (auteurs.length > 0) meta.auteurs = auteurs;
	if (page !== undefined) meta.page = page;
	if (licence) meta.licence = licence;
	return Object.keys(meta).length > 0 ? meta : undefined;
}

export function warnMentalHealthWithoutCharacteristics(
	health?: Health,
	characteristics?: Characteristics,
): void {
	if (health?.mental && !CHARACTERISTIC_KEYS.slice(4).some((key) => characteristics?.[key] !== undefined)) {
		warnOnce(
			"semantic.mental-health",
			"Mental health is present without mental characteristics; preserving the data.",
		);
	}
}
