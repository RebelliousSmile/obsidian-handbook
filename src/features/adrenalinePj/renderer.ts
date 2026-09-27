import { PJ_PRESENTATION, type AdrenalinePresentationBlock } from "schema-adrenaline/presentation";
import { adrenalineSourceDocument, asRecord, displayedCompetenceTotal, readCurrentValue, type AdrenalineDocument, type EquipmentWeapon } from "../adrenaline/document";
import { renderZones } from "../blocks/shape";
import { AdrenalinePjData } from "./parser";
import { pjToDocument } from "./schema";
import { adrenalinePjShape } from "./shape";

const ROOT = "brumes-adrenaline-pj";

function node(doc: Document, tag: string, className: string, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	result.classList.add(`${ROOT}__${className}`);
	if (text !== undefined) result.textContent = text;
	return result;
}

function row(doc: Document, parent: HTMLElement, label: string, value?: string | number, suffix = ""): void {
	const item = node(doc, "div", "line");
	item.appendChild(node(doc, "span", "line-label", label));
	item.appendChild(node(doc, "span", "value", value === undefined ? "" : `${value}${suffix}`));
	parent.appendChild(item);
}

function at(source: AdrenalineDocument, pointer: string): unknown {
	return pointer.slice(1).split("/").reduce<unknown>((value, key) => asRecord(value)?.[key], source);
}

function number(value: unknown): number | undefined {
	return readCurrentValue(value);
}

function scalar(value: unknown): string | number | undefined {
	return typeof value === "string" ? value : number(value);
}

function rangePart(value: unknown, part: "minimum" | "current"): number | undefined {
	const record = asRecord(value);
	return number(record?.[part] ?? (part === "current" ? value : undefined));
}

function weapons(doc: Document, parent: HTMLElement, values: EquipmentWeapon[]): void {
	for (const weapon of values) {
		row(doc, parent, `${weapon.nom}${weapon.type ? ` (${weapon.type})` : ""}`, weapon.pourcentage, " %");
		if (weapon.desDeDegats !== undefined) row(doc, parent, "Dégâts", `${weapon.desDeDegats} d10`);
		if (weapon.notes) parent.appendChild(node(doc, "p", "note", weapon.notes));
	}
}

function renderBlock(doc: Document, block: AdrenalinePresentationBlock, data: AdrenalinePjData, source: AdrenalineDocument): HTMLElement {
	const box = node(doc, "div", block.id);
	box.classList.add(`${ROOT}__block`);
	if (block.placement) {
		box.classList.add(`${ROOT}__col-${block.placement.column}`, `${ROOT}__row-${block.placement.row}`);
		if (block.placement.rowSpan) box.classList.add(`${ROOT}__row-span-${block.placement.rowSpan}`);
	}
	if (!["nom", "parametres-jeu", "px"].includes(block.id)) box.appendChild(node(doc, "h5", "block-title", block.label));
	switch (block.id) {
		case "nom":
			box.appendChild(node(doc, "strong", "name", data.nom));
			break;
		case "parametres-jeu":
			for (const [label, value] of [["Joueur", data.parametresDuJeu?.joueur], ["Création", data.parametresDuJeu?.typeDeCreation], ["Scénario", data.parametresDuJeu?.typeDeScenario], ["Campagne", data.parametresDuJeu?.declinaisonDeCampagne]] as const) row(doc, box, label, value);
			break;
		case "px":
			row(doc, box, block.label, data.parametresDuJeu?.px);
			break;
		case "formations-competences": {
			const grid = node(doc, "div", "formations-grid");
			for (const formation of data.formations ?? []) {
				const card = node(doc, "div", "formation-card");
				row(doc, card, `${formation.type} · ${formation.nom}`, formation.pourcentage, " %");
				for (const competence of formation.competences ?? []) {
					row(doc, card, `${competence.nom}${competence.specialite ? ` (${competence.specialite})` : ""}`, displayedCompetenceTotal(competence, data.caracteristiques) ?? competence.pourcentage, " %");
					if (competence.avantages?.length) card.appendChild(node(doc, "p", "note", `Avantage : ${competence.avantages.join(", ")}`));
					if (competence.notes) card.appendChild(node(doc, "p", "note", competence.notes));
				}
				grid.appendChild(card);
			}
			box.appendChild(grid);
			break;
		}
		case "identite": {
			const identity = data.identite;
			for (const [label, value] of [["Nationalité", identity?.nationalite], ["Genre", identity?.genre], ["Cheveux", identity?.cheveux], ["Âge", identity?.age], ["Yeux", identity?.yeux], ["Taille", identity?.taille], ["Peau", identity?.peau], ["Poids", identity?.poids]] as const) row(doc, box, label, value);
			for (const sign of identity?.signesParticuliers ?? []) box.appendChild(node(doc, "div", "ruled-line", sign));
			break;
		}
		case "caracteristiques-physiques":
		case "caracteristiques-mentales":
			block.paths.forEach((pointer, index) => {
				const item = node(doc, "div", "characteristic");
				item.appendChild(node(doc, "span", "line-label", block.rowLabels?.[index] ?? pointer.split("/").pop() ?? ""));
				for (const part of block.rangeDisplay ?? ["current"]) {
					const value = rangePart(at(source, pointer), part);
					item.appendChild(node(doc, "span", "value", value === undefined ? "" : `${value} %`));
				}
				box.appendChild(item);
			});
			break;
		case "possessions":
			for (const possession of data.equipement?.possessions ?? []) box.appendChild(node(doc, "div", "ruled-line", possession));
			row(doc, box, "Équipement favori", data.equipement?.equipementFavori);
			break;
		case "armes-physiques":
			weapons(doc, box, data.equipement?.armesPhysiques ?? []);
			break;
		case "armes-mentales":
			weapons(doc, box, data.equipement?.armesMentales ?? []);
			break;
		case "protections-physiques": {
			const value = data.protections.physiques;
			row(doc, box, "Solidité physique", value?.solidite);
			if (value?.armure) row(doc, box, `Armure : ${value.armure.nom ?? ""} · ${value.armure.localisations.join(", ")}`, value.armure.points, " PP");
			if (value?.bouclier) row(doc, box, "Bouclier", value.bouclier.nom);
			break;
		}
		case "protections-mentales": {
			const value = data.protections.mentales;
			row(doc, box, "Solidité mentale", value?.solidite);
			if (value?.caractere) row(doc, box, `Caractère : ${value.caractere.trait} · ${value.caractere.localisations.join(", ")}`, value.caractere.points, " PM");
			if (value?.bouclier) row(doc, box, "Bouclier", value.bouclier.nom);
			break;
		}
		case "stress": {
			const value = asRecord(at(source, block.paths[0]));
			row(doc, box, "Adrénaline", scalar(value?.adrenaline));
			row(doc, box, "Panique", scalar(value?.panique));
			if (block.decoration?.kind === "dice-options") box.appendChild(node(doc, "div", "dice-options", [...block.decoration.favorable, ...block.decoration.defavorable].join(" · ")));
			break;
		}
		case "seuils-physiques":
		case "seuils-mentaux": {
			const side = asRecord(at(source, block.paths[0]));
			for (const key of ["superficiel", "leger", "grave", "profond"]) {
				const threshold = asRecord(side?.[key]);
				const base = scalar(threshold?.base);
				const covered = scalar(threshold?.couvert);
				row(doc, box, key, covered === undefined ? base : `${base ?? ""} / ${covered}`);
			}
			break;
		}
		case "malus": {
			const malus = asRecord(at(source, block.paths[0])) ?? {};
			for (const key of Object.keys(malus)) row(doc, box, key, scalar(malus[key]));
			break;
		}
		case "etats-encaisses": {
			const states = at(source, block.paths[0]);
			for (const state of Array.isArray(states) ? states : []) {
				const value = asRecord(state);
				if (!value) continue;
				row(doc, box, typeof value.nom === "string" ? value.nom : "État", [value.versant, value.localisation, value.duree].filter((part): part is string => typeof part === "string").join(" · "));
			}
			break;
		}
		case "fatigue": {
			const value = asRecord(at(source, block.paths[0]));
			if (block.decoration?.kind === "circle-groups") for (const group of block.decoration.groups) {
				const filled = Math.min(group.count, Math.max(0, Number(scalar(value?.[group.label])) || 0));
				row(doc, box, group.label, `${"●".repeat(filled)}${"○".repeat(group.count - filled)}`);
			}
			break;
		}
	}
	return box;
}

export function renderAdrenalinePj(data: AdrenalinePjData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add(adrenalinePjShape.root);
	const source = adrenalineSourceDocument(data) ?? pjToDocument(data);
	const builders: Record<string, () => HTMLElement> = {};
	for (const section of PJ_PRESENTATION.sections) builders[section.id] = () => {
		const container = node(doc, "section", "section");
		if (!("showTitle" in section && section.showTitle === false)) container.appendChild(node(doc, "h4", "section-title", section.label));
		const body = node(doc, "div", "section-body");
		body.classList.add(`${ROOT}__columns-${section.columns ?? 1}`);
		for (const block of [...section.blocks].sort((a, b) => a.order - b.order)) body.appendChild(renderBlock(doc, block, data, source));
		container.appendChild(body);
		return container;
	};
	renderZones(root, adrenalinePjShape, builders);
	return root;
}
