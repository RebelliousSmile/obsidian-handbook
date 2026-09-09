import {
	AdrenalineMeta,
	Characteristics,
	Competence,
	Equipment,
	Health,
	Narrative,
	Protections,
} from "../adrenaline/document";
import { parseMonsterDocument } from "./schema";

export interface AlternateState {
	nom: string;
	declencheurs?: string[];
	caracteristiques?: Characteristics;
	zoneDeDetection?: string;
	deplacement?: string;
	actionsParRound?: number;
	notes?: string;
}

export interface ContagionVector {
	nom: string;
	probabilite?: number;
	notes?: string;
}

export interface ContagionModulation {
	profil: string;
	delaiAvantEffet?: string;
	issue?: string;
}

export interface Contagion {
	agent?: string;
	vecteurs?: ContagionVector[];
	delaiAvantEffet?: string;
	issue?: string;
	modulations?: ContagionModulation[];
}

export interface AdrenalineMonsterData {
	nom: string;
	typeDeCorps?: string;
	instinct?: string;
	typeInfecte?: string;
	description?: string;
	niveauDeDanger?: number;
	caracteristiques: Characteristics;
	sante?: Health;
	protections?: Protections;
	zoneDeDetection?: string;
	deplacement?: string;
	actionsParRound?: number;
	etatAlternatif?: AlternateState;
	comportement?: string[];
	traitsSpeciaux?: string[];
	competences?: Competence[];
	equipement?: Equipment;
	contagion?: Contagion;
	narratif?: Narrative;
	meta?: AdrenalineMeta;
}

export function parseAdrenalineMonster(source: string): AdrenalineMonsterData | null {
	return parseMonsterDocument(source);
}
