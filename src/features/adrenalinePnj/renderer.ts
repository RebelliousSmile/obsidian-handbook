import { PNJ_PRESENTATION } from "schema-adrenaline/presentation";
import { displayedCompetenceTotal, type EquipmentWeapon } from "../adrenaline/document";
import { inkValue, labelledValue, renderPresentation } from "../adrenaline/presentation";
import { adrenalineList, renderCharacteristics, renderEntryList, renderHealth } from "../adrenaline/view";
import { AdrenalinePnjData } from "./parser";
import { adrenalinePnjShape } from "./shape";

function group(doc: Document, title?: string): HTMLElement {
	const element = doc.createElement("div");
	if (title) {
		const heading = doc.createElement("h5");
		heading.textContent = title;
		element.appendChild(heading);
	}
	return element;
}

function narrative(data: AdrenalinePnjData): string[] {
	const n = data.narratif;
	if (!n) return [];
	const lines: string[] = [];
	for (const [label, value] of [
		["Attitude", n.attitude], ["Historique", n.historique],
		["Évolution possible", n.evolutionPossible],
	] as const) if (value) lines.push(`${label} : ${value}`);
	for (const [label, values] of [
		["Personnalité", n.personnalite], ["Interprétation", n.interpretation],
		["Réplique", n.repliques], ["Note MJ", n.notesMj],
	] as const) for (const value of values ?? []) lines.push(`${label} : ${value}`);
	return lines;
}

function weapon(weapon: EquipmentWeapon): string {
	return `${weapon.nom}${weapon.type ? ` (${weapon.type})` : ""}${weapon.desDeDegats === undefined ? "" : ` · ${weapon.desDeDegats} d10`}`;
}

export function renderAdrenalinePnj(data: AdrenalinePnjData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add(adrenalinePnjShape.root);
	renderPresentation(root, doc, PNJ_PRESENTATION, adrenalinePnjShape, (block) => {
		switch (block.id) {
			case "identification": {
				const element = group(doc);
				const title = doc.createElement("h3");
				title.textContent = data.nom;
				element.appendChild(title);
				if (data.narratif?.role) element.appendChild(inkValue(doc, data.narratif.role));
				if (data.niveauDeDanger !== undefined) element.appendChild(inkValue(doc, `ND ${data.niveauDeDanger}`));
				return element;
			}
			case "description": {
				const lines = narrative(data);
				if (!data.description && !lines.length) return null;
				const element = group(doc);
				if (data.description) {
					const p = doc.createElement("p");
					p.classList.add("brumes-adrenaline-pnj--description");
					p.textContent = data.description;
					element.appendChild(p);
				}
				if (lines.length) element.appendChild(adrenalineList(doc, lines, "brumes-adrenaline-pnj--narrative-list"));
				return element;
			}
			case "caracteristiques": return data.caracteristiques ? renderCharacteristics(doc, data.caracteristiques) : null;
			case "sante": return data.sante ? renderHealth(doc, data.sante) : null;
			case "protections": {
				if (!data.protections) return null;
				const element = group(doc);
				for (const [label, side] of [["Physique", data.protections.physiques], ["Mental", data.protections.mentales]] as const) {
					if (side?.solidite !== undefined) element.appendChild(labelledValue(doc, `Solidité ${label.toLowerCase()}`, String(side.solidite)));
					if (side?.armure) element.appendChild(labelledValue(doc, "Armure", `${side.armure.nom ?? ""} · ${side.armure.points} PP · ${side.armure.localisations.join(", ")}`));
					if (side?.caractere) element.appendChild(labelledValue(doc, "Caractère", `${side.caractere.trait} · ${side.caractere.points} PM · ${side.caractere.localisations.join(", ")}`));
				}
				return element;
			}
			case "etat-partie": return null;
			case "formations": return data.formations?.length ? renderEntryList(doc, data.formations.map((item) => ({ title: `${item.nom} · ${item.type}`, value: `${item.pourcentage} %` })), "brumes-adrenaline-pnj--formation-list") : null;
			case "competences": return data.competences?.length ? renderEntryList(doc, data.competences.map((item) => ({ title: `${item.nom}${item.specialite ? ` (${item.specialite})` : ""}`, value: `${displayedCompetenceTotal(item, data.caracteristiques) ?? item.pourcentage} %`, subLines: item.avantages?.map((text) => `Avantage : ${text}`) })), "brumes-adrenaline-pnj--competence-list") : null;
			case "equipement": {
				if (!data.equipement) return null;
				const lines = [...(data.equipement.possessions ?? [])];
				if (data.equipement.equipementFavori) lines.push(`Équipement favori : ${data.equipement.equipementFavori}`);
				for (const entry of [...(data.equipement.armesPhysiques ?? []), ...(data.equipement.armesMentales ?? [])]) lines.push(weapon(entry));
				return lines.length ? adrenalineList(doc, lines, "brumes-adrenaline-pnj--equipment-list") : null;
			}
			default: return null;
		}
	});
	return root;
}
