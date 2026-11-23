import { AdrenalineMeta } from "../adrenaline/document";
import { parseRelationsDocument } from "./schema";

export type RelationAttitude = "hostile" | "inamicale" | "indifferente" | "amicale" | "loyale";
export type RelationGender = "masculin" | "feminin" | "neutre";
export type RelationLinkType = "familial" | "amitie" | "travail";

export interface RelationOtherCharacter {
	nom: string;
	/** Not printed: the published label of what they owe follows it. */
	genre?: RelationGender;
	ceQueJeSais?: string;
	ceQueJeLuiDois?: string;
	ceQuOnMeDoit?: string;
}

export interface RelationNpc {
	/** The number the sheet prints for the NPC: shown as written, never renumbered here. */
	numero: number;
	nom: string;
	attitude?: RelationAttitude;
	lien?: { type: RelationLinkType; description?: string };
	/** Numbers of the other NPCs this one is tied to; one that matches no NPC is shown as it is. */
	reliesA?: number[];
	resume?: string;
	notes?: string;
	/** A drama test was made on this NPC: one or several per sheet, the tick is on each NPC. */
	toucheParLeDrame?: boolean;
}

export interface AdrenalineRelationsData {
	personnage: string;
	joueur?: string;
	partie?: string;
	/** How many places of other characters the sheet prints; absent, the default of the contract. */
	nombreDAutresPersonnages?: number;
	autresPersonnages?: RelationOtherCharacter[];
	pnjs?: RelationNpc[];
	meta?: AdrenalineMeta;
}

export function parseAdrenalineRelations(source: string): AdrenalineRelationsData | null {
	return parseRelationsDocument(source);
}
