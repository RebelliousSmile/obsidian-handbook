import { MONSTRE_PRESENTATION } from "schema-adrenaline/presentation";
import { adrenalineSourceDocument, asRecord, type AdrenalineDocument } from "../adrenaline/document";
import { COMPACT_CARD_CLASS, compactCardElement, compactCardRoot, renderCompactSection, type CompactCardState } from "../adrenaline/compactCard";
import { renderZones, type ZoneBuilder } from "../blocks/shape";
import { AdrenalineMonsterData } from "./parser";
import { monsterToDocument } from "./schema";
import { adrenalineMonsterShape, MONSTER_CARD_SECTIONS } from "./shape";

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

interface StateCard {
	card: "principal" | "secondaire";
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

/**
 * The principal card prints `etatPrincipal`, or the base; the secondary card
 * prints the other one: the base when the principal is a state, else the
 * first state. A creature without states has one card. A state overlays the
 * base field by field, as entered.
 */
function stateCards(source: AdrenalineDocument): StateCard[] {
	const base = baseOf(source);
	const states = statesOf(source);
	const known = (id: string): boolean => id === BASE || states.some((state) => state.id === id);
	const principal = known(text(source.etatPrincipal)) ? text(source.etatPrincipal) : BASE;
	const secondary = principal !== BASE ? BASE : states.length > 0 ? states[0].id : undefined;
	const active = known(text(source.etatActif)) ? text(source.etatActif) : BASE;
	const baseState = asRecord(source.etatDeBase);
	const resolve = (card: StateCard["card"], id: string): StateCard => {
		const state = states.filter((candidate) => candidate.id === id)[0];
		return {
			card,
			source: state ? { ...base, ...state.delta } : base,
			state: {
				name: state ? state.nom : text(baseState?.nom) || "État de base",
				triggers: state ? state.declencheurs : strings(baseState?.declencheurs),
				active: states.length > 0 && active === id,
				...(state?.notes ? { note: state.notes } : {}),
			},
		};
	};
	return secondary === undefined ? [resolve("principal", principal)] : [resolve("principal", principal), resolve("secondaire", secondary)];
}

/** The compact creature card: the banner and description, then one card per printed state. */
export function renderAdrenalineMonster(data: AdrenalineMonsterData, doc: Document): HTMLElement {
	const source = adrenalineSourceDocument(data) ?? monsterToDocument(data);
	const root = compactCardRoot(doc, adrenalineMonsterShape.root, MONSTRE_PRESENTATION, source);
	const base = baseOf(source);
	const builders: Record<string, ZoneBuilder> = {
		cards: () => {
			const frame = compactCardElement(doc, "div", "cards");
			for (const card of stateCards(source)) {
				const element = frame.appendChild(compactCardElement(doc, "section", "state-card"));
				element.classList.add(`${COMPACT_CARD_CLASS}__state-card--${card.card}`);
				if (card.state.active) element.classList.add(`${COMPACT_CARD_CLASS}__state-card--active`);
				for (const section of MONSTER_CARD_SECTIONS) {
					if ((section.cards ?? []).indexOf(card.card) < 0) continue;
					const rendered = renderCompactSection(doc, section, card.source, MONSTRE_PRESENTATION, card.state);
					if (rendered) element.appendChild(rendered);
				}
			}
			return frame;
		},
	};
	for (const section of MONSTRE_PRESENTATION.sections) {
		if (!("cards" in section)) builders[section.id] = () => renderCompactSection(doc, section, base, MONSTRE_PRESENTATION);
	}
	renderZones(root, adrenalineMonsterShape, builders);
	return root;
}
