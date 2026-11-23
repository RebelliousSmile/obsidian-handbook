import {
	AdrenalineDocument,
	adrenalineSourceDocument,
	asRecord,
	parseAdrenalineDocument,
	readAdrenalineMeta,
	rememberAdrenalineSource,
	stringifyAdrenalineDocument,
	warnUnknownKeys,
} from "../adrenaline/document";
import { contractRefusal } from "../adrenaline/publishedContract";
import {
	AdrenalineRelationsData,
	RelationAttitude,
	RelationGender,
	RelationLinkType,
	RelationNpc,
	RelationOtherCharacter,
} from "./parser";

const ATTITUDES: readonly string[] = ["hostile", "inamicale", "indifferente", "amicale", "loyale"];
const LINK_TYPES: readonly string[] = ["familial", "amitie", "travail"];
const GENDERS: readonly string[] = ["masculin", "feminin", "neutre"];

/** A text as the player entered it: the contract bounds it, this file does not trim or cut it. */
function entered(value: unknown): string | undefined {
	return typeof value === "string" && value !== "" ? value : undefined;
}

function readOtherCharacter(value: unknown): RelationOtherCharacter | undefined {
	const record = asRecord(value);
	const nom = entered(record?.nom);
	if (!record || !nom) return undefined;
	warnUnknownKeys(record, ["nom", "genre", "ceQueJeSais", "ceQueJeLuiDois", "ceQuOnMeDoit"], "relations.autresPersonnages");
	const result: RelationOtherCharacter = { nom };
	const known = entered(record.ceQueJeSais);
	const owed = entered(record.ceQueJeLuiDois);
	const owing = entered(record.ceQuOnMeDoit);
	if (typeof record.genre === "string" && GENDERS.indexOf(record.genre) >= 0) result.genre = record.genre as RelationGender;
	if (known) result.ceQueJeSais = known;
	if (owed) result.ceQueJeLuiDois = owed;
	if (owing) result.ceQuOnMeDoit = owing;
	return result;
}

function readNpc(value: unknown): RelationNpc | undefined {
	const record = asRecord(value);
	const nom = entered(record?.nom);
	if (!record || !nom || typeof record.numero !== "number") return undefined;
	warnUnknownKeys(record, ["numero", "nom", "attitude", "lien", "reliesA", "resume", "notes", "toucheParLeDrame"], "relations.pnjs");
	const result: RelationNpc = { numero: record.numero, nom };
	if (typeof record.attitude === "string" && ATTITUDES.indexOf(record.attitude) >= 0) result.attitude = record.attitude as RelationAttitude;
	const link = asRecord(record.lien);
	if (link && typeof link.type === "string" && LINK_TYPES.indexOf(link.type) >= 0) {
		result.lien = { type: link.type as RelationLinkType };
		const description = entered(link.description);
		if (description) result.lien.description = description;
	}
	if (Array.isArray(record.reliesA)) result.reliesA = record.reliesA.filter((item): item is number => typeof item === "number");
	const happened = entered(record.resume);
	const notes = entered(record.notes);
	if (happened) result.resume = happened;
	if (notes) result.notes = notes;
	if (typeof record.toucheParLeDrame === "boolean") result.toucheParLeDrame = record.toucheParLeDrame;
	return result;
}

export function documentToRelations(value: unknown): AdrenalineRelationsData | null {
	const document = asRecord(value);
	if (!document) return null;
	if (contractRefusal("relations", document)) return null;
	warnUnknownKeys(document, ["personnage", "joueur", "partie", "nombreDAutresPersonnages", "autresPersonnages", "pnjs", "meta"], "relations");
	const personnage = entered(document.personnage);
	if (!personnage) return null;
	const data: AdrenalineRelationsData = { personnage };
	const joueur = entered(document.joueur);
	const partie = entered(document.partie);
	if (joueur) data.joueur = joueur;
	if (partie) data.partie = partie;
	if (typeof document.nombreDAutresPersonnages === "number") data.nombreDAutresPersonnages = document.nombreDAutresPersonnages;
	if (Array.isArray(document.autresPersonnages)) {
		data.autresPersonnages = document.autresPersonnages.reduce<RelationOtherCharacter[]>((all, item) => {
			const other = readOtherCharacter(item);
			return other ? all.concat(other) : all;
		}, []);
	}
	if (Array.isArray(document.pnjs)) {
		data.pnjs = document.pnjs.reduce<RelationNpc[]>((all, item) => {
			const npc = readNpc(item);
			return npc ? all.concat(npc) : all;
		}, []);
	}
	const meta = readAdrenalineMeta(document.meta);
	if (meta) data.meta = meta;
	return rememberAdrenalineSource(data, document);
}

export function parseRelationsDocument(source: string): AdrenalineRelationsData | null {
	const document = parseAdrenalineDocument(source);
	return document ? documentToRelations(document) : null;
}

export function relationsToDocument(data: AdrenalineRelationsData): AdrenalineDocument {
	const source = adrenalineSourceDocument(data);
	if (source) return source;
	const document: AdrenalineDocument = { personnage: data.personnage };
	if (data.joueur) document.joueur = data.joueur;
	if (data.partie) document.partie = data.partie;
	if (data.nombreDAutresPersonnages !== undefined) document.nombreDAutresPersonnages = data.nombreDAutresPersonnages;
	if (data.autresPersonnages) document.autresPersonnages = data.autresPersonnages;
	if (data.pnjs) document.pnjs = data.pnjs;
	if (data.meta) document.meta = data.meta;
	return document;
}

export function relationsToToml(data: AdrenalineRelationsData): string {
	return stringifyAdrenalineDocument(relationsToDocument(data));
}
