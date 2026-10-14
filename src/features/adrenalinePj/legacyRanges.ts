import { publishedCharacteristicKeys, publishedEquipmentKeys } from "../adrenaline/publishedContract";

type DocumentRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is DocumentRecord =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/** The player sheet writes one number where a range was written: the current value is kept. */
const toPlain = (value: unknown): unknown =>
	isRecord(value) && typeof value.current === "number" ? value.current : value;

function clone<T>(value: T): T {
	if (Array.isArray(value)) return (value as unknown[]).map((item) => clone(item)) as unknown as T;
	if (isRecord(value)) {
		const copy: DocumentRecord = {};
		for (const key of Object.keys(value)) copy[key] = clone(value[key]);
		return copy as T;
	}
	return value;
}

function plainKeys(record: DocumentRecord, keys: readonly string[]): void {
	for (const key of keys) {
		if (key in record) record[key] = toPlain(record[key]);
	}
}

function upgradeSkills(value: unknown): void {
	if (!Array.isArray(value)) return;
	for (const skill of value) {
		if (!isRecord(skill)) continue;
		// The player sheet prints a skill's name, specialty and percentage, and nothing under it.
		for (const key of ["caracteristique", "degats", "total", "action", "avantages", "notes"]) delete skill[key];
		plainKeys(skill, ["pourcentage"]);
	}
}

function upgradeEquipment(value: unknown): void {
	if (!isRecord(value)) return;
	for (const key of publishedEquipmentKeys("pj").filter((name) => name.indexOf("armes") === 0)) {
		const weapons = value[key];
		if (!Array.isArray(weapons)) continue;
		for (const weapon of weapons) {
			if (!isRecord(weapon)) continue;
			// The player sheet's weapon line has a damage nature, no type and no note.
			delete weapon.type;
			delete weapon.notes;
			plainKeys(weapon, ["pourcentage"]);
		}
	}
}

/**
 * A player-sheet document written before contract 5.0.0 carries ranges (`minimum`, `current`,
 * `maximum`) and keys the sheet no longer prints. The contract now types one number for a
 * characteristic, a threshold, a protection and a percentage: the current value is kept and the
 * extras are removed, so that a note written earlier is still drawn. The experience points keep
 * their range. What the published schema still refuses after this is reported by it.
 */
export function upgradeLegacyPj(value: DocumentRecord): DocumentRecord {
	const document = clone(value);

	if (isRecord(document.caracteristiques)) {
		plainKeys(document.caracteristiques, publishedCharacteristicKeys("pj"));
	}

	if (isRecord(document.sante)) {
		for (const kind of ["physique", "mental"]) {
			const health = document.sante[kind];
			if (!isRecord(health)) continue;
			for (const level of ["superficiel", "leger", "grave", "profond"]) {
				const threshold = health[level];
				if (isRecord(threshold)) plainKeys(threshold, ["base", "couvert"]);
			}
		}
	}

	if (isRecord(document.protections)) {
		for (const kind of ["physiques", "mentales"]) {
			const protection = document.protections[kind];
			if (!isRecord(protection)) continue;
			// No solidity and no shield on the player sheet; armour and trait are one line.
			delete protection.solidite;
			delete protection.bouclier;
			for (const item of ["armure", "caractere"]) {
				const entry = protection[item];
				if (!isRecord(entry)) continue;
				for (const key of ["des", "couverture", "emotions", "proprietes", "reduction"]) delete entry[key];
				plainKeys(entry, ["points"]);
			}
		}
	}

	if (Array.isArray(document.formations)) {
		for (const formation of document.formations) {
			if (!isRecord(formation)) continue;
			plainKeys(formation, ["pourcentage"]);
			upgradeSkills(formation.competences);
		}
	}
	upgradeEquipment(document.equipement);

	const state = document.etatDePartie;
	if (isRecord(state) && Array.isArray(state.etats)) {
		// The « États » zone is one free text, a line per state.
		const lines: string[] = [];
		for (const entry of state.etats) {
			if (typeof entry === "string") {
				if (entry) lines.push(entry);
			} else if (isRecord(entry) && typeof entry.nom === "string") {
				lines.push(entry.nom + (typeof entry.localisation === "string" ? ` (${entry.localisation})` : ""));
			}
		}
		if (lines.length > 0) state.etats = lines.join("\n");
		else delete state.etats;
	}
	if (isRecord(state) && isRecord(state.malus) && isRecord(state.malus.choc)) {
		// The sheet prints the five round circles only.
		delete state.malus.choc.heures;
	}

	return document;
}
