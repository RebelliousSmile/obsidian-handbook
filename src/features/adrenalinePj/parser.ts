import {
	AdrenalineMeta,
	Characteristics,
	Equipment,
	Formation,
	Health,
	Identity,
	Protections,
} from "../adrenaline/document";
import { parsePjDocument } from "./schema";

export interface GameParameters {
	joueur?: string;
	typeDeCreation?: "equitable" | "aleatoire";
	typeDeScenario?: "one-shot" | "campagne";
	declinaisonDeCampagne?: "bac-a-sable" | "storyline";
	px?: number;
}

export interface AdrenalinePjData {
	nom: string;
	etatDePartie?: {
		stress?: { adrenaline?: number; panique?: number };
		malus?: { physique?: number; mental?: number };
		fatigue?: { rounds?: number; heures?: number };
		etats?: { nom: string; versant: "physique" | "mental" | "general"; localisation?: string; duree?: string; notes?: string }[];
	};
	identite?: Identity;
	caracteristiques: Characteristics;
	sante: Health;
	protections: Protections;
	formations?: Formation[];
	equipement?: Equipment;
	parametresDuJeu?: GameParameters;
	meta?: AdrenalineMeta;
}

export function parseAdrenalinePj(source: string): AdrenalinePjData | null {
	return parsePjDocument(source);
}
