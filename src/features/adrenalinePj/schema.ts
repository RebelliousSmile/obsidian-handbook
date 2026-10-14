import { asInteger, asString } from "../blocks/schemaValues";
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
	stringifyAdrenalineDocument,
	warnUnknownKeys,
} from "../adrenaline/document";
import { contractRefusal } from "../adrenaline/publishedContract";
import { AdrenalinePjData, GameParameters } from "./parser";
import { upgradeLegacyPj } from "./legacyRanges";

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
		["joueur", "typeDeCreation", "typeDeScenario", "declinaisonDeCampagne", "scenario", "px"],
		"parametresDuJeu",
	);
	const result: GameParameters = {};
	const joueur = asString(record.joueur);
	const creation = asString(record.typeDeCreation);
	const scenario = asString(record.typeDeScenario);
	const campaign = asString(record.declinaisonDeCampagne);
	const scenarioName = asString(record.scenario);
	const range = asRecord(record.px);
	const minimum = asInteger(range?.minimum, 0, 1000000);
	const current = asInteger(range?.current, 0, 1000000);
	const maximum = asInteger(range?.maximum, 0, 1000000);
	const px = minimum !== undefined && current !== undefined && maximum !== undefined ? { minimum, current, maximum } : undefined;
	if (joueur) result.joueur = joueur;
	if (creation === "equitable" || creation === "aleatoire") result.typeDeCreation = creation;
	if (scenario === "one-shot" || scenario === "campagne") result.typeDeScenario = scenario;
	if (campaign === "bac-a-sable" || campaign === "storyline") result.declinaisonDeCampagne = campaign;
	if (scenarioName) result.scenario = scenarioName;
	if (px !== undefined) result.px = px;
	return Object.keys(result).length > 0 ? result : undefined;
}

export function documentToPj(value: unknown): AdrenalinePjData | null {
	const written = asRecord(value);
	if (!written) return null;
	// A note written before contract 5.0.0 still draws: its ranges become the number the sheet prints.
	const document = upgradeLegacyPj(written);
	if (contractRefusal("pj", document)) return null;
	warnUnknownKeys(
		document,
		["nom", "identite", "caracteristiques", "sante", "protections", "formations", "equipement", "parametresDuJeu", "etatDePartie", "meta"],
		"pj",
	);
	// The contract asks for a name of at least one character: a name that is only blanks is a name, kept as entered.
	const nom = asString(document.nom) || (typeof document.nom === "string" ? document.nom : "");
	const caracteristiques = readCharacteristics(document.caracteristiques);
	const sante = readHealth(document.sante);
	const protections = readProtections(document.protections);
	if (
		!nom ||
		!caracteristiques ||
		!CHARACTERISTIC_KEYS.every((key) => caracteristiques[key] !== undefined) ||
		!completeHealth(sante)
	) {
		return null;
	}
	const data: AdrenalinePjData = { nom, caracteristiques, sante: sante! };
	if (protections) data.protections = protections;
	const identite = readIdentity(document.identite);
	const formations = readFormations(document.formations);
	const equipement = readEquipment(document.equipement, "pj");
	const parameters = readGameParameters(document.parametresDuJeu);
	const meta = readAdrenalineMeta(document.meta);
	if (identite) data.identite = identite;
	if (formations.length > 0) data.formations = formations;
	if (equipement) data.equipement = equipement;
	if (parameters) data.parametresDuJeu = parameters;
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
	};
	if (data.protections) document.protections = data.protections;
	if (data.identite) document.identite = data.identite;
	if (data.formations) document.formations = data.formations;
	if (data.equipement) document.equipement = data.equipement;
	if (data.parametresDuJeu) document.parametresDuJeu = data.parametresDuJeu;
	if (data.meta) document.meta = data.meta;
	return document;
}

export function pjToToml(data: AdrenalinePjData): string {
	return stringifyAdrenalineDocument(pjToDocument(data));
}
