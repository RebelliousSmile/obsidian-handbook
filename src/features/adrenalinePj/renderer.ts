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
import { AdrenalinePjData } from "./parser";
import { adrenalinePjShape } from "./shape";

function section(doc: Document, zone: BlockZone): HTMLElement {
	return adrenalineSection(doc, zone.heading ?? "", "brumes-adrenaline-pj--panel");
}

function addLines(parent: HTMLElement, doc: Document, lines: string[]): void {
	for (const line of lines) {
		const span = doc.createElement("span");
		span.textContent = line;
		parent.appendChild(span);
	}
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

function characteristicSuffix(caracteristique: CharacteristicKey | undefined): string {
	return caracteristique ? ` + ${caracteristique.toUpperCase()}` : "";
}

export function renderAdrenalinePj(data: AdrenalinePjData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add(adrenalinePjShape.root);
	const formations = data.formations ?? [];
	const competences = formations.reduce(
		(all, formation) => all.concat(formation.competences ?? []),
		[] as NonNullable<(typeof formations)[number]["competences"]>,
	);

	renderZones(root, adrenalinePjShape, {
		header: () => {
			const header = doc.createElement("header");
			const title = doc.createElement("h3");
			title.textContent = data.nom;
			header.appendChild(title);
			const details: string[] = [];
			if (data.identite?.nationalite) details.push(data.identite.nationalite);
			if (data.identite?.genre) details.push(data.identite.genre);
			if (data.identite?.age !== undefined) details.push(`${data.identite.age} ans`);
			for (const key of ["cheveux", "yeux", "taille", "peau", "poids"] as const) {
				if (data.identite?.[key]) details.push(data.identite[key] ?? "");
			}
			if (data.identite?.signesParticuliers) details.push(...data.identite.signesParticuliers);
			if (data.parametresDuJeu?.joueur) details.push(`Joueur : ${data.parametresDuJeu.joueur}`);
			if (data.parametresDuJeu?.typeDeCreation) details.push(data.parametresDuJeu.typeDeCreation);
			if (data.parametresDuJeu?.typeDeScenario) details.push(data.parametresDuJeu.typeDeScenario);
			if (data.parametresDuJeu?.declinaisonDeCampagne) details.push(data.parametresDuJeu.declinaisonDeCampagne);
			if (data.parametresDuJeu?.px !== undefined) details.push(`${data.parametresDuJeu.px} PX`);
			addLines(header, doc, details);
			return header;
		},
		characteristics: (zone) => {
			const element = section(doc, zone);
			element.appendChild(renderCharacteristics(doc, data.caracteristiques));
			return element;
		},
		health: (zone) => {
			const element = section(doc, zone);
			element.appendChild(renderHealth(doc, data.sante));
			const protectionLines: string[] = [];
			if (data.protections.physiques?.solidite !== undefined) protectionLines.push(`Solidité physique : ${data.protections.physiques.solidite}`);
			if (data.protections.mentales?.solidite !== undefined) protectionLines.push(`Solidité mentale : ${data.protections.mentales.solidite}`);
			const armour = data.protections.physiques?.armure;
			if (armour) protectionLines.push(`Armure : ${armour.nom ?? ""} · ${armour.points} PP · ${armour.localisations.join(", ")}`);
			const character = data.protections.mentales?.caractere;
			if (character) protectionLines.push(`Caractère : ${character.trait} · ${character.points} PM · ${character.localisations.join(", ")}`);
			if (protectionLines.length > 0) {
				element.appendChild(renderRows(doc, protectionLines, "brumes-adrenaline-pj--protection-rows"));
			}
			return element;
		},
		formations: (zone) => {
			if (formations.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(renderEntryList(doc, formations.map((formation) => ({
				title: `${formation.nom} · ${formation.type}`,
				value: `${formation.pourcentage} %`,
			})), "brumes-adrenaline-pj--formation-list"));
			return element;
		},
		competences: (zone) => {
			if (competences.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(renderEntryList(doc, competences.map((competence) => {
				const total = displayedCompetenceTotal(competence, data.caracteristiques);
				const subLines: string[] = [];
				if (total !== undefined) subLines.push(`${competence.pourcentage} %${characteristicSuffix(competence.caracteristique)}`);
				if (competence.avantages?.length) subLines.push(`Avantage : ${competence.avantages.join(", ")}`);
				if (competence.notes) subLines.push(competence.notes);
				return {
					title: `${competence.nom}${competence.specialite ? ` (${competence.specialite})` : ""}`,
					value: `${total ?? competence.pourcentage} %`,
					subLines,
				};
			}), "brumes-adrenaline-pj--competence-list"));
			return element;
		},
		equipment: (zone) => {
			if (!data.equipement) return null;
			const possessions = possessionLines(data.equipement);
			const weapons = weaponEntries(data.equipement);
			if (possessions.length === 0 && weapons.length === 0) return null;
			const element = section(doc, zone);
			if (possessions.length > 0) {
				element.appendChild(adrenalineList(doc, possessions, "brumes-adrenaline-pj--equipment-list"));
			}
			if (weapons.length > 0) {
				element.appendChild(renderEntryList(doc, weapons, "brumes-adrenaline-pj--weapon-list"));
			}
			return element;
		},
	});
	return root;
}
