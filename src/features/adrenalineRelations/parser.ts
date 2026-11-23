import { AdrenalineMeta } from "../adrenaline/document";
import { parseRelationsDocument } from "./schema";

export type RelationAttitude = "hostile" | "inamicale" | "indifferente" | "amicale" | "loyale";
export type RelationLinkType = "familial" | "amitie" | "travail";

export interface RelationOtherCharacter {
	nom: string;
	ceQueJeSais?: string;
	ceQueJeLuiDois?: string;
	ceQuIlMeDoit?: string;
}

export interface RelationNpc {
	/** The number the sheet prints for the NPC: shown as written, never renumbered here. */
	numero: number;
	nom: string;
	attitude?: RelationAttitude;
	lien?: { type: RelationLinkType; description?: string };
	/** Numbers of the other NPCs this one is tied to; one that matches no NPC is shown as it is. */
	reliesA?: number[];
	ceQuiLuiEstArrive?: string;
	notes?: string;
}

export interface AdrenalineRelationsData {
	personnage: string;
	joueur?: string;
	partie?: string;
	/** How many places of other characters the sheet prints; absent, the default of the contract. */
	nombreDAutresPersonnages?: number;
	autresPersonnages?: RelationOtherCharacter[];
	testsDeDrame?: number;
	pnjs?: RelationNpc[];
	meta?: AdrenalineMeta;
}

export function parseAdrenalineRelations(source: string): AdrenalineRelationsData | null {
	return parseRelationsDocument(source);
}
