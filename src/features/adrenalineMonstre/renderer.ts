import {
	CHARACTERISTIC_KEYS,
	Characteristics,
	EquipmentWeapon,
	Protections,
	ProtectionSide,
} from "../adrenaline/document";
import {
	adrenalineList,
	adrenalineSection,
	renderCharacteristics,
	renderHealth,
} from "../adrenaline/view";
import { displayedCompetenceTotal } from "../adrenaline/document";
import { BlockZone, renderZones } from "../blocks/shape";
import { AdrenalineMonsterData } from "./parser";
import { adrenalineMonsterShape } from "./shape";

function section(doc: Document, zone: BlockZone): HTMLElement {
	return adrenalineSection(doc, zone.heading ?? "", "brumes-adrenaline-monstre--panel");
}

function characteristicSummary(characteristics: Characteristics): string {
	return CHARACTERISTIC_KEYS
		.filter((key) => characteristics[key] !== undefined)
		.map((key) => `${key.toUpperCase()} ${characteristics[key]} %`)
		.join(" · ");
}

function weaponSummary(weapon: EquipmentWeapon): string {
	const details = [
		weapon.pourcentage === undefined ? undefined : `${weapon.pourcentage} %`,
		weapon.desDeDegats === undefined ? undefined : `${weapon.desDeDegats}d10`,
		weapon.type,
		weapon.notes,
	].filter((value): value is string => Boolean(value));
	return `${weapon.nom}${details.length === 0 ? "" : ` · ${details.join(" · ")}`}`;
}

function protectionSummary(label: string, protection: ProtectionSide | undefined): string[] {
	if (!protection) return [];
	const lines: string[] = [];
	if (protection.solidite !== undefined) lines.push(`Solidité ${label} : ${protection.solidite}`);
	if (protection.armure) {
		const name = protection.armure.nom ? `${protection.armure.nom} · ` : "";
		lines.push(`Armure : ${name}${protection.armure.points} points · ${protection.armure.localisations.join(", ")}`);
	}
	if (protection.caractere) {
		lines.push(`Caractère : ${protection.caractere.trait} · ${protection.caractere.points} points · ${protection.caractere.localisations.join(", ")}`);
	}
	if (protection.bouclier) {
		const properties = protection.bouclier.proprietes?.join(", ");
		lines.push(`Bouclier : ${protection.bouclier.nom}${properties ? ` · ${properties}` : ""}`);
	}
	return lines;
}

function protectionsSummary(protections: Protections): string[] {
	return [
		...protectionSummary("physique", protections.physiques),
		...protectionSummary("mentale", protections.mentales),
	];
}

function competenceLines(data: AdrenalineMonsterData): string[] {
	return (data.competences ?? []).map((competence) => {
		const details = [
			competence.specialite,
			`${displayedCompetenceTotal(competence, data.caracteristiques) ?? competence.pourcentage} %`,
			...(competence.avantages ?? []),
			competence.notes,
		].filter((value): value is string => Boolean(value));
		return `${competence.nom} · ${details.join(" · ")}`;
	});
}

function alternateStateLines(data: AdrenalineMonsterData): string[] {
	const lines: string[] = [];
	if (data.etatAlternatif) {
		lines.push(`État : ${data.etatAlternatif.nom}`);
		lines.push(...(data.etatAlternatif.declencheurs ?? []).map((trigger) => `Déclencheur : ${trigger}`));
		if (data.etatAlternatif.caracteristiques) lines.push(`Caractéristiques : ${characteristicSummary(data.etatAlternatif.caracteristiques)}`);
		if (data.etatAlternatif.zoneDeDetection) lines.push(`Détection : ${data.etatAlternatif.zoneDeDetection}`);
		if (data.etatAlternatif.deplacement) lines.push(`Déplacement : ${data.etatAlternatif.deplacement}`);
		if (data.etatAlternatif.actionsParRound !== undefined) lines.push(`${data.etatAlternatif.actionsParRound} actions par round`);
		if (data.etatAlternatif.notes) lines.push(data.etatAlternatif.notes);
	}
	return lines;
}

function equipmentLines(data: AdrenalineMonsterData): string[] {
	const lines: string[] = [];
	if (data.equipement) {
		lines.push(...(data.equipement.possessions ?? []));
		if (data.equipement.equipementFavori) lines.push(`Équipement favori : ${data.equipement.equipementFavori}`);
		for (const weapon of data.equipement.armesPhysiques ?? []) lines.push(`Arme physique : ${weaponSummary(weapon)}`);
		for (const weapon of data.equipement.armesMentales ?? []) lines.push(`Arme mentale : ${weaponSummary(weapon)}`);
	}
	return lines;
}

function contagionLines(data: AdrenalineMonsterData): string[] {
	const lines: string[] = [];
	if (data.contagion) {
		if (data.contagion.agent) lines.push(`Agent : ${data.contagion.agent}`);
		if (data.contagion.delaiAvantEffet) lines.push(data.contagion.delaiAvantEffet);
		if (data.contagion.issue) lines.push(data.contagion.issue);
		for (const vector of data.contagion.vecteurs ?? []) lines.push(`${vector.nom}${vector.probabilite === undefined ? "" : ` · ${vector.probabilite} %`}${vector.notes ? ` · ${vector.notes}` : ""}`);
		for (const modulation of data.contagion.modulations ?? []) lines.push(`${modulation.profil}${modulation.delaiAvantEffet ? ` · ${modulation.delaiAvantEffet}` : ""}${modulation.issue ? ` · ${modulation.issue}` : ""}`);
	}
	return lines;
}

function narrativeLines(data: AdrenalineMonsterData): string[] {
	const lines: string[] = [];
	const narrative = data.narratif;
	if (narrative) {
		for (const key of ["role", "attitude", "historique", "evolutionPossible"] as const) if (narrative[key]) lines.push(narrative[key] ?? "");
		for (const key of ["personnalite", "interpretation", "repliques", "notesMj"] as const) if (narrative[key]) lines.push(...(narrative[key] ?? []));
	}
	return lines;
}

function capabilityGroup(doc: Document, heading: string, lines: string[]): HTMLElement | null {
	if (lines.length === 0) return null;
	const group = doc.createElement("section");
	group.classList.add("brumes-adrenaline-monstre--capability-group");
	const title = doc.createElement("h5");
	title.textContent = heading;
	group.appendChild(title);
	group.appendChild(adrenalineList(doc, lines, "brumes-adrenaline-monstre--capability-list"));
	return group;
}

export function renderAdrenalineMonster(data: AdrenalineMonsterData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add(adrenalineMonsterShape.root);
	renderZones(root, adrenalineMonsterShape, {
		header: () => {
			const header = doc.createElement("header");
			const title = doc.createElement("h3");
			title.textContent = data.nom;
			header.appendChild(title);
			for (const value of [data.typeDeCorps, data.typeInfecte, data.instinct]) {
				if (!value) continue;
				const span = doc.createElement("span");
				span.textContent = value;
				header.appendChild(span);
			}
			if (data.niveauDeDanger !== undefined) {
				const danger = doc.createElement("strong");
				danger.textContent = `ND ${data.niveauDeDanger}`;
				header.appendChild(danger);
			}
			return header;
		},
		mobility: (zone) => {
			const lines = [data.zoneDeDetection, data.deplacement].filter((value): value is string => Boolean(value));
			if (lines.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(adrenalineList(doc, lines, "brumes-adrenaline-monstre--mobility-list"));
			return element;
		},
		behaviour: (zone) => {
			const lines = [...(data.comportement ?? [])];
			if (data.actionsParRound !== undefined) lines.unshift(`${data.actionsParRound} actions par round`);
			if (data.description) lines.push(data.description);
			if (lines.length === 0) return null;
			const element = section(doc, zone);
			element.appendChild(adrenalineList(doc, lines, "brumes-adrenaline-monstre--behaviour-list"));
			return element;
		},
		characteristics: (zone) => {
			const element = section(doc, zone);
			element.appendChild(renderCharacteristics(doc, data.caracteristiques));
			return element;
		},
		health: (zone) => {
			if (!data.sante && !data.protections) return null;
			const element = section(doc, zone);
			if (data.sante) element.appendChild(renderHealth(doc, data.sante));
			if (data.protections) element.appendChild(adrenalineList(doc, protectionsSummary(data.protections), "brumes-adrenaline-monstre--protection-list"));
			return element;
		},
		capabilities: (zone) => {
			const element = section(doc, zone);
			const groups = [
				capabilityGroup(doc, "Traits", data.traitsSpeciaux ?? []),
				capabilityGroup(doc, "État alternatif", alternateStateLines(data)),
				capabilityGroup(doc, "Compétences", competenceLines(data)),
				capabilityGroup(doc, "Équipement", equipmentLines(data)),
				capabilityGroup(doc, "Contagion", contagionLines(data)),
				capabilityGroup(doc, "Informations de jeu", narrativeLines(data)),
			];
			for (const group of groups) if (group) element.appendChild(group);
			if (element.children.length === 1) return null;
			return element;
		},
	});
	return root;
}
