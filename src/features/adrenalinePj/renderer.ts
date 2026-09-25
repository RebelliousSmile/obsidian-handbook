import { PJ_PRESENTATION, type AdrenalinePresentationBlock } from "schema-adrenaline/presentation";
import { adrenalineSourceDocument, asRecord, displayedCompetenceTotal, readCurrentValue, type CharacteristicKey, type EquipmentWeapon, type HealthSide, type ProtectionSide } from "../adrenaline/document";
import { inkValue, labelledValue, renderPresentation } from "../adrenaline/presentation";
import { AdrenalinePjData } from "./parser";
import { adrenalinePjShape } from "./shape";

function box(doc: Document, title?: string): HTMLElement {
	const element = doc.createElement("div");
	if (title) {
		const heading = doc.createElement("h5");
		heading.textContent = title;
		element.appendChild(heading);
	}
	return element;
}

function row(doc: Document, label: string, value?: string): HTMLElement {
	return labelledValue(doc, label, value);
}

function nameCard(doc: Document, data: AdrenalinePjData): HTMLElement {
	const card = box(doc, "Nom du personnage");
	card.classList.add("brumes-adrenaline-pj--name-card");
	card.appendChild(inkValue(doc, data.nom));
	return card;
}

function parameters(doc: Document, data: AdrenalinePjData): HTMLElement {
	const element = box(doc, "Paramètres du jeu");
	const game = data.parametresDuJeu;
	element.appendChild(row(doc, "Joueur", game?.joueur));
	element.appendChild(row(doc, "Création", game?.typeDeCreation));
	element.appendChild(row(doc, "Scénario", game?.typeDeScenario));
	element.appendChild(row(doc, "Campagne", game?.declinaisonDeCampagne));
	return element;
}

function pxCard(doc: Document, data: AdrenalinePjData): HTMLElement {
	const element = box(doc, "PX");
	element.appendChild(inkValue(doc, data.parametresDuJeu?.px === undefined ? "" : String(data.parametresDuJeu.px)));
	return element;
}

function formations(doc: Document, data: AdrenalinePjData, block: AdrenalinePresentationBlock): HTMLElement {
	const element = box(doc);
	element.classList.add("brumes-adrenaline-pj--formation-columns");
	for (let index = 0; index < (block.columns ?? 0); index++) {
		const formation = data.formations?.[index];
		const column = box(doc, "Formation");
		column.classList.add("brumes-adrenaline-pj--formation-column");
		column.appendChild(row(doc, "Type", formation?.type));
		column.appendChild(row(doc, "Spécialité", formation?.nom));
		column.appendChild(row(doc, "%", formation ? `${formation.pourcentage} %` : undefined));
		const subheading = doc.createElement("h6");
		subheading.textContent = "Compétences";
		column.appendChild(subheading);
		for (let skill = 0; skill < Math.max(5, formation?.competences?.length ?? 0); skill++) {
			const competence = formation?.competences?.[skill];
			const total = competence ? displayedCompetenceTotal(competence, data.caracteristiques) : undefined;
			const detail = competence?.specialite ? `${competence.nom} (${competence.specialite})` : competence?.nom ?? "";
			column.appendChild(row(doc, detail, competence ? `${total ?? competence.pourcentage} %` : undefined));
		}
		element.appendChild(column);
	}
	return element;
}

function identity(doc: Document, data: AdrenalinePjData): HTMLElement {
	const element = box(doc, "Identité");
	element.classList.add("brumes-adrenaline-pj--identity");
	const fields: [string, string | undefined][] = [
		["Nationalité", data.identite?.nationalite], ["Genre", data.identite?.genre],
		["Cheveux", data.identite?.cheveux], ["Âge", data.identite?.age === undefined ? undefined : String(data.identite.age)],
		["Yeux", data.identite?.yeux], ["Taille", data.identite?.taille],
		["Peau", data.identite?.peau], ["Poids", data.identite?.poids],
		["Signes particuliers", data.identite?.signesParticuliers?.join(", ")],
	];
	for (const [label, value] of fields) element.appendChild(row(doc, label, value));
	return element;
}

function characteristics(doc: Document, data: AdrenalinePjData, block: AdrenalinePresentationBlock): HTMLElement {
	const element = box(doc, block.label);
	element.classList.add("brumes-adrenaline-pj--characteristic-group");
	const labels = doc.createElement("div");
	labels.classList.add("brumes-adrenaline-pj--characteristic-head");
	for (const label of ["", "Création", "Actuel"]) {
		const cell = doc.createElement("span");
		cell.textContent = label;
		labels.appendChild(cell);
	}
	element.appendChild(labels);
	const source = asRecord(adrenalineSourceDocument(data)?.caracteristiques);
	for (const [index, path] of block.paths.entries()) {
		const key = path.slice(path.lastIndexOf("/") + 1) as CharacteristicKey;
		const value = data.caracteristiques[key];
		const original = asRecord(source?.[key]);
		const minimum = readCurrentValue(original?.minimum, 0, 50);
		const line = doc.createElement("div");
		line.classList.add("brumes-adrenaline-pj--characteristic-row");
		const label = doc.createElement("span");
		label.textContent = block.rowLabels?.[index] ?? key.toUpperCase();
		line.appendChild(label);
		line.appendChild(inkValue(doc, minimum === undefined ? "" : `${minimum} %`, "brumes-adrenaline-pj--creation-value"));
		line.appendChild(inkValue(doc, value === undefined ? "" : `${value} %`));
		element.appendChild(line);
	}
	return element;
}

function possessions(doc: Document, data: AdrenalinePjData): HTMLElement {
	const element = box(doc, "Possessions");
	for (const item of data.equipement?.possessions ?? []) element.appendChild(row(doc, item));
	for (let index = data.equipement?.possessions?.length ?? 0; index < 7; index++) element.appendChild(row(doc, ""));
	element.appendChild(row(doc, "Équipement favori", data.equipement?.equipementFavori));
	return element;
}

function weapons(doc: Document, block: AdrenalinePresentationBlock, entries?: EquipmentWeapon[]): HTMLElement {
	const element = box(doc, block.label);
	for (let index = 0; index < Math.max(2, entries?.length ?? 0); index++) {
		const weapon = entries?.[index];
		const line = doc.createElement("div");
		line.classList.add("brumes-adrenaline-pj--weapon-line");
		line.appendChild(row(doc, "Arme", weapon?.nom));
		line.appendChild(row(doc, "Type", weapon?.type));
		line.appendChild(row(doc, "%", weapon?.pourcentage === undefined ? undefined : `${weapon.pourcentage} %`));
		line.appendChild(row(doc, "Dégâts", weapon?.desDeDegats === undefined ? undefined : String(weapon.desDeDegats)));
		const die = doc.createElement("span");
		die.textContent = block.decoration?.kind === "weapon-die" ? block.decoration.label : "";
		line.appendChild(die);
		element.appendChild(line);
	}
	return element;
}

function protections(doc: Document, title: string, side?: ProtectionSide, mental = false): HTMLElement {
	const element = box(doc, title);
	element.appendChild(row(doc, "Solidité", side?.solidite === undefined ? undefined : String(side.solidite)));
	const protection = mental ? side?.caractere : side?.armure;
	element.appendChild(row(doc, mental ? "Caractère" : "Armure", mental ? side?.caractere?.trait : side?.armure?.nom));
	element.appendChild(row(doc, mental ? "PM" : "PP", protection?.points === undefined ? undefined : String(protection.points)));
	element.appendChild(row(doc, "Localisation", protection?.localisations.join(", ")));
	return element;
}

function stress(doc: Document, data: AdrenalinePjData, block: AdrenalinePresentationBlock): HTMLElement {
	const element = box(doc, "Dés de stress");
	const decoration = block.decoration;
	if (decoration?.kind !== "dice-options") return element;
	for (const [label, key, variants] of [
		["Adrénaline", "adrenaline", decoration.favorable],
		["Panique", "panique", decoration.defavorable],
	] as const) {
		const band = box(doc, label);
		band.classList.add(`brumes-adrenaline-pj--stress-${key}`);
		band.appendChild(row(doc, "", data.etatDePartie?.stress?.[key] === undefined ? undefined : String(data.etatDePartie.stress[key])));
		for (const variant of variants) band.appendChild(row(doc, variant));
		element.appendChild(band);
	}
	return element;
}

function thresholds(doc: Document, title: string, side?: HealthSide): HTMLElement {
	const element = box(doc, title);
	for (const key of ["superficiel", "leger", "grave", "profond"] as const) {
		const threshold = side?.[key];
		const line = doc.createElement("div");
		line.classList.add("brumes-adrenaline-pj--threshold-row");
		line.appendChild(row(doc, key, threshold?.base === undefined ? undefined : String(threshold.base)));
		line.appendChild(row(doc, "+ protection", threshold?.couvert === undefined ? undefined : String(threshold.couvert)));
		element.appendChild(line);
	}
	return element;
}

function malus(doc: Document, data: AdrenalinePjData): HTMLElement {
	const element = box(doc, "Malus");
	for (const key of ["physique", "mental"] as const) {
		const framed = box(doc, key === "physique" ? "Physique" : "Mental");
		framed.classList.add("brumes-adrenaline-pj--status-frame");
		framed.appendChild(row(doc, "Niveau", data.etatDePartie?.malus?.[key] === undefined ? undefined : String(data.etatDePartie.malus[key])));
		element.appendChild(framed);
	}
	return element;
}

function states(doc: Document, data: AdrenalinePjData): HTMLElement {
	const element = box(doc, "États encaissés");
	const entries = data.etatDePartie?.etats ?? [];
	for (let index = 0; index < Math.max(2, entries.length); index++) {
		const entry = entries[index];
		const framed = box(doc);
		framed.classList.add("brumes-adrenaline-pj--status-frame");
		framed.appendChild(row(doc, "État", entry?.nom));
		framed.appendChild(row(doc, "Localisation", entry?.localisation));
		framed.appendChild(row(doc, "Durée", entry?.duree));
		element.appendChild(framed);
	}
	return element;
}

function fatigue(doc: Document, data: AdrenalinePjData, block: AdrenalinePresentationBlock): HTMLElement {
	const element = box(doc, "Fatigue");
	const decoration = block.decoration;
	if (decoration?.kind !== "circle-groups") return element;
	for (const { label: key, count: circleCount } of decoration.groups) {
		const line = doc.createElement("div");
		line.classList.add("brumes-adrenaline-pj--fatigue-line");
		const label = doc.createElement("span");
		label.textContent = key;
		line.appendChild(label);
		const count = data.etatDePartie?.fatigue?.[key];
		for (let index = 0; index < circleCount; index++) {
			const circle = doc.createElement("span");
			circle.classList.add("brumes-adrenaline-pj--fatigue-circle");
			if (count !== undefined && index < count) circle.classList.add("is-marked");
			line.appendChild(circle);
		}
		element.appendChild(line);
	}
	return element;
}

export function renderAdrenalinePj(data: AdrenalinePjData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add(adrenalinePjShape.root);
	renderPresentation(root, doc, PJ_PRESENTATION, adrenalinePjShape, (block) => {
		switch (block.id) {
			case "nom": return nameCard(doc, data);
			case "parametres-jeu": return parameters(doc, data);
			case "px": return pxCard(doc, data);
			case "formations-competences": return formations(doc, data, block);
			case "identite": return identity(doc, data);
			case "caracteristiques-physiques":
			case "caracteristiques-mentales": return characteristics(doc, data, block);
			case "possessions": return possessions(doc, data);
			case "armes-physiques": return weapons(doc, block, data.equipement?.armesPhysiques);
			case "armes-mentales": return weapons(doc, block, data.equipement?.armesMentales);
			case "protections-physiques": return protections(doc, block.label, data.protections.physiques);
			case "protections-mentales": return protections(doc, block.label, data.protections.mentales, true);
			case "stress": return stress(doc, data, block);
			case "seuils-physiques": return thresholds(doc, block.label, data.sante.physique);
			case "seuils-mentaux": return thresholds(doc, block.label, data.sante.mental);
			case "malus": return malus(doc, data);
			case "etats-encaisses": return states(doc, data);
			case "fatigue": return fatigue(doc, data, block);
			default: return null;
		}
	});
	return root;
}
