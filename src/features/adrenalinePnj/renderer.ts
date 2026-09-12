import {
	adrenalineList,
	adrenalineSection,
	renderCharacteristics,
	renderHealth,
} from "../adrenaline/view";
import { displayedCompetenceTotal } from "../adrenaline/document";
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
	for (const key of ["attitude", "historique", "evolutionPossible"] as const) {
		if (narrative[key]) lines.push(narrative[key] ?? "");
	}
	for (const key of ["personnalite", "interpretation", "repliques", "notesMj"] as const) {
		if (narrative[key]) lines.push(...(narrative[key] ?? []));
	}
	return lines;
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
			const values: string[] = [];
			if (data.protections?.physiques?.solidite !== undefined) values.push(`Solidité physique : ${data.protections.physiques.solidite}`);
			if (data.protections?.mentales?.solidite !== undefined) values.push(`Solidité mentale : ${data.protections.mentales.solidite}`);
			if (values.length > 0) element.appendChild(adrenalineList(doc, values, "brumes-adrenaline-pnj--protection-list"));
			return element;
		},
		competences: (zone) => {
			if (formations.length === 0 && competences.length === 0) return null;
			const element = section(doc, zone);
			const values = formations.map((item) => `${item.nom} · ${item.pourcentage} %`);
			for (const item of competences) {
				const total = displayedCompetenceTotal(item, data.caracteristiques);
				values.push(`${item.nom}${item.specialite ? ` (${item.specialite})` : ""} · ${total ?? item.pourcentage} %`);
			}
			element.appendChild(adrenalineList(doc, values, "brumes-adrenaline-pnj--competence-list"));
			return element;
		},
		equipment: (zone) => {
			if (!data.equipement) return null;
			const values = [...(data.equipement.possessions ?? [])];
			if (data.equipement.equipementFavori) values.push(`Favori : ${data.equipement.equipementFavori}`);
			for (const weapon of [...(data.equipement.armesPhysiques ?? []), ...(data.equipement.armesMentales ?? [])]) values.push(weapon.nom);
			if (values.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(adrenalineList(doc, values, "brumes-adrenaline-pnj--equipment-list"));
			return element;
		},
	});
	return root;
}
