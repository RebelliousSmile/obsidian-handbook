import { asInteger, asRecordList, asString, asStringList } from "../blocks/schemaValues";
import {
	AdrenalineDocument,
	asRecord,
	parseAdrenalineDocument,
	readAdrenalineMeta,
	readCharacteristics,
	readCompetences,
	readEquipment,
	readHealth,
	readNarrative,
	readProtections,
	stringifyAdrenalineDocument,
	warnMentalHealthWithoutCharacteristics,
	warnUnknownKeys,
} from "../adrenaline/document";
import {
	AdrenalineMonsterData,
	AlternateState,
	Contagion,
	ContagionModulation,
	ContagionVector,
} from "./parser";

function readAlternateState(value: unknown): AlternateState | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const nom = asString(record.nom);
	if (!nom) return undefined;
	const state: AlternateState = { nom };
	const triggers = asStringList(record.declencheurs);
	const characteristics = readCharacteristics(record.caracteristiques);
	const detection = asString(record.zoneDeDetection);
	const movement = asString(record.deplacement);
	const actions = asInteger(record.actionsParRound, 0, 100);
	const notes = asString(record.notes);
	if (triggers.length > 0) state.declencheurs = triggers;
	if (characteristics) state.caracteristiques = characteristics;
	if (detection) state.zoneDeDetection = detection;
	if (movement) state.deplacement = movement;
	if (actions !== undefined) state.actionsParRound = actions;
	if (notes) state.notes = notes;
	return state;
}

function readVectors(value: unknown): ContagionVector[] {
	const result: ContagionVector[] = [];
	for (const record of asRecordList(value)) {
		const nom = asString(record.nom);
		if (!nom) continue;
		const vector: ContagionVector = { nom };
		const probability = asInteger(record.probabilite, 0, 100);
		const notes = asString(record.notes);
		if (probability !== undefined) vector.probabilite = probability;
		if (notes) vector.notes = notes;
		result.push(vector);
	}
	return result;
}

function readModulations(value: unknown): ContagionModulation[] {
	const result: ContagionModulation[] = [];
	for (const record of asRecordList(value)) {
		const profil = asString(record.profil);
		if (!profil) continue;
		const modulation: ContagionModulation = { profil };
		const delay = asString(record.delaiAvantEffet);
		const issue = asString(record.issue);
		if (delay) modulation.delaiAvantEffet = delay;
		if (issue) modulation.issue = issue;
		result.push(modulation);
	}
	return result;
}

function readContagion(value: unknown): Contagion | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const contagion: Contagion = {};
	const agent = asString(record.agent);
	const vectors = readVectors(record.vecteurs);
	const delay = asString(record.delaiAvantEffet);
	const issue = asString(record.issue);
	const modulations = readModulations(record.modulations);
	if (agent) contagion.agent = agent;
	if (vectors.length > 0) contagion.vecteurs = vectors;
	if (delay) contagion.delaiAvantEffet = delay;
	if (issue) contagion.issue = issue;
	if (modulations.length > 0) contagion.modulations = modulations;
	return Object.keys(contagion).length > 0 ? contagion : undefined;
}

export function documentToMonster(value: unknown): AdrenalineMonsterData | null {
	const document = asRecord(value);
	if (!document) return null;
	warnUnknownKeys(
		document,
		["nom", "typeDeCorps", "instinct", "typeInfecte", "description", "niveauDeDanger", "caracteristiques", "sante", "protections", "zoneDeDetection", "deplacement", "actionsParRound", "etatAlternatif", "comportement", "traitsSpeciaux", "competences", "equipement", "contagion", "narratif", "meta"],
		"monstre",
	);
	const nom = asString(document.nom);
	const characteristics = readCharacteristics(document.caracteristiques);
	const requiredPhysicalCharacteristics = ["for", "con", "dex", "rap"] as const;
	if (!nom || !characteristics || requiredPhysicalCharacteristics.some((key) => characteristics[key] === undefined)) return null;
	const data: AdrenalineMonsterData = { nom, caracteristiques: characteristics };
	for (const key of ["typeDeCorps", "instinct", "typeInfecte", "description", "zoneDeDetection", "deplacement"] as const) {
		const text = asString(document[key]);
		if (text) data[key] = text;
	}
	const danger = asInteger(document.niveauDeDanger, 0, 100);
	const actions = asInteger(document.actionsParRound, 0, 100);
	const health = readHealth(document.sante);
	const protections = readProtections(document.protections);
	const state = readAlternateState(document.etatAlternatif);
	const behaviour = asStringList(document.comportement);
	const traits = asStringList(document.traitsSpeciaux);
	const competences = readCompetences(document.competences);
	const equipment = readEquipment(document.equipement);
	const contagion = readContagion(document.contagion);
	const narrative = readNarrative(document.narratif);
	const meta = readAdrenalineMeta(document.meta);
	if (danger !== undefined) data.niveauDeDanger = danger;
	if (actions !== undefined) data.actionsParRound = actions;
	if (health) data.sante = health;
	if (protections) data.protections = protections;
	if (state) data.etatAlternatif = state;
	if (behaviour.length > 0) data.comportement = behaviour;
	if (traits.length > 0) data.traitsSpeciaux = traits;
	if (competences.length > 0) data.competences = competences;
	if (equipment) data.equipement = equipment;
	if (contagion) data.contagion = contagion;
	if (narrative) data.narratif = narrative;
	if (meta) data.meta = meta;
	warnMentalHealthWithoutCharacteristics(health, characteristics);
	return data;
}

export function parseMonsterDocument(source: string): AdrenalineMonsterData | null {
	const document = parseAdrenalineDocument(source);
	return document ? documentToMonster(document) : null;
}

export function monsterToDocument(data: AdrenalineMonsterData): AdrenalineDocument {
	const document: AdrenalineDocument = { nom: data.nom, caracteristiques: data.caracteristiques };
	for (const key of ["typeDeCorps", "instinct", "typeInfecte", "description", "niveauDeDanger", "sante", "protections", "zoneDeDetection", "deplacement", "actionsParRound", "etatAlternatif", "comportement", "traitsSpeciaux", "competences", "equipement", "contagion", "narratif", "meta"] as const) {
		if (data[key] !== undefined) document[key] = data[key];
	}
	return document;
}

export function monsterToToml(data: AdrenalineMonsterData): string {
	return stringifyAdrenalineDocument(monsterToDocument(data));
}
