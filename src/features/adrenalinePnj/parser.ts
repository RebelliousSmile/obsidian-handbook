import {
	AdrenalineMeta,
	Characteristics,
	Competence,
	Equipment,
	Formation,
	Health,
	Identity,
	Narrative,
	Protections,
} from "../adrenaline/document";
import { parsePnjDocument } from "./schema";

export interface AdrenalinePnjData {
	nom: string;
	niveauDeDanger?: number;
	description?: string;
	identite?: Identity;
	caracteristiques?: Characteristics;
	sante?: Health;
	protections?: Protections;
	formations?: Formation[];
	competences?: Competence[];
	equipement?: Equipment;
	narratif?: Narrative;
	meta?: AdrenalineMeta;
}

export function parseAdrenalinePnj(source: string): AdrenalinePnjData | null {
	return parsePnjDocument(source);
}
