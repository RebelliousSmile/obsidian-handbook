import { PJ_PRESENTATION, type AdrenalinePresentationBlock, type AdrenalinePresentationSection } from "schema-adrenaline/presentation";
import { adrenalineSourceDocument, asRecord, readCurrentValue, type AdrenalineDocument, type Competence, type EquipmentWeapon, type Formation } from "../adrenaline/document";
import { publishedAsList } from "../adrenaline/publishedContract";
import { renderZones } from "../blocks/shape";
import { logScope } from "../../utils/logger";
import { AdrenalinePjData } from "./parser";
import { pjToDocument } from "./schema";
import { adrenalinePjShape } from "./shape";

const ROOT = "brumes-adrenaline-pj";
const log = logScope("adrenaline-pj");
const reportedForms = new Set<string>();

/* Labels the published presentation leaves to the consumer: field names and enum values. */
const PARAMETER_VALUES: Record<string, string> = { equitable: "Équitable", aleatoire: "Aléatoire", "one-shot": "One-shot", campagne: "Campagne", "bac-a-sable": "Bac à sable", storyline: "Storyline" };
const FIELD_LABELS: Record<string, string> = { equipementFavori: "Équipement favori", possessions: "Possessions" };
const IDENTITY_LABELS: Record<string, string> = {
	nationalite: "Nationalité", genre: "Genre", cheveux: "Cheveux", age: "Âge", yeux: "Yeux",
	taille: "Taille", peau: "Peau", poids: "Poids", signesParticuliers: "Signes particuliers",
};
/* The unit the thresholds count their malus in; the presentation publishes the count, the word is the sheet's own ("1 malus = -10 %"). */
const MALUS = "malus";
const STRESS: readonly (readonly [string, string, "favorable" | "defavorable", string])[] = [["adrenaline", "Adrénaline", "favorable", "Favorable"], ["panique", "Panique", "defavorable", "Défavorable"]];

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

/** The current value of a characteristic; a scalar is its own current value. */
function currentPart(value: unknown): number | undefined {
	const record = asRecord(value);
	return readCurrentValue(record ? record.current : value);
}

/** True when the document enters nothing at this place. */
function isBlank(found: unknown): boolean {
	if (found === undefined || found === null || found === "") return true;
	if (Array.isArray(found)) return found.length === 0;
	const record = asRecord(found);
	return record ? Object.keys(record).length === 0 : false;
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
function metric(doc: Document, parent: HTMLElement, name: string, values: readonly string[], hint?: string): HTMLElement {
	const line = add(parent, doc, "div", "metric");
	line.classList.add(`${ROOT}__metric-${values.length}`);
	const label = add(line, doc, "span", "metric-name", name);
	if (hint) add(label, doc, "small", "threshold-malus", hint);
	for (const item of values) line.appendChild(value(doc, item, "metric-value"));
	return line;
}

/** A metric whose name the player writes too: returns the empty name, for the caller to fill. */
function enteredMetric(doc: Document, parent: HTMLElement, entered: string, className: string): HTMLElement {
	const line = add(parent, doc, "div", "metric");
	line.classList.add(`${ROOT}__metric-1`, `${ROOT}__${className}`);
	const name = add(line, doc, "span", "metric-name");
	line.appendChild(value(doc, entered, "metric-value"));
	return name;
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
	block.paths.forEach((pointer, index) => {
		// A pointer the block prints as a subtitle (under the sheet label) is not a row.
		if ((block.subtitlePaths ?? []).indexOf(pointer) >= 0) return;
		const raw = text(at(source, pointer));
		writeLine(doc, fields, block.rowLabels?.[index] ?? humanize(lastSegment(pointer)), PARAMETER_VALUES[raw] ?? raw);
	});
}

/** The sheet prints a competence as `Name (Speciality)`: the game master picks the characteristic at the table. */
function competenceName(competence: Competence): string {
	return competence.specialite ? `${competence.nom} (${competence.specialite})` : competence.nom;
}

/**
 * The printed columns, published since schema-adrenaline 2.7.0 as `formationTypes`: every type
 * keeps its column even when the document leaves it empty. An older contract prints the
 * document's formations only.
 */
function formationColumns(block: AdrenalinePresentationBlock, formations: readonly Formation[]): (Formation | { type: string })[] {
	const types = (block as { formationTypes?: unknown }).formationTypes;
	if (!Array.isArray(types)) return [...formations];
	const columns: (Formation | { type: string })[] = [];
	for (const type of types) if (typeof type === "string") {
		const own = formations.filter((formation) => formation.type === type);
		if (own.length > 0) columns.push(...own);
		else columns.push({ type });
	}
	for (const formation of formations) if (types.indexOf(formation.type) < 0) columns.push(formation);
	return columns;
}

function renderFormationColumns(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, data: AdrenalinePjData): void {
	const suffix = block.valueSuffix ?? "";
	for (const formation of formationColumns(block, data.formations ?? [])) {
		const column = add(box, doc, "div", "formation");
		subhead(doc, column, "Formation", [suffix]);
		const header = add(column, doc, "div", "metric-list");
		if (!("nom" in formation)) {
			metric(doc, header, humanize(formation.type), [""]);
			continue;
		}
		// The type and its parentheses are printed on the paper; the player writes the name between them.
		const head = enteredMetric(doc, header, text(formation.pourcentage), "formation-head");
		add(head, doc, "span", "formation-type", `${humanize(formation.type)} (`);
		head.appendChild(value(doc, formation.nom, "formation-name"));
		add(head, doc, "span", "formation-type", ")");
		subhead(doc, column, "Compétences", [suffix]);
		const list = add(column, doc, "div", "metric-list");
		for (const competence of formation.competences ?? []) {
			const name = enteredMetric(doc, list, text(competence.pourcentage), "competence");
			name.textContent = competenceName(competence);
			name.classList.add(`${ROOT}__value`);
		}
	}
}

/**
 * The printed rows of an identity grid, published since schema-adrenaline 2.7.0: a lone field
 * spans the whole width. Read by cast so an older installed contract falls back to one per row.
 */
function fieldRows(block: AdrenalinePresentationBlock): readonly (readonly string[])[] {
	const rows = (block as { fieldRows?: unknown }).fieldRows;
	if (Array.isArray(rows)) return rows.filter((row): row is string[] => Array.isArray(row) && row.every((key) => typeof key === "string"));
	return Object.keys(IDENTITY_LABELS).map((key) => [key]);
}

function renderIdentityFields(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const identity = asRecord(at(source, block.paths[0])) ?? {};
	for (const row of fieldRows(block)) {
		for (const key of row) {
			const raw = identity[key];
			const shown = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string").join(" · ") : key === "age" ? text(raw, " ans") : text(raw);
			const line = writeLine(doc, box, IDENTITY_LABELS[key] ?? key, shown);
			if (row.length === 1) line.classList.add(`${ROOT}__field-across`);
		}
	}
}

function renderCharacteristicRows(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const suffix = block.valueSuffix ? ` ${block.valueSuffix}` : "";
	const list = add(box, doc, "div", "metric-list");
	block.paths.forEach((pointer, index) => {
		const found = currentPart(at(source, pointer));
		const row = metric(doc, list, block.rowLabels?.[index] ?? humanize(lastSegment(pointer)), [found === undefined ? "" : `${found}${suffix}`]);
		row.classList.add(`${ROOT}__characteristic`);
	});
}

/**
 * A list of ruled lines, at least the `minimumRows` the presentation publishes. A path the contract
 * publishes as a list draws its lines whether the list is entered or not; any other path is a field.
 */
function renderRuledList(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const printed = block.minimumRows ?? 0;
	for (const pointer of block.paths) {
		const found = at(source, pointer);
		if (Array.isArray(found) || publishedAsList("pj", pointer)) {
			const entries = Array.isArray(found) ? found : [];
			const list = add(box, doc, "div", "ruled-list");
			for (const item of entries) add(list, doc, "div", "ruled-line", text(item)).classList.add(`${ROOT}__value`);
			for (let index = entries.length; index < printed; index += 1) add(list, doc, "div", "ruled-line");
		} else {
			const key = lastSegment(pointer);
			writeLine(doc, box, FIELD_LABELS[key] ?? humanize(key), text(found));
		}
	}
}

/** The weapon lines carry no label of their own: the block already says what they are. */
function renderWeaponLines(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const die = block.decoration?.kind === "weapon-die" ? block.decoration.label : "";
	const found = at(source, block.paths[0]);
	const weapons = (Array.isArray(found) ? found : []) as EquipmentWeapon[];
	const printed = Math.max(weapons.length, block.minimumRows ?? 0);
	for (let index = 0; index < printed; index += 1) {
		const weapon = weapons[index];
		const line = add(box, doc, "div", "weapon-line");
		line.appendChild(value(doc, weapon ? weapon.nom : "", "write-field"));
		line.appendChild(value(doc, weapon ? text(weapon.pourcentage, " %") : "", "weapon-score"));
		// A blank line prints no die: the label only follows an entered number.
		const damage = value(doc, weapon?.desDeDegats !== undefined ? `${weapon.desDeDegats}${die}` : "", "weapon-damage");
		if (weapon?.nature === "choquante" || weapon?.nature === "blessante") damage.classList.add(`${ROOT}__dice--${weapon.nature}`);
		line.appendChild(damage);
	}
}

/** The protection line: its label, its detail and its points; the unit (PP, PM) is no longer printed on the paper sheet. */
function unitLine(doc: Document, parent: HTMLElement, label: string, field: string, amount: string): void {
	const line = add(parent, doc, "div", "unit-line");
	add(line, doc, "b", "write-label", label);
	line.appendChild(value(doc, field, "write-field"));
	line.appendChild(value(doc, amount, "unit-value"));
}

function strings(found: unknown): string[] {
	return Array.isArray(found) ? found.filter((item): item is string => typeof item === "string" && item !== "") : [];
}

/**
 * The protections of one side: solidity, armour (or character) and shield as entered, then the six
 * published locations with three boxes each. A location the cover lists ticks the first box; the
 * other two stay empty.
 */
function renderLocationGrid(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const grid = block.decoration?.kind === "location-grid" ? block.decoration : undefined;
	if (!grid) { renderUnknown(doc, box, block, source); return; }
	const physical = grid.side === "physical";
	const side = asRecord(at(source, block.paths[0])) ?? {};
	const cover = asRecord(physical ? side.armure : side.caractere);
	const covered = strings(cover?.localisations);
	const detail = [text(physical ? cover?.nom : cover?.trait), text(cover?.couverture), text(cover?.des).replace("-", "−"), strings(cover?.emotions).join(", "), strings(cover?.proprietes).join(", ")].filter(Boolean).join(" · ");
	unitLine(doc, box, physical ? "Armure" : "Caractère", detail, text(cover?.points));
	const places = add(box, doc, "div", "locations");
	for (const place of grid.locations) {
		const row = add(places, doc, "div", "location");
		add(row, doc, "span", "location-range", place.range);
		add(row, doc, "span", "location-label", place.label);
		const boxes = add(row, doc, "span", "location-boxes");
		for (let index = 0; index < grid.boxes; index += 1) {
			add(boxes, doc, "i", index === 0 && covered.indexOf(place.id) >= 0 ? "box-ticked" : "box").classList.add(`${ROOT}__box-mark`);
		}
	}
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
			// Each circle is a rank: the counter ticks the circle of its own rank only.
			circles(doc, roll, 1, count === index + 1 ? 1 : 0);
			add(roll, doc, "strong", "stress-die", die.replace("-", "−"));
			add(roll, doc, "small", "stress-side", sideLabel);
		});
	}
}

/** One value per level, under the label and the malus count the presentation publishes for it; the covered value is not printed. */
function renderThresholdRows(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const side = asRecord(at(source, block.paths[0])) ?? {};
	const list = add(box, doc, "div", "metric-list");
	for (const level of block.thresholdLevels ?? []) {
		metric(doc, list, level.label, [text(asRecord(side[level.key])?.base)], ` ${level.malus} ${MALUS}`);
	}
}

/** A banner over a column of circles, and beside them a vertical strip to write on (rotated a quarter turn), as on the paper sheet. */
function track(doc: Document, parent: HTMLElement, label: string, modifier?: string, written = ""): HTMLElement {
	const frame = add(parent, doc, "div", "track");
	if (modifier) frame.classList.add(`${ROOT}__track--${modifier}`);
	add(frame, doc, "span", "track-label", label);
	const body = add(frame, doc, "div", "track-body");
	frame.appendChild(value(doc, written, "track-text"));
	return body;
}

/** États: a free zone, as on the paper sheet. The player sheet writes its text as entered; a list (creature, NPC) is written one line per state. */
function renderStatusFrames(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const states = at(source, block.paths[0]);
	const zone = add(box, doc, "div", "states-zone");
	if (typeof states === "string") {
		for (const line of states.split(/\r?\n/)) if (line.trim()) add(zone, doc, "p", "states-line", line.trim()).classList.add(`${ROOT}__value`);
		return;
	}
	for (const state of Array.isArray(states) ? states.map(asRecord) : []) {
		if (!state) continue;
		const place = [text(state.versant), text(state.localisation).replace(/-/g, " ")].filter(Boolean).join(" · ");
		const line = [text(state.nom), place, text(state.duree), text(state.notes)].filter(Boolean).join(" — ");
		if (line) add(zone, doc, "p", "states-line", line).classList.add(`${ROOT}__value`);
	}
}

/** The yellow Choc box: the published circle groups, each ticked as many times as entered. */
function renderShockCircles(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const shock = asRecord(at(source, block.paths[0])) ?? {};
	const written = block.paths[1] ? text(at(source, block.paths[1])) : "";
	const body = track(doc, add(box, doc, "div", "tracks"), block.label, "choc", written);
	if (block.decoration?.kind !== "circle-groups") return;
	block.decoration.groups.forEach((group, index) => {
		if (index > 0) add(body, doc, "span", "track-line");
		add(body, doc, "span", "track-period", group.label);
		circles(doc, body, group.count, Math.min(group.count, Math.max(0, Number(scalar(shock[group.key])) || 0)));
	});
}

/** Divers: the published number of circles ticked by the counter, then the free text as entered. */
function renderCircleRow(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const count = block.decoration?.kind === "circle-row" ? block.decoration.count : 0;
	let ticked = 0;
	let free = "";
	for (const pointer of block.paths) {
		const found = at(source, pointer);
		if (typeof found === "string") free = found;
		else ticked = Math.max(0, Number(scalar(found)) || 0);
	}
	const body = track(doc, add(box, doc, "div", "tracks"), block.label, "frame", free);
	circles(doc, body, count, Math.min(count, ticked));
}

/**
 * Wounds, as on the paper sheet: one panel per published column, separated by a dotted
 * divider; in each, one line per published duration with its circle on the left of the label, one of them ticked,
 * then the writing area where the wound is written.
 */
function renderWoundCircles(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const wounds = block.decoration?.kind === "wound-circles" ? block.decoration : undefined;
	if (!wounds) { renderUnknown(doc, box, block, source); return; }
	const side = asRecord(at(source, block.paths[0])) ?? {};
	const table = add(box, doc, "div", "wounds");
	for (const column of wounds.columns) {
		const entered = asRecord(side[column.key]) ?? {};
		const wound = add(table, doc, "div", "wound");
		for (const duration of wounds.durations) {
			const line = add(wound, doc, "div", "wound-line");
			circles(doc, line, wounds.circles, entered[duration] === true ? wounds.circles : 0);
			add(line, doc, "span", "wound-head", capitalize(duration));
		}
		add(wound, doc, "p", "wound-write", text(entered.notes)).classList.add(`${ROOT}__value`);
	}
}

/** Total des malus: the printed scale up to `to`, then the closing step; the current total is circled. */
function renderMalusScale(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const scale = block.decoration?.kind === "scale" ? block.decoration : undefined;
	if (!scale) { renderUnknown(doc, box, block, source); return; }
	const total = Number(scalar(at(source, block.paths[0]))) || 0;
	const frame = add(box, doc, "div", "scale");
	add(frame, doc, "span", "scale-label", block.label);
	const grid = add(frame, doc, "span", "scale-grid");
	for (let step = scale.from; step <= scale.to; step += 1) {
		const mark = add(grid, doc, "span", "scale-step", String(step));
		if (step === total) mark.classList.add(`${ROOT}__scale-step--current`);
	}
	const last = add(frame, doc, "span", "scale-step", scale.last);
	if (total > scale.to) last.classList.add(`${ROOT}__scale-step--current`);
}

/** A fixed table, printed as the presentation words it: the lines under the block title, nothing else. Plain blocks, so no table frame of the page leaks in. */
function renderReferenceTable(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const reference = block.referenceTable;
	if (!reference) return;
	const table = add(box, doc, "div", "ref-table");
	const body = add(table, doc, "div", "ref-body");
	// The weapons the character does not use stay on their line, struck out by typography alone: nothing is added to the line.
	const struck = strings(at(source, block.paths[0]));
	for (const line of reference.lines) {
		const row = add(body, doc, "div", "ref-row");
		if (struck.indexOf(line.name) >= 0) row.classList.add(`${ROOT}__ref-row--struck`);
		add(row, doc, "div", "ref-name", line.name);
		add(row, doc, "div", "ref-properties", line.properties);
	}
}

/** The rows of a pointer grid, a cell only when the document enters its value. */
function renderPointerRows(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	for (const row of block.pointerRows ?? []) {
		for (const cell of row) {
			const found = at(source, cell.path);
			if (isBlank(found)) continue;
			writeLine(doc, box, cell.label ?? humanize(lastSegment(cell.path)), text(found));
		}
	}
}

function renderNarrative(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	for (const pointer of block.paths) add(box, doc, "p", "narrative", text(at(source, pointer))).classList.add(`${ROOT}__value`);
}

function renderUnknown(doc: Document, box: HTMLElement, block: AdrenalinePresentationBlock, source: AdrenalineDocument): void {
	const form = block.form ?? "(none)";
	// The fallback marks its box: the warning below is given once per form, the mark on every block.
	box.classList.add(`${ROOT}__block--plain`);
	if (!reportedForms.has(form)) {
		reportedForms.add(form);
		log.warn(`PJ block form "${form}" has no dedicated rendering; block "${block.id}" is shown as plain lines.`);
	}
	for (const pointer of block.paths) writeLine(doc, box, humanize(lastSegment(pointer)), text(at(source, pointer)));
}

/* The cartouche prints its own banner label; formation columns print one subhead per column. */
// The Malus column prints its labels on the band of each frame, as the paper sheet does.
// The reference table prints its own first column head, which carries the block label.
const TITLED_ELSEWHERE = new Set(["name-card", "game-parameters", "formation-columns", "shock-circles", "circle-row", "malus-scale"]);

function titledElsewhere(block: AdrenalinePresentationBlock, sectionLabel: string): boolean {
	return TITLED_ELSEWHERE.has(block.form ?? "") || block.label === sectionLabel;
}

function renderBlock(doc: Document, block: AdrenalinePresentationBlock, sectionLabel: string, data: AdrenalinePjData, source: AdrenalineDocument, withNotes = true): HTMLElement {
	const box = node(doc, "div", block.id);
	box.classList.add(`${ROOT}__block`, `${ROOT}__form-${block.form ?? "none"}`, `${ROOT}__layout-${block.layout}`);
	if (block.columns) box.classList.add(`${ROOT}__block-columns-${block.columns}`);
	if (block.placement) {
		box.classList.add(`${ROOT}__col-${block.placement.column}`, `${ROOT}__row-${block.placement.row}`);
		if (block.placement.rowSpan) box.classList.add(`${ROOT}__row-span-${block.placement.rowSpan}`);
		if (block.placement.columnSpan) box.classList.add(`${ROOT}__col-span-${block.placement.columnSpan}`);
	}
	if (!titledElsewhere(block, sectionLabel)) subhead(doc, box, block.label);
	const body = block.form === "formation-columns" ? add(box, doc, "div", "block-grid") : block.form === "identity-fields" ? add(box, doc, "div", "field-rows") : box;
	switch (block.form) {
		case "name-card": renderNameCard(doc, box, block, source); break;
		case "game-parameters": renderGameParameters(doc, box, block, source); break;
		case "formation-columns": renderFormationColumns(doc, body, block, data); break;
		case "identity-fields": renderIdentityFields(doc, body, block, source); break;
		case "characteristic-rows": renderCharacteristicRows(doc, box, block, source); break;
		case "ruled-list": renderRuledList(doc, box, block, source); break;
		case "weapon-lines": renderWeaponLines(doc, box, block, source); break;
		case "location-grid": renderLocationGrid(doc, box, block, source); break;
		case "stress-dice": renderStressDice(doc, box, block, source); break;
		case "threshold-rows": renderThresholdRows(doc, box, block, source); break;
		case "status-frames": renderStatusFrames(doc, box, block, source); break;
		case "shock-circles": renderShockCircles(doc, box, block, source); break;
		case "circle-row": renderCircleRow(doc, box, block, source); break;
		case "wound-circles": renderWoundCircles(doc, box, block, source); break;
		case "malus-scale": renderMalusScale(doc, box, block, source); break;
		case "reference-table": renderReferenceTable(doc, box, block, source); break;
		case "compact-rows": renderPointerRows(doc, box, block, source); break;
		case "narrative": renderNarrative(doc, box, block, source); break;
		default: renderUnknown(doc, box, block, source);
	}
	if (withNotes) for (const note of block.notes ?? []) add(box, doc, "p", "block-note", note);
	return box;
}

/** The ☣ mark between the name and the game parameters, read from the published variant and sheet label. */
function renderBrand(doc: Document, subtitle: string): HTMLElement {
	const brand = node(doc, "div", "brand");
	add(brand, doc, "strong", "brand-name", `☣ ${capitalize(PJ_PRESENTATION.appearance.variant)}`);
	add(brand, doc, "span", "brand-sheet", PJ_PRESENTATION.sheet.label);
	if (subtitle) add(brand, doc, "span", "brand-subtitle", subtitle);
	return brand;
}

/** Whether the document enters anything for a block; fixed-text blocks (the reference table) always count. */
function entered(block: AdrenalinePresentationBlock, source: AdrenalineDocument): boolean {
	if (block.referenceTable) return true;
	// The identity table prints its own fields only: what the other blocks of the section enter does not fill it.
	if (block.form === "identity-fields") {
		const identity = asRecord(at(source, block.paths[0])) ?? {};
		return fieldRows(block).some((row) => row.some((key) => !isBlank(identity[key])));
	}
	const pointers = block.pointerRows ? block.pointerRows.reduce<string[]>((all, row) => all.concat(row.map((cell) => cell.path)), []) : block.paths;
	return pointers.some((pointer) => !isBlank(at(source, pointer)));
}

/** Dans une section à plusieurs colonnes, la note d'un bloc court sur toutes les colonnes. */
function liftsNotes(section: AdrenalinePresentationSection, block: AdrenalinePresentationBlock): boolean {
	const columns = section.columns ?? 1;
	return section.layout === "columns" && columns > 1 && block.placement !== undefined && (block.placement.columnSpan ?? 1) < columns;
}

function renderSection(doc: Document, section: AdrenalinePresentationSection, data: AdrenalinePjData, source: AdrenalineDocument): HTMLElement | null {
	const blocks = [...section.blocks].sort((a, b) => a.order - b.order).filter((block) => !section.collapsible || entered(block, source));
	// A collapsible section prints nothing when nothing is entered in it.
	if (section.collapsible && blocks.length === 0) return null;
	const container = node(doc, section.collapsible ? "details" : "section", "section");
	/* Neighbouring sections of one published row share it, in thirds of the sheet (schema-adrenaline 2.7.0). */
	const span = (section as { row?: { span?: unknown } }).row?.span;
	container.classList.add(`${ROOT}__span-${span === 1 || span === 2 ? span : 3}`);
	if (section.collapsible) container.classList.add(`${ROOT}__section--collapsible`);
	if (section.showTitle !== false) add(container, doc, section.collapsible ? "summary" : "h4", "section-title", section.label);
	const body = add(container, doc, "div", "section-body");
	body.classList.add(`${ROOT}__columns-${section.columns ?? 1}`, `${ROOT}__layout-${section.layout}`);
	for (const block of blocks) {
		if (block.form === "game-parameters") {
			const subtitle = (block.subtitlePaths ?? []).map((pointer) => { const raw = text(at(source, pointer)); return PARAMETER_VALUES[raw] ?? raw; }).filter(Boolean).join(" · ");
			body.appendChild(renderBrand(doc, subtitle));
		}
		body.appendChild(renderBlock(doc, block, section.label, data, source, !liftsNotes(section, block)));
	}
	// Dans une section à colonnes, la note d'un bloc court sur toute la largeur de la section, centrée.
	for (const block of blocks) if (liftsNotes(section, block)) for (const note of block.notes ?? []) add(body, doc, "p", "block-note", note);
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
	const builders: Record<string, () => HTMLElement | null> = {};
	for (const section of PJ_PRESENTATION.sections) builders[section.id] = () => renderSection(doc, section, data, source);
	renderZones(root, adrenalinePjShape, builders);
	return root;
}
