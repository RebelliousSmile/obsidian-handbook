import { asInteger, asString } from "../blocks/schemaValues";
import {
	AdrenalineDocument,
	asRecord,
	parseAdrenalineDocument,
	readAdrenalineMeta,
	readCharacteristics,
	readCompetences,
	readEquipment,
	readFormations,
	readHealth,
	readIdentity,
	readNarrative,
	readProtections,
	stringifyAdrenalineDocument,
	warnUnknownKeys,
} from "../adrenaline/document";
import { AdrenalinePnjData } from "./parser";

export function documentToPnj(value: unknown): AdrenalinePnjData | null {
	const document = asRecord(value);
	if (!document) return null;
	warnUnknownKeys(
		document,
		["nom", "niveauDeDanger", "description", "identite", "caracteristiques", "sante", "protections", "formations", "competences", "equipement", "narratif", "meta"],
		"pnj",
	);
	const nom = asString(document.nom);
	if (!nom) return null;
	const data: AdrenalinePnjData = { nom };
	const danger = asInteger(document.niveauDeDanger, 0, 100);
	const description = asString(document.description);
	const identite = readIdentity(document.identite);
	const caracteristiques = readCharacteristics(document.caracteristiques);
	const sante = readHealth(document.sante);
	const protections = readProtections(document.protections);
	const formations = readFormations(document.formations);
	const competences = readCompetences(document.competences);
	const equipement = readEquipment(document.equipement);
	const narratif = readNarrative(document.narratif);
	const meta = readAdrenalineMeta(document.meta);
	if (danger !== undefined) data.niveauDeDanger = danger;
	if (description) data.description = description;
	if (identite) data.identite = identite;
	if (caracteristiques) data.caracteristiques = caracteristiques;
	if (sante) data.sante = sante;
	if (protections) data.protections = protections;
	if (formations.length > 0) data.formations = formations;
	if (competences.length > 0) data.competences = competences;
	if (equipement) data.equipement = equipement;
	if (narratif) data.narratif = narratif;
	if (meta) data.meta = meta;
	return data;
}

export function parsePnjDocument(source: string): AdrenalinePnjData | null {
	const document = parseAdrenalineDocument(source);
	return document ? documentToPnj(document) : null;
}

export function pnjToDocument(data: AdrenalinePnjData): AdrenalineDocument {
	const document: AdrenalineDocument = { nom: data.nom };
	for (const key of ["niveauDeDanger", "description", "identite", "caracteristiques", "sante", "protections", "formations", "competences", "equipement", "narratif", "meta"] as const) {
		if (data[key] !== undefined) document[key] = data[key];
	}
	return document;
}

export function pnjToToml(data: AdrenalinePnjData): string {
	return stringifyAdrenalineDocument(pnjToDocument(data));
}
