import { setIcon } from "obsidian";
import type { PublishedBlock, PublishedPresentation, PublishedSection } from "./publishedPresentation";
import { logScope } from "../../utils/logger";
import { asRecord, readCurrentValue, type AdrenalineDocument } from "./document";

/**
 * The compact card of the Zombiology booklets, drawn from a published
 * presentation (`surface: "compact-card"`): a banner coloured by category, then
 * the sections in their published order, each under its title band. Titles are
 * not headings: the card must not take the page's heading styles. Every printed value is read from the
 * document as entered; the card computes nothing (no total, no track).
 */
const CARD = "brumes-adrenaline-card";
const log = logScope("adrenaline-card");
const reportedForms = new Set<string>();

/* Labels the published presentation leaves to the consumer: field names and enum values. */
const FIELD_LABELS: Record<string, string> = {
	zoneDeDetection: "Zone de détection", deplacement: "Dépl.", malusAvantHs: "Malus avant HS",
	possessions: "Possessions", equipementFavori: "Équipement favori", armesPhysiques: "Armes physiques", armesPsychologiques: "Armes psychologiques",
	role: "Rôle", attitude: "Attitude", personnalite: "Personnalité", historique: "Historique", evolutionPossible: "Évolution possible",
	interpretation: "Interprétation", repliques: "Répliques", notesMj: "Notes du meneur",
	agent: "Agent", vecteurs: "Vecteurs", delaiAvantEffet: "Délai avant effet", issue: "Issue", modulations: "Modulations",
};
const THRESHOLDS: readonly (readonly [string, string])[] = [["superficiel", "Superficiel"], ["leger", "Léger"], ["grave", "Grave"], ["profond", "Profond"]];
const HEALTH_SIDES: readonly (readonly [string, string])[] = [["physique", "SP"], ["mental", "SM"]];
/* Key, label, then the modifier that picks the track's colour token (stress keeps the ink). */
const TRACKS: readonly (readonly [string, string, string])[] = [["stress", "Stress", "stress"], ["malusChoquants", "Malus choquants", "shock"], ["malusBlessants", "Malus blessants", "wound"]];
const DEFENSE_LEVELS: Record<string, string> = { oui: "Oui", expose: "Exposé", non: "Non" };

/** The creature state a card prints, named and triggered as entered. */
export interface CompactCardState {
	/** The card this state is printed on (`principal`, `secondaire`), as the presentation names it. */
	card: string;
	name: string;
	triggers: string[];
	/** True on the card of the state the creature is in (`etatActif`). */
	active: boolean;
	note?: string;
}

/** What the section of a card is printed with: the card, and the section joined behind it. */
export interface CompactSectionContext {
	state?: CompactCardState;
	card?: string;
	/** A section printed right after this one, under one title (`joinedTo`). */
	join?: { section: PublishedSection; title: string };
}

function node(doc: Document, tag: string, className: string, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	result.classList.add(`${CARD}__${className}`);
	if (text !== undefined) result.textContent = text;
	return result;
}

function add(parent: HTMLElement, doc: Document, tag: string, className: string, text?: string): HTMLElement {
	return parent.appendChild(node(doc, tag, className, text));
}

export function at(source: AdrenalineDocument, pointer: string): unknown {
	return pointer.slice(1).split("/").reduce<unknown>((found, key) => asRecord(found)?.[key], source);
}

function lastSegment(pointer: string): string {
	return pointer.split("/").pop() ?? "";
}

function humanize(key: string): string {
	const spaced = key.replace(/-/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function label(key: string): string {
	return FIELD_LABELS[key] ?? humanize(key);
}

/** A string as entered, or the current value of a bounded number. */
function text(found: unknown, suffix = ""): string {
	if (typeof found === "string") return found;
	const shown = readCurrentValue(found);
	return shown === undefined ? "" : `${shown}${suffix}`;
}

function strings(found: unknown): string[] {
	return Array.isArray(found) ? found.filter((item): item is string => typeof item === "string" && item !== "") : [];
}

function records(found: unknown): AdrenalineDocument[] {
	return Array.isArray(found) ? found.map(asRecord).filter((item): item is AdrenalineDocument => item !== undefined) : [];
}

export function isEmpty(found: unknown): boolean {
	if (found === undefined || found === null || found === "") return true;
	if (Array.isArray(found)) return found.length === 0;
	const record = asRecord(found);
	return record ? Object.keys(record).length === 0 : false;
}

function joined(parts: readonly string[], separator = " · "): string {
	return parts.filter(Boolean).join(separator);
}

/** A labelled line; `figure` marks a number, which the published `values.align` places on its line. */
function line(doc: Document, parent: HTMLElement, name: string, content: string, figure = false): HTMLElement | undefined {
	if (!content) return undefined;
	const row = add(parent, doc, "div", "line");
	add(row, doc, "b", "line-label", name);
	const value = add(row, doc, "span", "value", content);
	if (figure) value.classList.add(`${CARD}__figure`);
	return row;
}

/** The damage of a skill or an action: the dice in a badge, then its properties as entered. */
function damage(doc: Document, parent: HTMLElement, found: unknown): void {
	const degats = asRecord(found);
	if (!degats) return;
	const group = add(parent, doc, "span", "damage");
	const versant = text(degats.versant);
	if (versant) group.classList.add(`${CARD}__damage--${versant}`);
	records(degats.profils).forEach((profile, index) => {
		if (index > 0) add(group, doc, "span", "damage-link", text(degats.liant) || "ou");
		add(group, doc, "span", "dice-badge", text(profile.des));
		const detail = joined([text(profile.nature), text(profile.condition)], " ");
		if (detail) add(group, doc, "span", "damage-detail", detail);
	});
	const extra = joined([...strings(degats.proprietes), text(degats.munitions) && `Munitions ${text(degats.munitions)}`, text(degats.portee) && `Portée ${text(degats.portee)}`], ", ");
	if (extra) add(group, doc, "span", "damage-detail", extra);
}

/**
 * `Arme à feu (Pistolet) 40 % + DEX`, then its figure `70 %`: each part only
 * when entered. Without a total, the entered score is the figure.
 */
function skillParts(skill: AdrenalineDocument): [string, string] {
	const name = text(skill.specialite) ? `${text(skill.nom)} (${text(skill.specialite)})` : text(skill.nom);
	const score = text(skill.pourcentage, " %");
	const characteristic = text(skill.caracteristique).toUpperCase();
	const total = text(skill.total, " %");
	if (!total) return [joined([name, characteristic && `+ ${characteristic}`], " "), score];
	return [joined([name, score, characteristic && `+ ${characteristic}`], " "), total];
}

/** The same skill on one run of text, for an action's test: `… 40 % + DEX = 70 %`. */
function skillText(skill: AdrenalineDocument): string {
	const [name, figure] = skillParts(skill);
	return joined([name, figure && (text(skill.total) ? `= ${figure}` : figure)], " ");
}

function skillLine(doc: Document, parent: HTMLElement, skill: AdrenalineDocument): HTMLElement {
	const row = add(parent, doc, "div", "skill");
	const [name, figure] = skillParts(skill);
	const head = add(row, doc, "div", "skill-head");
	add(head, doc, "span", "skill-name", name);
	if (figure) add(head, doc, "span", "value", figure).classList.add(`${CARD}__figure`);
	damage(doc, row, skill.degats);
	const notes = joined([strings(skill.avantages).length ? `Avantage : ${strings(skill.avantages).join(", ")}` : "", text(skill.action), text(skill.notes)]);
	if (notes) add(row, doc, "span", "note", notes);
	return row;
}

function renderNameCard(doc: Document, box: HTMLElement, block: PublishedBlock, source: AdrenalineDocument, presentation: PublishedPresentation): void {
	const categories = presentation.categories;
	const category = text(at(source, categories?.path ?? "/categorie"));
	const shown = category || categories?.fallbackLabel || block.label;
	const icon = (categories && (categories.icons[shown] ?? categories.defaultIcon)) ?? "";
	add(add(box, doc, "div", "banner-category"), doc, "span", "banner-label", shown);
	const identity = add(box, doc, "div", "banner-identity");
	if (icon) {
		const mark = add(identity, doc, "span", "banner-icon");
		mark.dataset.icon = icon;
		setIcon(mark, icon);
	}
	const heading = add(identity, doc, "div", "banner-heading");
	add(heading, doc, "strong", "banner-name", text(at(source, "/nom")));
	const subtitle = (block.subtitlePaths ?? []).map((pointer) => text(at(source, pointer))).filter(Boolean).join(" ");
	if (subtitle) add(heading, doc, "div", "banner-subtitle", subtitle);
	const danger = text(at(source, "/niveauDeDanger"));
	const alternate = text(at(source, "/niveauDeDangerAlternatif"));
	const note = text(at(source, "/niveauDeDangerNote"));
	// The note is called by an asterisk on the first level printed, as the contract describes it.
	const call = note ? "*" : "";
	const levels = danger ? [danger + call, alternate] : [danger, alternate ? alternate + call : alternate];
	if (danger || alternate) add(identity, doc, "span", "banner-danger", `ND ${joined(levels, " / ")}`);
	if (note) add(box, doc, "span", "banner-note", `* ${note}`);
}

function renderNarrative(doc: Document, box: HTMLElement, found: unknown): void {
	if (typeof found === "string") {
		add(box, doc, "p", "paragraph", found);
		return;
	}
	if (Array.isArray(found)) {
		const list = add(box, doc, "ul", "list");
		for (const item of strings(found)) add(list, doc, "li", "list-item", item);
		for (const record of records(found)) add(list, doc, "li", "list-item", summary(record));
		return;
	}
	const record = asRecord(found) ?? {};
	for (const key of Object.keys(record)) {
		const item = record[key];
		if (Array.isArray(item) && records(item).length > 0) line(doc, box, label(key), records(item).map(summary).join(" ; "));
		else line(doc, box, label(key), Array.isArray(item) ? strings(item).join(", ") : text(item));
	}
}

/** A nested record printed on one line: its entered values, in document order. */
function summary(record: AdrenalineDocument): string {
	return joined(Object.keys(record).map((key) => {
		const item = record[key];
		return Array.isArray(item) ? strings(item).join(", ") : text(item, key === "probabilite" ? " %" : "");
	}));
}

/** The rows the presentation publishes: a cell is printed only when its value is entered. */
function renderPointerRows(doc: Document, box: HTMLElement, rows: NonNullable<PublishedBlock["pointerRows"]>, source: AdrenalineDocument, columns = 1): void {
	const grid = add(box, doc, "div", "grid");
	grid.classList.add(`${CARD}__grid--columns-${columns}`);
	rows.forEach((row, rowIndex) => {
		row.forEach((entry, columnIndex) => {
			const found = at(source, entry.path);
			if (isEmpty(found)) return;
			const cell = add(grid, doc, "div", "cell");
			cell.classList.add(`${CARD}__row-${rowIndex + 1}`, `${CARD}__col-${columnIndex + 1}`);
			// Only the sigle of a characteristic (no published label) is bold.
			if (entry.label === undefined) add(cell, doc, "b", "line-label", lastSegment(entry.path).toUpperCase());
			else add(cell, doc, "span", "line-label", entry.label);
			add(cell, doc, "span", "value", text(found, entry.path.indexOf("/caracteristiques/") === 0 ? " %" : ""));
		});
	});
}

function renderCompactRows(doc: Document, box: HTMLElement, pointer: string, found: unknown): void {
	const key = lastSegment(pointer);
	if (key === "caracteristiques") {
		const grid = add(box, doc, "div", "grid");
		const record = asRecord(found) ?? {};
		for (const name of Object.keys(record)) {
			const cell = add(grid, doc, "div", "cell");
			add(cell, doc, "b", "line-label", name.toUpperCase());
			add(cell, doc, "span", "value", text(record[name], " %"));
		}
		return;
	}
	if (Array.isArray(found)) {
		const list = add(box, doc, "div", "rows");
		for (const record of records(found)) line(doc, list, joined([text(record.nom), text(record.type) && `(${text(record.type)})`], " "), text(record.pourcentage, " %"), true);
		return;
	}
	line(doc, box, label(key), text(found));
}

function renderThresholds(doc: Document, box: HTMLElement, found: unknown): void {
	const health = asRecord(found) ?? {};
	for (const [side, short] of HEALTH_SIDES) {
		const thresholds = asRecord(health[side]);
		if (!thresholds) continue;
		const row = add(box, doc, "div", "thresholds");
		add(row, doc, "b", "line-label", short);
		let printed = 0;
		for (const [key, name] of THRESHOLDS) {
			const threshold = asRecord(thresholds[key]);
			const base = text(threshold?.base);
			if (!base) continue;
			const covered = text(threshold?.couvert);
			// `SP 7 / 14 / 19 / 24`: the numbers as entered, a slash between them, each kept whole.
			if (printed > 0) add(row, doc, "span", "threshold-separator", "/");
			printed += 1;
			const cell = add(row, doc, "span", "threshold", covered ? `${base} (${covered})` : base);
			cell.classList.add(`${CARD}__value`);
			cell.dataset.threshold = name;
		}
	}
}

function reduction(found: unknown): string {
	const record = asRecord(found);
	if (!record) return "";
	const against = strings(record.contre);
	return joined([`−${text(record.valeur)}`, against.length ? `contre ${against.join(", ")}` : ""], " ");
}

function renderProtections(doc: Document, box: HTMLElement, found: unknown): void {
	const protections = asRecord(found) ?? {};
	for (const [sideKey, coverKey, name, nameKey] of [["physiques", "armure", "Armure", "nom"], ["mentales", "caractere", "Caractère", "trait"]] as const) {
		const side = asRecord(protections[sideKey]);
		if (!side) continue;
		line(doc, box, `Solidité ${sideKey === "physiques" ? "physique" : "mentale"}`, text(side.solidite), true);
		const cover = asRecord(side[coverKey]);
		if (cover) line(doc, box, name, joined([
			text(cover[nameKey]),
			text(cover.couverture),
			text(cover.des).replace("-", "−"),
			strings(cover.emotions).join(", "),
			reduction(cover.reduction),
			strings(cover.proprietes).join(", "),
			text(cover.points) && `${text(cover.points)} points`,
			strings(cover.localisations).map((place) => place.replace(/-/g, " ")).join(", "),
		]));
		const shield = asRecord(side.bouclier);
		if (shield) line(doc, box, "Bouclier", joined([text(shield.nom), strings(shield.proprietes).join(", ")]));
	}
}

/** Ten circles per track, the entered count bold; stress shows the published default when absent. */
function renderTracks(doc: Document, box: HTMLElement, block: PublishedBlock, found: unknown): void {
	const published = block.decoration?.kind === "malus-tracks" ? block.decoration : undefined;
	const decoration = { length: published?.length ?? 10, stressDefault: published?.stressDefault ?? 2 };
	const tracks = asRecord(found) ?? {};
	for (const [key, name, modifier] of TRACKS) {
		const entered = readCurrentValue(tracks[key]);
		const bold = entered ?? (key === "stress" ? decoration.stressDefault : 0);
		const row = add(box, doc, "div", "track");
		row.classList.add(`${CARD}__track--${modifier}`);
		add(row, doc, "b", "line-label", name);
		const circles = add(row, doc, "span", "circles");
		for (let index = 0; index < decoration.length; index += 1) add(circles, doc, "i", index < bold ? "circle-bold" : "circle").classList.add(`${CARD}__circle-mark`);
	}
}

/** One empty circle per entered malus, then `HS`: the count is read as entered, never derived. */
function renderMalusCircles(doc: Document, box: HTMLElement, found: unknown): void {
	const count = Number(text(found));
	if (!Number.isInteger(count) || count < 0) { line(doc, box, "Malus", text(found)); return; }
	const row = add(box, doc, "div", "track");
	add(row, doc, "b", "line-label", "Malus");
	const circles = add(row, doc, "span", "circles");
	for (let index = 0; index < count; index += 1) add(circles, doc, "i", "circle").classList.add(`${CARD}__circle-mark`);
	add(row, doc, "b", "hs", "HS");
}

/** `name` puts the block's label before its items, for a list that stands on a row of its own ("État"). */
function renderInlineList(doc: Document, box: HTMLElement, found: unknown, name?: string): void {
	const record = asRecord(found);
	const items = record
		? Object.keys(record).reduce<string[]>((all, key) => {
			const item = record[key];
			if (typeof item === "string") return all.concat(`${label(key)} : ${item}`);
			return all.concat(strings(item), records(item).map((weapon) => joined([text(weapon.nom), text(weapon.type), text(weapon.pourcentage, " %"), text(weapon.notes)], " ")));
		}, [])
		: strings(found);
	if (name) {
		line(doc, box, name, items.join(" · "));
		return;
	}
	add(box, doc, "p", "inline-list", items.join(" · "));
}

/** The combat row: `<n>/round` and `<niveau> (<bonus> bonus)`, each behind the published label of its path. */
function renderCombat(doc: Document, box: HTMLElement, block: PublishedBlock, source: AdrenalineDocument): void {
	const defense = asRecord(at(source, "/defense"));
	const level = text(defense?.niveau);
	const legacy = typeof defense?.active === "boolean" ? (defense.active ? "oui" : "non") : "";
	const bonus = text(defense?.bonus);
	const actions = text(at(source, "/actionsParRound"));
	const values: Record<string, string> = {
		"/actionsParRound": actions && `${actions}/round`,
		"/defense": joined([DEFENSE_LEVELS[level || legacy] ?? level, bonus && `(${bonus} bonus)`], " "),
	};
	// A declared field is never hidden: the free note follows the published form, free to wrap.
	const notes: Record<string, string> = { "/defense": text(defense?.notes) };
	const grid = add(box, doc, "div", "grid");
	grid.classList.add(`${CARD}__grid--columns-${block.columns ?? 1}`);
	block.paths.forEach((pointer, index) => {
		if (!values[pointer] && !notes[pointer]) return;
		const cell = add(grid, doc, "div", "cell");
		add(cell, doc, "b", "line-label", block.rowLabels?.[index] ?? humanize(lastSegment(pointer)));
		if (values[pointer]) add(cell, doc, "span", "value", values[pointer]);
		if (notes[pointer]) add(cell, doc, "span", "note", notes[pointer]);
	});
}

function renderAction(doc: Document, parent: HTMLElement, action: AdrenalineDocument, follow: boolean): void {
	const row = add(parent, doc, "div", follow ? "follow-up" : "action");
	for (const condition of strings(action.conditions)) add(row, doc, "span", "trigger", condition);
	const test = asRecord(action.test);
	const name = joined([text(action.nom), test ? skillText(test) : ""], " — ");
	if (name) add(row, doc, "span", "skill-name", name);
	damage(doc, row, action.degats ?? (action.desDeDegats !== undefined ? { profils: [{ des: `${text(action.desDeDegats)}d10` }] } : undefined));
	const effects = joined([...strings(action.effets), text(action.notes)]);
	if (effects) add(row, doc, "span", "note", effects);
	for (const next of records(action.suites)) renderAction(doc, row, next, true);
}

function renderStatus(doc: Document, box: HTMLElement, found: unknown): void {
	if (Array.isArray(found)) {
		for (const state of records(found)) line(doc, box, text(state.nom) || "État", joined([text(state.versant), text(state.localisation).replace(/-/g, " "), text(state.duree), text(state.notes)]));
		return;
	}
	renderNarrative(doc, box, found);
}

/**
 * The head of a state: its name on a title band, the box of the current state at
 * the side of the band the published decoration names (`current.position`; never
 * interactive: the sheet records `etatActif`, the card does not change it), then
 * each trigger behind its marker, bare.
 */
function renderStateHeader(doc: Document, box: HTMLElement, state: CompactCardState, block: PublishedBlock): void {
	const badge = block.decoration?.kind === "state-badge" ? block.decoration : undefined;
	const head = add(box, doc, "div", "state-name");
	const hasCheck = (badge?.current?.cards ?? []).indexOf(state.card) >= 0;
	const check = node(doc, "span", "state-check");
	if (hasCheck) {
		check.setAttribute("role", "checkbox");
		check.setAttribute("aria-label", "État actuel");
		check.setAttribute("aria-checked", state.active ? "true" : "false");
		check.setAttribute("aria-disabled", "true");
		if (state.active) check.classList.add(`${CARD}__state-check--checked`);
	}
	const atEnd = badge?.current?.position === "end";
	if (hasCheck && !atEnd) head.appendChild(check);
	add(head, doc, "strong", "state-label", state.name);
	if (hasCheck && atEnd) head.appendChild(check);
	for (const trigger of state.triggers) {
		const row = add(box, doc, "span", "trigger-row");
		if (badge?.triggerMarker) add(row, doc, "i", "trigger-marker");
		add(row, doc, "span", "state-trigger", trigger);
	}
	if (state.note) add(box, doc, "span", "note", state.note);
}

/** The cell a block takes in its section's grid, as published (`placement`), read like the PJ sheet reads it. */
function placeBlock(box: HTMLElement, block: PublishedBlock): void {
	const place = block.placement;
	if (!place) return;
	box.classList.add(`${CARD}__col-${place.column}`, `${CARD}__row-${place.row}`);
	if (place.rowSpan) box.classList.add(`${CARD}__row-span-${place.rowSpan}`);
	if (place.columnSpan) box.classList.add(`${CARD}__col-span-${place.columnSpan}`);
}

function renderBlock(doc: Document, block: PublishedBlock, source: AdrenalineDocument, presentation: PublishedPresentation, state?: CompactCardState, section?: PublishedSection): HTMLElement | null {
	if (block.form === "state-header") {
		if (!state) return null;
		const header = node(doc, "div", "block");
		header.classList.add(`${CARD}__form-state-header`, `${CARD}__block-${block.id}`);
		renderStateHeader(doc, header, state, block);
		return header;
	}
	const values = block.paths.map((pointer) => at(source, pointer));
	const always = block.form === "name-card" || block.form === "malus-tracks";
	if (!always && values.every(isEmpty)) return null;
	const box = node(doc, "div", "block");
	box.classList.add(`${CARD}__form-${block.form ?? "none"}`, `${CARD}__block-${block.id}`);
	placeBlock(box, block);
	const [pointer] = block.paths;
	switch (block.form) {
		case "name-card": renderNameCard(doc, box, block, source, presentation); break;
		case "narrative":
			// A narrative block that does not carry its section's title says what it holds ("Traits spéciaux").
			if (section && block.label.trim().toLowerCase() !== section.label.trim().toLowerCase()) add(box, doc, "b", "line-label", block.label);
			renderNarrative(doc, box, values[0]);
			break;
		case "compact-rows":
			if (block.pointerRows) renderPointerRows(doc, box, block.pointerRows, source, block.columns);
			else renderCompactRows(doc, box, pointer, values[0]);
			break;
		case "threshold-rows": renderThresholds(doc, box, values[0]); break;
		case "protection-lines": renderProtections(doc, box, values[0]); break;
		case "malus-tracks": renderTracks(doc, box, block, values[0]); break;
		case "malus-circles": renderMalusCircles(doc, box, values[0]); break;
		case "status-frames": renderStatus(doc, box, values[0]); break;
		case "skill-lines": for (const skill of records(values[0])) skillLine(doc, box, skill); break;
		case "inline-list": renderInlineList(doc, box, values[0], block.placement ? block.label : undefined); break;
		case "combat": renderCombat(doc, box, block, source); break;
		case "action-lines": for (const action of records(values[0])) renderAction(doc, box, action, false); break;
		default: {
			const form = block.form ?? "(none)";
			// The fallback marks its box: the warning below is given once per form, the mark on every block.
			box.classList.add(`${CARD}__block--plain`);
			if (!reportedForms.has(form)) {
				reportedForms.add(form);
				log.warn(`Compact card form "${form}" has no dedicated rendering; block "${block.id}" is shown as plain lines.`);
			}
			block.paths.forEach((path, index) => line(doc, box, label(lastSegment(path)), text(values[index])));
		}
	}
	return box;
}

/** A section's printed title: its label, then the value named by `labelFrom` — `Corps (Corps faible)`. */
function sectionTitle(section: PublishedSection, source: AdrenalineDocument): string {
	const from = section.labelFrom ? text(at(source, section.labelFrom)) : "";
	return from ? `${section.label} (${from})` : section.label;
}

/** The blocks of a section that print on `card` (a block with no `cards` prints on every card of its section). */
function renderSectionBlocks(doc: Document, section: PublishedSection, source: AdrenalineDocument, presentation: PublishedPresentation, context: CompactSectionContext): HTMLElement[] {
	return [...section.blocks].sort((a, b) => a.order - b.order)
		.filter((block) => !block.cards || context.card === undefined || block.cards.indexOf(context.card) >= 0)
		.map((block) => renderBlock(doc, block, source, presentation, context.state, section))
		.filter((box): box is HTMLElement => box !== null);
}

/**
 * The blocks of a section, in a body of their own when the section places them
 * on a grid: a joined section's blocks then keep the flow of the card.
 */
function appendBlocks(doc: Document, container: HTMLElement, section: PublishedSection, blocks: HTMLElement[]): void {
	const placed = section.layout === "grid" && section.blocks.some((block) => block.placement !== undefined);
	const body = placed ? add(container, doc, "div", "placed") : container;
	if (placed) body.classList.add(`${CARD}__placed--columns-${section.columns ?? 1}`);
	for (const box of blocks) body.appendChild(box);
}

/**
 * One published section, or null when none of its blocks has a value to print.
 * `context.card` keeps the blocks that card prints; `context.join` is the
 * section printed right after this one under the title `joinedTo` gives.
 */
export function renderCompactSection(doc: Document, section: PublishedSection, source: AdrenalineDocument, presentation: PublishedPresentation, context: CompactSectionContext = {}): HTMLElement | null {
	const blocks = renderSectionBlocks(doc, section, source, presentation, context);
	const joinedBlocks = context.join ? renderSectionBlocks(doc, context.join.section, source, presentation, context) : [];
	if (blocks.length === 0 && joinedBlocks.length === 0) return null;
	const container = node(doc, section.collapsible ? "details" : "section", "section");
	container.classList.add(`${CARD}__section-${section.id}`, `${CARD}__layout-${section.layout}`);
	if (context.join) container.classList.add(`${CARD}__section-${context.join.section.id}`, `${CARD}__section--joined`);
	const title = context.join ? context.join.title : sectionTitle(section, source);
	if (section.collapsible) add(container, doc, "summary", "section-title", title);
	else if (section.showTitle !== false && section.layout !== "banner") add(container, doc, "div", "section-title", title);
	appendBlocks(doc, container, section, blocks);
	if (context.join) appendBlocks(doc, container, context.join.section, joinedBlocks);
	return container;
}

/** The article every compact card hangs from: the sheet root, the shared card class, the banner variant. */
export function compactCardRoot(doc: Document, root: string, presentation: PublishedPresentation, source: AdrenalineDocument): HTMLElement {
	const article = doc.createElement("article");
	article.classList.add(root, CARD, `${CARD}--${presentation.appearance.surface}`, `${CARD}--values-${presentation.appearance.values.align}`);
	const categories = presentation.categories;
	if (categories) {
		const category = text(at(source, categories.path));
		article.classList.add(`${CARD}--banner-${categories.variants[category] ?? categories.defaultVariant}`);
	}
	return article;
}

export const COMPACT_CARD_CLASS = CARD;

/** An element of the card vocabulary, for the creature's card frames. */
export function compactCardElement(doc: Document, tag: string, className: string): HTMLElement {
	return node(doc, tag, className);
}
