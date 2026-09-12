import {
	AdrenalineEntry,
	adrenalineList,
	adrenalineSection,
	renderCharacteristics,
	renderEntryList,
	renderHealth,
	renderRows,
} from "../adrenaline/view";
import { CharacteristicKey, displayedCompetenceTotal, Equipment, EquipmentWeapon } from "../adrenaline/document";
import { BlockZone, renderZones } from "../blocks/shape";
import { AdrenalinePnjData } from "./parser";
import { adrenalinePnjShape } from "./shape";

function section(doc: Document, zone: BlockZone): HTMLElement {
	return adrenalineSection(doc, zone.heading ?? "", "brumes-adrenaline-pnj--panel");
}

function narrativeLines(data: AdrenalinePnjData): string[] {
	const lines: string[] = [];
	const narrative = data.narratif;
	if (!narrative) return lines;
	if (narrative.attitude) lines.push(`Attitude : ${narrative.attitude}`);
	if (narrative.historique) lines.push(`Historique : ${narrative.historique}`);
	if (narrative.evolutionPossible) lines.push(`Évolution possible : ${narrative.evolutionPossible}`);
	if (narrative.personnalite?.length) lines.push(`Personnalité : ${narrative.personnalite.join(", ")}`);
	if (narrative.interpretation?.length) lines.push(`Interprétation : ${narrative.interpretation.join(", ")}`);
	for (const line of narrative.repliques ?? []) lines.push(`Réplique : « ${line} »`);
	for (const line of narrative.notesMj ?? []) lines.push(`Note MJ : ${line}`);
	return lines;
}

function characteristicSuffix(caracteristique: CharacteristicKey | undefined): string {
	return caracteristique ? ` + ${caracteristique.toUpperCase()}` : "";
}

function weaponEntry(weapon: EquipmentWeapon): AdrenalineEntry {
	const subLines: string[] = [];
	if (weapon.desDeDegats !== undefined) subLines.push(`Dégâts : ${weapon.desDeDegats} d10`);
	if (weapon.notes) subLines.push(weapon.notes);
	return {
		title: `${weapon.nom}${weapon.type ? ` (${weapon.type})` : ""}`,
		value: weapon.pourcentage === undefined ? undefined : `${weapon.pourcentage} %`,
		subLines,
	};
}

function possessionLines(equipment: Equipment): string[] {
	const lines = [...(equipment.possessions ?? [])];
	if (equipment.equipementFavori) lines.push(`Favori : ${equipment.equipementFavori}`);
	return lines;
}

function weaponEntries(equipment: Equipment): AdrenalineEntry[] {
	return [...(equipment.armesPhysiques ?? []), ...(equipment.armesMentales ?? [])].map(weaponEntry);
}

export function renderAdrenalinePnj(data: AdrenalinePnjData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add(adrenalinePnjShape.root);
	const competences = data.competences ?? [];
	const formations = data.formations ?? [];
	renderZones(root, adrenalinePnjShape, {
		header: () => {
			const header = doc.createElement("header");
			const title = doc.createElement("h3");
			title.textContent = data.nom;
			header.appendChild(title);
			if (data.narratif?.role) {
				const role = doc.createElement("span");
				role.textContent = data.narratif.role;
				header.appendChild(role);
			}
			if (data.niveauDeDanger !== undefined) {
				const danger = doc.createElement("strong");
				danger.textContent = `ND ${data.niveauDeDanger}`;
				header.appendChild(danger);
			}
			return header;
		},
		narrative: (zone) => {
			const lines = narrativeLines(data);
			if (!data.description && lines.length === 0) return null;
			const element = section(doc, zone);
			if (data.description) {
				const description = doc.createElement("p");
				description.classList.add("brumes-adrenaline-pnj--description");
				description.textContent = data.description;
				element.appendChild(description);
			}
			if (lines.length > 0) {
				element.appendChild(adrenalineList(doc, lines, "brumes-adrenaline-pnj--narrative-list"));
			}
			return element;
		},
		characteristics: (zone) => {
			if (!data.caracteristiques) return null;
			const element = section(doc, zone);
			element.appendChild(renderCharacteristics(doc, data.caracteristiques));
			return element;
		},
		health: (zone) => {
			if (!data.sante && !data.protections) return null;
			const element = section(doc, zone);
			if (data.sante) element.appendChild(renderHealth(doc, data.sante));
			const protectionLines: string[] = [];
			if (data.protections?.physiques?.solidite !== undefined) protectionLines.push(`Solidité physique : ${data.protections.physiques.solidite}`);
			if (data.protections?.mentales?.solidite !== undefined) protectionLines.push(`Solidité mentale : ${data.protections.mentales.solidite}`);
			const armour = data.protections?.physiques?.armure;
			if (armour) protectionLines.push(`Armure : ${armour.nom ?? ""} · ${armour.points} PP · ${armour.localisations.join(", ")}`);
			const character = data.protections?.mentales?.caractere;
			if (character) protectionLines.push(`Caractère : ${character.trait} · ${character.points} PM · ${character.localisations.join(", ")}`);
			if (protectionLines.length > 0) {
				element.appendChild(renderRows(doc, protectionLines, "brumes-adrenaline-pnj--protection-rows"));
			}
			return element;
		},
		competences: (zone) => {
			if (formations.length === 0 && competences.length === 0) return null;
			const element = section(doc, zone);
			if (formations.length > 0) {
				element.appendChild(renderEntryList(doc, formations.map((item) => ({
					title: item.nom,
					value: `${item.pourcentage} %`,
				})), "brumes-adrenaline-pnj--formation-list"));
			}
			if (competences.length > 0) {
				element.appendChild(renderEntryList(doc, competences.map((item) => {
					const total = displayedCompetenceTotal(item, data.caracteristiques);
					const subLines: string[] = [];
					if (total !== undefined) subLines.push(`${item.pourcentage} %${characteristicSuffix(item.caracteristique)}`);
					if (item.avantages?.length) subLines.push(`Avantage : ${item.avantages.join(", ")}`);
					if (item.notes) subLines.push(item.notes);
					return {
						title: `${item.nom}${item.specialite ? ` (${item.specialite})` : ""}`,
						value: `${total ?? item.pourcentage} %`,
						subLines,
					};
				}), "brumes-adrenaline-pnj--competence-list"));
			}
			return element;
		},
		equipment: (zone) => {
			if (!data.equipement) return null;
			const possessions = possessionLines(data.equipement);
			const weapons = weaponEntries(data.equipement);
			if (possessions.length === 0 && weapons.length === 0) return null;
			const element = section(doc, zone);
			if (possessions.length > 0) {
				element.appendChild(adrenalineList(doc, possessions, "brumes-adrenaline-pnj--equipment-list"));
			}
			if (weapons.length > 0) {
				element.appendChild(renderEntryList(doc, weapons, "brumes-adrenaline-pnj--weapon-list"));
			}
			return element;
		},
	});
	return root;
}
