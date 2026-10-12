import { MONSTRE_PRESENTATION } from "schema-adrenaline/presentation";
import { adrenalineSourceDocument, asRecord, type AdrenalineDocument } from "../adrenaline/document";
import { at, COMPACT_CARD_CLASS, compactCardElement, compactCardRoot, isEmpty, renderCompactSection, type CompactCardState } from "../adrenaline/compactCard";
import type { PublishedCard, PublishedSection } from "../adrenaline/publishedPresentation";
import { renderZones, type ZoneBuilder } from "../blocks/shape";
import { logScope } from "../../utils/logger";
import { AdrenalineMonsterData } from "./parser";
import { monsterToDocument } from "./schema";
import { adrenalineMonsterShape, MONSTER_CARD_SECTIONS, MONSTER_SECTIONS } from "./shape";

const log = logScope("Adrenaline");
const BASE = "base";
const LEGACY_STATE = "alternatif-historique";
const STATE_KEYS = ["etatActif", "etatAlternatif", "etats"];

interface MonsterState {
	id: string;
	nom: string;
	declencheurs: string[];
	delta: AdrenalineDocument;
	notes?: string;
}

type CardId = "principal" | "secondaire";

interface StateCard {
	card: CardId;
	source: AdrenalineDocument;
	state: CompactCardState;
}

function strings(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item !== "") : [];
}

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

/** The base of the creature: the document without its alternative states. */
function baseOf(source: AdrenalineDocument): AdrenalineDocument {
	const base: AdrenalineDocument = {};
	for (const key of Object.keys(source)) if (STATE_KEYS.indexOf(key) < 0) base[key] = source[key];
	return base;
}

/** The entered states; the legacy `etatAlternatif` reads as one state whose characteristics overlay the base. */
function statesOf(source: AdrenalineDocument): MonsterState[] {
	const legacy = asRecord(source.etatAlternatif);
	if (legacy) {
		const delta: AdrenalineDocument = {};
		const characteristics = asRecord(legacy.caracteristiques);
		if (characteristics) delta.caracteristiques = { ...(asRecord(source.caracteristiques) ?? {}), ...characteristics };
		for (const key of ["zoneDeDetection", "deplacement", "actionsParRound"]) if (legacy[key] !== undefined) delta[key] = legacy[key];
		const notes = text(legacy.notes);
		return [{ id: LEGACY_STATE, nom: text(legacy.nom) || "État alternatif", declencheurs: strings(legacy.declencheurs), delta, ...(notes ? { notes } : {}) }];
	}
	const states: MonsterState[] = [];
	for (const item of Array.isArray(source.etats) ? source.etats : []) {
		const state = asRecord(item);
		const id = text(state?.id);
		if (!state || !id) continue;
		states.push({ id, nom: text(state.nom) || id, declencheurs: strings(state.declencheurs), delta: asRecord(state.delta) ?? {} });
	}
	return states;
}

/** The path the published `state-badge` binds the current state to (`/etatActif`), if the contract publishes one. */
function currentStatePath(): string | undefined {
	for (const section of MONSTER_SECTIONS) {
		for (const block of section.blocks) {
			if (block.decoration?.kind === "state-badge") return block.decoration.current?.path;
		}
	}
	return undefined;
}

/**
 * A card exists when the presentation declares it and, if it names `existsWhenAny`,
 * the document enters a value at one of those pointers. A presentation that
 * declares no card leaves every resolvable state its card.
 */
function cardExists(source: AdrenalineDocument, card: CardId): boolean {
	const published: readonly PublishedCard[] | undefined = (MONSTRE_PRESENTATION as { readonly cards?: readonly PublishedCard[] }).cards;
	if (!published) return true;
	const declared = published.filter((candidate) => candidate.id === card)[0];
	if (!declared) return false;
	return declared.existsWhenAny === undefined || declared.existsWhenAny.some((pointer) => !isEmpty(at(source, pointer)));
}

/**
 * The current state, as the schema says: absent or `base` designates the base,
 * a known id designates that state, any other id designates none (and is
 * reported). A creature without a state besides its base has no current state.
 */
function currentState(source: AdrenalineDocument, states: readonly MonsterState[]): string | undefined {
	const path = currentStatePath();
	const entered = path ? text(at(source, path)) : "";
	if (entered === "" || entered === BASE) return states.length === 0 ? undefined : BASE;
	if (states.some((state) => state.id === entered)) return entered;
	log.warn(`Current state "${entered}" is neither "${BASE}" nor an entered state: no card is marked as current.`);
	return undefined;
}

/**
 * The principal card prints `etatPrincipal`, or the base; the secondary card
 * prints the other one: the base when the principal is a state, else the first
 * state. Whether it is printed is the presentation's (`cards[].existsWhenAny`).
 * A state overlays the base field by field, as entered.
 */
function stateCards(source: AdrenalineDocument): StateCard[] {
	const base = baseOf(source);
	const states = statesOf(source);
	const known = (id: string): boolean => id === BASE || states.some((state) => state.id === id);
	const principal = known(text(source.etatPrincipal)) ? text(source.etatPrincipal) : BASE;
	const secondary = principal !== BASE ? BASE : states.length > 0 ? states[0].id : undefined;
	const current = currentState(source, states);
	const baseState = asRecord(source.etatDeBase);
	const resolve = (card: CardId, id: string): StateCard => {
		const state = states.filter((candidate) => candidate.id === id)[0];
		// The published state enters its note in its delta; the legacy form entered it beside.
		const note = text(state?.notes) || text(state?.delta.notes);
		return {
			card,
			source: state ? { ...base, ...state.delta } : base,
			state: {
				card,
				name: state ? state.nom : text(baseState?.nom) || "État de base",
				triggers: state ? state.declencheurs : strings(baseState?.declencheurs),
				active: current === id,
				...(note ? { note } : {}),
			},
		};
	};
	const cards = [resolve("principal", principal)];
	if (secondary !== undefined) cards.push(resolve("secondaire", secondary));
	return cards.filter((candidate) => cardExists(source, candidate.card));
}

/**
 * The sections one card prints, in published order: those that name it, and
 * those whose cards are all absent and that fall back on it.
 */
function sectionsOf(card: CardId, existing: readonly CardId[]): PublishedSection[] {
	return MONSTER_CARD_SECTIONS.filter((section) => {
		const named = section.cards ?? [];
		if (named.indexOf(card) >= 0) return true;
		return section.fallbackCard === card && !named.some((candidate) => existing.some((printed) => printed === candidate));
	}).sort((a, b) => a.order - b.order);
}

/** One state card: its sections, a joined section printed right after its host under one title. */
function renderStateCard(doc: Document, card: StateCard, existing: readonly CardId[]): HTMLElement {
	const element = compactCardElement(doc, "section", "state-card");
	element.classList.add(`${COMPACT_CARD_CLASS}__state-card--${card.card}`);
	if (card.state.active) element.classList.add(`${COMPACT_CARD_CLASS}__state-card--active`);
	const sections = sectionsOf(card.card, existing);
	const guests = sections.filter((section) => section.joinedTo?.card === card.card && sections.some((host) => host.id === section.joinedTo?.section));
	for (const section of sections) {
		if (guests.indexOf(section) >= 0) continue;
		const guest = guests.filter((candidate) => candidate.joinedTo?.section === section.id)[0];
		const context = { state: card.state, card: card.card, ...(guest && guest.joinedTo ? { join: { section: guest, title: guest.joinedTo.title } } : {}) };
		const rendered = renderCompactSection(doc, section, card.source, MONSTRE_PRESENTATION, context);
		if (rendered) element.appendChild(rendered);
	}
	return element;
}

/** The compact creature card: the banner and description, then one card per printed state. */
export function renderAdrenalineMonster(data: AdrenalineMonsterData, doc: Document): HTMLElement {
	const source = adrenalineSourceDocument(data) ?? monsterToDocument(data);
	const root = compactCardRoot(doc, adrenalineMonsterShape.root, MONSTRE_PRESENTATION, source);
	const cards = stateCards(source);
	// Outside the cards the sheet has one source: what the principal card prints (base plus its state's delta).
	const sheetSource = cards.filter((card) => card.card === "principal")[0]?.source ?? baseOf(source);
	const builders: Record<string, ZoneBuilder> = {
		cards: () => {
			const frame = compactCardElement(doc, "div", "cards");
			const existing = cards.map((card) => card.card);
			for (const card of cards) frame.appendChild(renderStateCard(doc, card, existing));
			return frame;
		},
	};
	for (const section of MONSTRE_PRESENTATION.sections) {
		if (!("cards" in section)) builders[section.id] = () => renderCompactSection(doc, section, sheetSource, MONSTRE_PRESENTATION);
	}
	renderZones(root, adrenalineMonsterShape, builders);
	return root;
}
