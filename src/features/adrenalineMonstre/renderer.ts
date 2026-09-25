import { MONSTRE_PRESENTATION } from "schema-adrenaline/presentation";
import { displayedCompetenceTotal, type EquipmentWeapon } from "../adrenaline/document";
import { inkValue, labelledValue, renderPresentation } from "../adrenaline/presentation";
import { adrenalineList, renderCharacteristics, renderEntryList, renderHealth } from "../adrenaline/view";
import { AdrenalineMonsterData } from "./parser";
import { adrenalineMonsterShape } from "./shape";

function group(doc: Document, heading?: string): HTMLElement {
	const element = doc.createElement("div");
	if (heading) {
		const title = doc.createElement("h5");
		title.textContent = heading;
		element.appendChild(title);
	}
	return element;
}

function weapon(weapon: EquipmentWeapon): string {
	const suffix = [weapon.type, weapon.pourcentage === undefined ? undefined : `${weapon.pourcentage} %`, weapon.desDeDegats === undefined ? undefined : `${weapon.desDeDegats} d10`].filter(Boolean);
	return `${weapon.nom}${suffix.length ? ` · ${suffix.join(" · ")}` : ""}`;
}

function alternate(doc: Document, data: AdrenalineMonsterData): HTMLElement | null {
	const state = data.etatAlternatif;
	if (!state) return null;
	const element = group(doc, "État alternatif");
	element.appendChild(labelledValue(doc, "État", state.nom));
	for (const trigger of state.declencheurs ?? []) element.appendChild(labelledValue(doc, "Déclencheur", trigger));
	if (state.caracteristiques) element.appendChild(renderCharacteristics(doc, state.caracteristiques));
	if (state.zoneDeDetection) element.appendChild(labelledValue(doc, "Détection", state.zoneDeDetection));
	if (state.deplacement) element.appendChild(labelledValue(doc, "Déplacement", state.deplacement));
	if (state.actionsParRound !== undefined) element.appendChild(labelledValue(doc, "Actions par round", String(state.actionsParRound)));
	if (state.notes) element.appendChild(labelledValue(doc, "Notes", state.notes));
	return element;
}

function equipment(doc: Document, data: AdrenalineMonsterData): HTMLElement | null {
	const source = data.equipement;
	if (!source) return null;
	const lines = [...(source.possessions ?? [])];
	if (source.equipementFavori) lines.push(`Équipement favori : ${source.equipementFavori}`);
	for (const entry of [...(source.armesPhysiques ?? []), ...(source.armesMentales ?? [])]) lines.push(weapon(entry));
	return lines.length ? adrenalineList(doc, lines, "brumes-adrenaline-monstre--equipment-list") : null;
}

export function renderAdrenalineMonster(data: AdrenalineMonsterData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add(adrenalineMonsterShape.root);
	renderPresentation(root, doc, MONSTRE_PRESENTATION, adrenalineMonsterShape, (block) => {
		switch (block.id) {
			case "identification": {
				const element = group(doc);
				const heading = doc.createElement("h3");
				heading.textContent = data.nom;
				element.appendChild(heading);
				for (const value of [data.typeDeCorps, data.instinct, data.typeInfecte]) if (value) element.appendChild(inkValue(doc, value));
				if (data.niveauDeDanger !== undefined) element.appendChild(inkValue(doc, `ND ${data.niveauDeDanger}`));
				if (data.description) element.appendChild(labelledValue(doc, "Description", data.description));
				return element;
			}
			case "detection": return data.zoneDeDetection ? labelledValue(doc, "À vue", data.zoneDeDetection) : null;
			case "deplacement": return data.deplacement ? labelledValue(doc, "Par action", data.deplacement) : null;
			case "comportement": return data.comportement?.length ? adrenalineList(doc, data.comportement, "brumes-adrenaline-monstre--behaviour-list") : null;
			case "combat": return data.actionsParRound === undefined ? null : labelledValue(doc, "Actions par round", String(data.actionsParRound));
			case "caracteristiques": return renderCharacteristics(doc, data.caracteristiques);
			case "sante": return data.sante ? renderHealth(doc, data.sante) : null;
			case "protections": {
				if (!data.protections) return null;
				const element = group(doc);
				for (const [name, side] of [["physique", data.protections.physiques], ["mentale", data.protections.mentales]] as const) {
					if (side?.solidite !== undefined) element.appendChild(labelledValue(doc, `Solidité ${name}`, String(side.solidite)));
					if (side?.armure) element.appendChild(labelledValue(doc, "Armure", `${side.armure.nom ?? ""} · ${side.armure.points} PP`));
					if (side?.caractere) element.appendChild(labelledValue(doc, "Caractère", `${side.caractere.trait} · ${side.caractere.points} PM`));
				}
				return element;
			}
			case "traits": return data.traitsSpeciaux?.length ? adrenalineList(doc, data.traitsSpeciaux, "brumes-adrenaline-monstre--traits-list") : null;
			case "competences": return data.competences?.length ? renderEntryList(doc, data.competences.map((item) => ({ title: item.nom, value: `${displayedCompetenceTotal(item, data.caracteristiques) ?? item.pourcentage} %` })), "brumes-adrenaline-monstre--competence-list") : null;
			case "contagion": {
				const source = data.contagion;
				if (!source) return null;
				const element = group(doc);
				if (source.agent) element.appendChild(labelledValue(doc, "Agent", source.agent));
				if (source.delaiAvantEffet) element.appendChild(labelledValue(doc, "Délai", source.delaiAvantEffet));
				if (source.issue) element.appendChild(labelledValue(doc, "Issue", source.issue));
				for (const vector of source.vecteurs ?? []) element.appendChild(labelledValue(doc, vector.nom, vector.probabilite === undefined ? undefined : `${vector.probabilite} %`));
				for (const modulation of source.modulations ?? []) element.appendChild(labelledValue(doc, modulation.profil, modulation.issue));
				return element;
			}
			case "etats": return alternate(doc, data);
			case "equipement": return equipment(doc, data);
			default: return null;
		}
	});
	return root;
}
