import { asInteger, asRecordList, asString } from "../blocks/schemaValues";
import {
	AdrenalineDocument,
	asRecord,
	CHARACTERISTIC_KEYS,
	parseAdrenalineDocument,
	readAdrenalineMeta,
	readCharacteristics,
	readEquipment,
	readFormations,
	readHealth,
	readIdentity,
	rememberAdrenalineSource,
	adrenalineSourceDocument,
	readProtections,
	readCurrentValue,
	stringifyAdrenalineDocument,
	warnUnknownKeys,
} from "../adrenaline/document";
import { AdrenalinePjData, GameParameters } from "./parser";

const THRESHOLDS = ["superficiel", "leger", "grave", "profond"] as const;

function completeHealth(data: ReturnType<typeof readHealth>): boolean {
	return [data?.physique, data?.mental].every(
		(side) => side && THRESHOLDS.every((key) => side[key] !== undefined),
	);
}

function readGameParameters(value: unknown): GameParameters | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	warnUnknownKeys(
		record,
		["joueur", "typeDeCreation", "typeDeScenario", "declinaisonDeCampagne", "px"],
		"parametresDuJeu",
	);
	const result: GameParameters = {};
	const joueur = asString(record.joueur);
	const creation = asString(record.typeDeCreation);
	const scenario = asString(record.typeDeScenario);
	const campaign = asString(record.declinaisonDeCampagne);
	const px = asInteger(record.px, 0, 1000000);
	if (joueur) result.joueur = joueur;
	if (creation === "equitable" || creation === "aleatoire") result.typeDeCreation = creation;
	if (scenario === "one-shot" || scenario === "campagne") result.typeDeScenario = scenario;
	if (campaign === "bac-a-sable" || campaign === "storyline") result.declinaisonDeCampagne = campaign;
	if (px !== undefined) result.px = px;
	return Object.keys(result).length > 0 ? result : undefined;
}

function readPartyState(value: unknown): AdrenalinePjData["etatDePartie"] {
	const source = asRecord(value);
	if (!source) return undefined;
	const state: NonNullable<AdrenalinePjData["etatDePartie"]> = {};
	for (const name of ["stress", "malus"] as const) {
		const group = asRecord(source[name]);
		if (!group) continue;
		const keys = name === "stress" ? ["adrenaline", "panique"] as const : ["physique", "mental"] as const;
		const values: Record<string, number> = {};
		for (const key of keys) {
			const count = readCurrentValue(group[key], 0, 100);
			if (count !== undefined) values[key] = count;
		}
		if (Object.keys(values).length) Object.assign(state, { [name]: values });
	}
	const fatigue = asRecord(source.fatigue);
	if (fatigue) {
		const rounds = readCurrentValue(fatigue.rounds, 0, 5);
		const heures = readCurrentValue(fatigue.heures, 0, 5);
		if (rounds !== undefined || heures !== undefined) state.fatigue = { rounds, heures };
	}
	const etats: NonNullable<NonNullable<AdrenalinePjData["etatDePartie"]>["etats"]> = [];
	for (const entry of asRecordList(source.etats)) {
		const nom = asString(entry.nom);
		const versant = asString(entry.versant);
		if (!nom || !["physique", "mental", "general"].includes(versant)) continue;
		etats.push({
			nom,
			versant: versant as "physique" | "mental" | "general",
			localisation: asString(entry.localisation) || undefined,
			duree: asString(entry.duree) || undefined,
			notes: asString(entry.notes) || undefined,
		});
	}
	if (etats.length) state.etats = etats;
	return Object.keys(state).length ? state : undefined;
}

export function documentToPj(value: unknown): AdrenalinePjData | null {
	const document = asRecord(value);
	if (!document) return null;
	warnUnknownKeys(
		document,
		["nom", "identite", "caracteristiques", "sante", "protections", "formations", "equipement", "parametresDuJeu", "etatDePartie", "meta"],
		"pj",
	);
	const nom = asString(document.nom);
	const caracteristiques = readCharacteristics(document.caracteristiques);
	const sante = readHealth(document.sante);
	const protections = readProtections(document.protections);
	if (
		!nom ||
		!caracteristiques ||
		!CHARACTERISTIC_KEYS.every((key) => caracteristiques[key] !== undefined) ||
		!completeHealth(sante) ||
		!protections?.physiques ||
		protections.physiques.solidite === undefined ||
		!protections.mentales ||
		protections.mentales.solidite === undefined
	) {
		return null;
	}
	const data: AdrenalinePjData = { nom, caracteristiques, sante: sante!, protections };
	const identite = readIdentity(document.identite);
	const formations = readFormations(document.formations);
	const equipement = readEquipment(document.equipement);
	const parameters = readGameParameters(document.parametresDuJeu);
	const partyState = readPartyState(document.etatDePartie);
	const meta = readAdrenalineMeta(document.meta);
	if (identite) data.identite = identite;
	if (formations.length > 0) data.formations = formations;
	if (equipement) data.equipement = equipement;
	if (parameters) data.parametresDuJeu = parameters;
	if (partyState) data.etatDePartie = partyState;
	if (meta) data.meta = meta;
	return rememberAdrenalineSource(data, document);
}

export function parsePjDocument(source: string): AdrenalinePjData | null {
	const document = parseAdrenalineDocument(source);
	return document ? documentToPj(document) : null;
}

export function pjToDocument(data: AdrenalinePjData): AdrenalineDocument {
	const source = adrenalineSourceDocument(data);
	if (source) return source;
	const document: AdrenalineDocument = {
		nom: data.nom,
		caracteristiques: data.caracteristiques,
		sante: data.sante,
		protections: data.protections,
	};
	if (data.identite) document.identite = data.identite;
	if (data.formations) document.formations = data.formations;
	if (data.equipement) document.equipement = data.equipement;
	if (data.parametresDuJeu) document.parametresDuJeu = data.parametresDuJeu;
	if (data.etatDePartie) document.etatDePartie = data.etatDePartie;
	if (data.meta) document.meta = data.meta;
	return document;
}

export function pjToToml(data: AdrenalinePjData): string {
	return stringifyAdrenalineDocument(pjToDocument(data));
}
