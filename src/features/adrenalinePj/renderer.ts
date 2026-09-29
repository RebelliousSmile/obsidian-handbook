import { PJ_PRESENTATION, type AdrenalinePresentationBlock, type AdrenalinePresentationSection } from "schema-adrenaline/presentation";
import { adrenalineSourceDocument, asRecord, displayedCompetenceTotal, readCurrentValue, type AdrenalineDocument, type Competence, type EquipmentWeapon, type Formation } from "../adrenaline/document";
import { renderZones } from "../blocks/shape";
import { logScope } from "../../utils/logger";
import { AdrenalinePjData } from "./parser";
import { pjToDocument } from "./schema";
import { adrenalinePjShape } from "./shape";

const ROOT = "brumes-adrenaline-pj";
const log = logScope("adrenaline-pj");
const reportedForms = new Set<string>();

/* Labels the published presentation leaves to the consumer: field names and enum values. */
const PARAMETER_LABELS: Record<string, string> = { joueur: "Joueur", typeDeCreation: "Création", typeDeScenario: "Scénario", declinaisonDeCampagne: "Campagne" };
const PARAMETER_VALUES: Record<string, string> = { equitable: "Équitable", aleatoire: "Aléatoire", "one-shot": "One-shot", campagne: "Campagne", "bac-a-sable": "Bac à sable", storyline: "Storyline" };
const FIELD_LABELS: Record<string, string> = { equipementFavori: "Équipement favori", possessions: "Possessions" };
const IDENTITY_COLUMNS: readonly (readonly (readonly [string, string])[])[] = [
	[["nationalite", "Nationalité"], ["cheveux", "Cheveux"], ["yeux", "Yeux"], ["peau", "Peau"], ["signesParticuliers", "Signes particuliers"]],
	[["genre", "Genre"], ["age", "Âge"], ["taille", "Taille"], ["poids", "Poids"]],
];
const RANGE_HEADS = { minimum: "Création", current: "Actuel" } as const;
const THRESHOLDS: readonly (readonly [string, string])[] = [["superficiel", "Superficiel"], ["leger", "Léger"], ["grave", "Grave"], ["profond", "Profond"]];
const STRESS: readonly (readonly [string, string, "favorable" | "defavorable", string])[] = [["adrenaline", "Adrénaline", "favorable", "Favorable"], ["panique", "Panique", "defavorable", "Défavorable"]];
const MALUS: readonly (readonly [string, string])[] = [["physique", "Physique"], ["mental", "Mental"]];

function node(doc: Document, tag: string, className: string, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	result.classList.add(`${ROOT}__${className}`);
	if (text !== undefined) result.textContent = text;
	return result;
}

function add(parent: HTMLElement, doc: Document, tag: string, className: string, text?: string): HTMLElement {
	return parent.appendChild(node(doc, tag, className, text));
}

function at(source: AdrenalineDocument, pointer: string): unknown {
	return pointer.slice(1).split("/").reduce<unknown>((value, key) => asRecord(value)?.[key], source);
}

function lastSegment(pointer: string): string {
	return pointer.split("/").pop() ?? "";
}

function scalar(value: unknown): string | number | undefined {
	return typeof value === "string" ? value : readCurrentValue(value);
}

function text(value: unknown, suffix = ""): string {
	const shown = scalar(value);
	return shown === undefined || shown === "" ? "" : `${shown}${suffix}`;
}

function humanize(value: string): string {
	const spaced = value.replace(/-/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function rangePart(value: unknown, part: "minimum" | "current"): number | undefined {
	const record = asRecord(value);
	return readCurrentValue(record?.[part] ?? (part === "current" ? value : undefined));
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function value(doc: Document, content: string, className = "value"): HTMLElement {
	const result = node(doc, "span", className, content);
	if (className !== "value") result.classList.add(`${ROOT}__value`);
	return result;
}

function subhead(doc: Document, parent: HTMLElement, label: string, trailing: readonly string[] = []): HTMLElement {
	const head = add(parent, doc, "h5", "block-title", label);
	if (trailing.length) {
		const heads = add(head, doc, "span", "subhead-trailing");
		for (const item of trailing) add(heads, doc, "span", "subhead-head", item);
	}
	return head;
}

/** A label, a dotted handwritten field. */
function writeLine(doc: Document, parent: HTMLElement, label: string, content: string): HTMLElement {
	const line = add(parent, doc, "div", "write-line");
	add(line, doc, "b", "write-label", label);
	line.appendChild(value(doc, content, "write-field"));
	return line;
}

/** A name, a bordered handwritten value. */
function metric(doc: Document, parent: HTMLElement, name: string, values: readonly string[]): HTMLElement {
	const line = add(parent, doc, "div", "metric");
	line.classList.add(`${ROOT}__metric-${values.length}`);
	add(line, doc, "span", "metric-name", name);
	for (const item of values) line.appendChild(value(doc, item, "metric-value"));
	return line;
}

function circles(doc: Document, parent: HTMLElement, count: number, filled: number): void {
	for (let index = 0; index < count; index += 1) add(parent, doc, "i", index < filled ? "dot-filled" : "dot").classList.add(`${ROOT}__dot-mark`);
}

function renderNameCard(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	add(box, doc, "span", "card-label", block.label);
	const suffix = block.valueSuffix && block.valueSuffix !== block.label ? ` ${block.valueSuffix}` : "";
	box.appendChild(value(doc, block.paths.map((pointer) => text(at(source, pointer), suffix)).filter(Boolean).join(" · "), "card-value"));
}

function renderGameParameters(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	add(box, doc, "span", "card-label", block.label);
	const fields = add(box, doc, "div", "card-fields");
	for (const pointer of block.paths) {
		const key = lastSegment(pointer);
		const raw = text(at(source, pointer));
		writeLine(doc, fields, PARAMETER_LABELS[key] ?? humanize(key), PARAMETER_VALUES[raw] ?? raw);
	}
}

function competenceName(competence: Competence): string {
	return competence.specialite ? `${competence.nom} · ${competence.specialite}` : competence.nom;
}

function renderFormationColumns(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, data: AdrenalinePjData): void {
	const suffix = block.valueSuffix ?? "";
	const shown: Formation[] = data.formations ?? [];
	for (const formation of shown) {
		const column = add(box, doc, "div", "formation");
		subhead(doc, column, "Formation", [suffix]);
		const header = add(column, doc, "div", "metric-list");
		metric(doc, header, `${humanize(formation.type)} (${formation.nom})`, [text(formation.pourcentage)]);
		subhead(doc, column, "Compétences", [suffix]);
		const list = add(column, doc, "div", "metric-list");
		for (const competence of formation.competences ?? []) {
			metric(doc, list, competenceName(competence), [text(displayedCompetenceTotal(competence, data.caracteristiques) ?? competence.pourcentage)]);
			if (competence.avantages?.length) add(list, doc, "p", "note", `Avantage : ${competence.avantages.join(", ")}`);
			if (competence.notes) add(list, doc, "p", "note", competence.notes);
		}
	}
}

function renderIdentityFields(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const identity = asRecord(at(source, block.paths[0])) ?? {};
	for (const fields of IDENTITY_COLUMNS) {
		const column = add(box, doc, "div", "identity-column");
		for (const [key, label] of fields) {
			const raw = identity[key];
			const shown = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string").join(" · ") : key === "age" ? text(raw, " ans") : text(raw);
			writeLine(doc, column, label, shown);
		}
	}
}

function renderCharacteristicRows(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const parts = block.rangeDisplay ?? ["current"];
	const suffix = block.valueSuffix ? ` ${block.valueSuffix}` : "";
	const heads = add(box, doc, "div", "metric-heads");
	heads.classList.add(`${ROOT}__metric-${parts.length}`);
	add(heads, doc, "span", "metric-name");
	for (const part of parts) add(heads, doc, "span", "metric-head", RANGE_HEADS[part]);
	const list = add(box, doc, "div", "metric-list");
	block.paths.forEach((pointer, index) => {
		const row = metric(doc, list, block.rowLabels?.[index] ?? humanize(lastSegment(pointer)), parts.map((part) => {
			const found = rangePart(at(source, pointer), part);
			return found === undefined ? "" : `${found}${suffix}`;
		}));
		row.classList.add(`${ROOT}__characteristic`);
	});
}

function renderRuledList(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	for (const pointer of block.paths) {
		const found = at(source, pointer);
		if (Array.isArray(found)) {
			const list = add(box, doc, "div", "ruled-list");
			for (const item of found) add(list, doc, "div", "ruled-line", text(item)).classList.add(`${ROOT}__value`);
			for (let index = found.length; index < 3; index += 1) add(list, doc, "div", "ruled-line");
		} else {
			const key = lastSegment(pointer);
			writeLine(doc, box, FIELD_LABELS[key] ?? humanize(key), text(found));
		}
	}
}

function renderWeaponLines(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const die = block.decoration?.kind === "weapon-die" ? block.decoration.label : "";
	const found = at(source, block.paths[0]);
	const weapons = (Array.isArray(found) ? found : []) as EquipmentWeapon[];
	for (const weapon of weapons.length ? weapons : [undefined]) {
		const line = add(box, doc, "div", "weapon-line");
		add(line, doc, "b", "write-label", "Arme");
		line.appendChild(value(doc, weapon ? `${weapon.nom}${weapon.type ? ` (${weapon.type})` : ""}` : "", "write-field"));
		line.appendChild(value(doc, weapon ? text(weapon.pourcentage, " %") : "", "weapon-score"));
		line.appendChild(value(doc, weapon?.desDeDegats !== undefined ? `${weapon.desDeDegats} ${die}`.trim() : die, "weapon-damage"));
		if (weapon?.notes) add(box, doc, "p", "note", weapon.notes);
	}
}

function unitLine(doc: Document, parent: HTMLElement, label: string, field: string, amount: string, unit: string): void {
	const line = add(parent, doc, "div", "unit-line");
	add(line, doc, "b", "write-label", label);
	line.appendChild(value(doc, field, "write-field"));
	line.appendChild(value(doc, amount, "unit-value"));
	add(line, doc, "span", "unit", unit);
}

function renderProtectionLines(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const pointer = block.paths[0];
	const physical = lastSegment(pointer) === "physiques";
	const units = block.decoration?.kind === "protection-units" ? block.decoration : { physical: "PP", mental: "PM" };
	const unit = physical ? units.physical : units.mental;
	const side = asRecord(at(source, pointer)) ?? {};
	unitLine(doc, box, "Solidité", "", text(side.solidite), unit);
	const cover = asRecord(physical ? side.armure : side.caractere);
	const places = Array.isArray(cover?.localisations) ? cover.localisations.filter((item): item is string => typeof item === "string").map((item) => item.replace(/-/g, " ")).join(", ") : "";
	const coverName = text(physical ? cover?.nom : cover?.trait);
	unitLine(doc, box, physical ? "Armure" : "Caractère", [coverName, places].filter(Boolean).join(" · "), text(cover?.points), unit);
	const shield = asRecord(side.bouclier);
	const properties = Array.isArray(shield?.proprietes) ? shield.proprietes.filter((item): item is string => typeof item === "string").join(", ") : "";
	writeLine(doc, box, "Bouclier", [text(shield?.nom), properties].filter(Boolean).join(" · "));
}

function renderStressDice(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const stress = asRecord(at(source, block.paths[0])) ?? {};
	const dice = block.decoration?.kind === "dice-options" ? block.decoration : undefined;
	const grid = add(box, doc, "div", "stress-grid");
	for (const [key, label, side, sideLabel] of STRESS) {
		const card = add(grid, doc, "div", "stress-card");
		add(card, doc, "span", "card-label", label);
		const count = Number(scalar(stress[key])) || 0;
		(dice?.[side] ?? []).forEach((die, index) => {
			const roll = add(card, doc, "div", "stress-roll");
			circles(doc, roll, 1, count > index ? 1 : 0);
			add(roll, doc, "strong", "stress-die", die.replace("-", "−"));
			add(roll, doc, "small", "stress-side", sideLabel);
		});
	}
}

function renderThresholdRows(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const pointer = block.paths[0];
	const side = asRecord(at(source, pointer)) ?? {};
	const heads = add(box, doc, "div", "metric-heads");
	heads.classList.add(`${ROOT}__metric-2`);
	add(heads, doc, "span", "metric-name");
	add(heads, doc, "span", "metric-head", "Base");
	add(heads, doc, "span", "metric-head", lastSegment(pointer) === "mental" ? "+ Caractère" : "+ Armure");
	const list = add(box, doc, "div", "metric-list");
	for (const [key, label] of THRESHOLDS) {
		const threshold = asRecord(side[key]);
		metric(doc, list, label, [text(threshold?.base), text(threshold?.couvert)]);
	}
}

function track(doc: Document, parent: HTMLElement, label: string, modifier?: string): HTMLElement {
	const frame = add(parent, doc, "div", "track");
	if (modifier) frame.classList.add(`${ROOT}__track--${modifier}`);
	add(frame, doc, "span", "track-label", label);
	return add(frame, doc, "div", "track-body");
}

function renderConditionCards(doc: Document, box: HTMLElement, states: unknown): void {
	const stack = add(box, doc, "div", "condition-stack");
	const list = Array.isArray(states) ? states.map(asRecord).filter((state): state is Record<string, unknown> => state !== undefined) : [];
	for (const state of list.length ? list : [undefined]) {
		const card = add(stack, doc, "div", "condition-card");
		add(card, doc, "span", "condition-label", text(state?.nom) || "État");
		const body = add(card, doc, "div", "condition-body");
		const place = [text(state?.versant), text(state?.localisation).replace(/-/g, " ")].filter(Boolean).join(" · ");
		writeLine(doc, body, "Localisation", place);
		writeLine(doc, body, "Durée", text(state?.duree));
		if (state?.notes) add(body, doc, "p", "note", text(state.notes));
	}
}

function renderStatusFrames(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const pointer = block.paths[0];
	const found = at(source, pointer);
	if (Array.isArray(found) || lastSegment(pointer) === "etats") {
		renderConditionCards(doc, box, found);
		return;
	}
	const malus = asRecord(found) ?? {};
	const tracks = add(box, doc, "div", "tracks");
	for (const [key, label] of MALUS) {
		const body = track(doc, tracks, label);
		add(body, doc, "span", "track-line");
		body.appendChild(value(doc, text(malus[key], " %"), "track-value"));
	}
}

function renderFatigueCircles(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const fatigue = asRecord(at(source, block.paths[0])) ?? {};
	const body = track(doc, add(box, doc, "div", "tracks"), block.label, "fatigue");
	if (block.decoration?.kind !== "circle-groups") return;
	block.decoration.groups.forEach((group, index) => {
		if (index > 0) add(body, doc, "span", "track-line");
		add(body, doc, "span", "track-period", capitalize(group.label));
		circles(doc, body, group.count, Math.min(group.count, Math.max(0, Number(scalar(fatigue[group.label])) || 0)));
	});
}

function renderUnknown(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const form = block.form ?? "(none)";
	if (!reportedForms.has(form)) {
		reportedForms.add(form);
		log.warn(`PJ block form "${form}" has no dedicated rendering; block "${block.id}" is shown as plain lines.`);
	}
	for (const pointer of block.paths) writeLine(doc, box, humanize(lastSegment(pointer)), text(at(source, pointer)));
}

/* The cartouche prints its own banner label; formation columns print one subhead per column. */
const TITLED_ELSEWHERE = new Set(["name-card", "game-parameters", "formation-columns"]);

function renderBlock(doc: Document, block: AdrenalinePresentationBlock, data: AdrenalinePjData, source: AdrenalineDocument): HTMLElement {
	const box = node(doc, "div", block.id);
	box.classList.add(`${ROOT}__block`, `${ROOT}__form-${block.form ?? "none"}`, `${ROOT}__layout-${block.layout}`);
	if (block.columns) box.classList.add(`${ROOT}__block-columns-${block.columns}`);
	if (block.placement) {
		box.classList.add(`${ROOT}__col-${block.placement.column}`, `${ROOT}__row-${block.placement.row}`);
		if (block.placement.rowSpan) box.classList.add(`${ROOT}__row-span-${block.placement.rowSpan}`);
		if (block.placement.columnSpan) box.classList.add(`${ROOT}__col-span-${block.placement.columnSpan}`);
	}
	if (!TITLED_ELSEWHERE.has(block.form ?? "")) subhead(doc, box, block.label);
	const body = block.form === "formation-columns" || block.form === "identity-fields" ? add(box, doc, "div", "block-grid") : box;
	switch (block.form) {
		case "name-card": renderNameCard(doc, box, block, source); break;
		case "game-parameters": renderGameParameters(doc, box, block, source); break;
		case "formation-columns": renderFormationColumns(doc, body, block, data); break;
		case "identity-fields": renderIdentityFields(doc, body, block, source); break;
		case "characteristic-rows": renderCharacteristicRows(doc, box, block, source); break;
		case "ruled-list": renderRuledList(doc, box, block, source); break;
		case "weapon-lines": renderWeaponLines(doc, box, block, source); break;
		case "protection-lines": renderProtectionLines(doc, box, block, source); break;
		case "stress-dice": renderStressDice(doc, box, block, source); break;
		case "threshold-rows": renderThresholdRows(doc, box, block, source); break;
		case "status-frames": renderStatusFrames(doc, box, block, source); break;
		case "fatigue-circles": renderFatigueCircles(doc, box, block, source); break;
		default: renderUnknown(doc, box, block, source);
	}
	return box;
}

/** The ☣ mark between the name and the game parameters, read from the published variant and sheet label. */
function renderBrand(doc: Document): HTMLElement {
	const brand = node(doc, "div", "brand");
	add(brand, doc, "strong", "brand-name", `☣ ${capitalize(PJ_PRESENTATION.appearance.variant)}`);
	add(brand, doc, "span", "brand-sheet", PJ_PRESENTATION.sheet.label);
	return brand;
}

function renderSection(doc: Document, section: AdrenalinePresentationSection, data: AdrenalinePjData, source: AdrenalineDocument): HTMLElement {
	const container = node(doc, "section", "section");
	if (section.showTitle !== false) add(container, doc, "h4", "section-title", section.label);
	const body = add(container, doc, "div", "section-body");
	body.classList.add(`${ROOT}__columns-${section.columns ?? 1}`, `${ROOT}__layout-${section.layout}`);
	for (const block of [...section.blocks].sort((a, b) => a.order - b.order)) {
		if (block.form === "game-parameters") body.appendChild(renderBrand(doc));
		body.appendChild(renderBlock(doc, block, data, source));
	}
	return container;
}

export function renderAdrenalinePj(data: AdrenalinePjData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	const appearance = PJ_PRESENTATION.appearance;
	root.classList.add(
		adrenalinePjShape.root,
		`${ROOT}--variant-${appearance.variant}`,
		`${ROOT}--surface-${appearance.surface}`,
		`${ROOT}--titles-${appearance.sectionTitles.align}`,
		`${ROOT}--titles-${appearance.sectionTitles.font}`,
		`${ROOT}--values-${appearance.values.align}`,
		`${ROOT}--values-${appearance.values.font}`,
	);
	if (appearance.outerRule) root.classList.add(`${ROOT}--outer-rule`);
	const source = adrenalineSourceDocument(data) ?? pjToDocument(data);
	const builders: Record<string, () => HTMLElement> = {};
	for (const section of PJ_PRESENTATION.sections) builders[section.id] = () => renderSection(doc, section, data, source);
	renderZones(root, adrenalinePjShape, builders);
	return root;
}
