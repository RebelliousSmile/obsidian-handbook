import {
	adrenalineList,
	adrenalineSection,
	renderCharacteristics,
	renderHealth,
	renderProvenance,
} from "../adrenaline/view";
import { displayedCompetenceTotal, Equipment } from "../adrenaline/document";
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

function equipmentLines(equipment: Equipment): string[] {
	const lines = [...(equipment.possessions ?? [])];
	if (equipment.equipementFavori) lines.push(`Favori : ${equipment.equipementFavori}`);
	for (const weapon of [...(equipment.armesPhysiques ?? []), ...(equipment.armesMentales ?? [])]) {
		lines.push(`${weapon.nom}${weapon.type ? ` (${weapon.type})` : ""}${weapon.pourcentage === undefined ? "" : ` · ${weapon.pourcentage} %`}${weapon.desDeDegats === undefined ? "" : ` · ${weapon.desDeDegats} d10`}${weapon.notes ? ` · ${weapon.notes}` : ""}`);
	}
	return lines;
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
			addLines(element, doc, protectionLines);
			return element;
		},
		formations: (zone) => {
			if (formations.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(adrenalineList(doc, formations.map((formation) => `${formation.nom} · ${formation.type} · ${formation.pourcentage} %`), "brumes-adrenaline-pj--formation-list"));
			return element;
		},
		competences: (zone) => {
			if (competences.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(adrenalineList(doc, competences.map((competence) => {
				const total = displayedCompetenceTotal(competence, data.caracteristiques);
				return `${competence.nom}${competence.specialite ? ` (${competence.specialite})` : ""} · ${total ?? competence.pourcentage} %${competence.avantages ? ` · ${competence.avantages.join(", ")}` : ""}`;
			}), "brumes-adrenaline-pj--competence-list"));
			return element;
		},
		equipment: (zone) => {
			if (!data.equipement) return null;
			const lines = equipmentLines(data.equipement);
			if (lines.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(adrenalineList(doc, lines, "brumes-adrenaline-pj--equipment-list"));
			return element;
		},
		provenance: () => data.meta ? renderProvenance(doc, data.meta) : null,
	});
	return root;
}
