import type { MonsterOfTheWeekPlaybook } from "schema-pbta";
import contract from "schema-pbta/packs/monster-of-the-week/presentation-contract.json";
import { boxesLine, checkbox, checks, el, paragraphs, plainList, section, type MotwEntry } from "./motwShared";

type RegionId = (typeof contract.regions)[number]["id"];
type Move = MonsterOfTheWeekPlaybook["moves"][number];
type Renderer = (doc: Document, id: RegionId, data: MonsterOfTheWeekPlaybook) => HTMLElement | null;

const LABELS = { luck: "Chance", harm: "Blessures", experience: "Expérience", unstable: "Instable" };

function signed(value: number): string {
	return value > 0 ? `+${value}` : String(value);
}

function moveEntry(move: Move, starting: readonly string[]): MotwEntry {
	if ("ref" in move) return { label: move.ref, checked: move.checked === true || starting.indexOf(move.ref) >= 0 };
	return { label: move.name, note: move.description, checked: move.checked === true };
}

function valueLine(doc: Document, key: string, value: number): HTMLElement {
	const line = el(doc, "div");
	line.appendChild(el(doc, "span", key));
	line.appendChild(el(doc, "strong", signed(value)));
	return line;
}

function track(doc: Document, label: string, max: number | undefined, marked: number | undefined): HTMLElement | null {
	if (max === undefined) return null;
	return boxesLine(doc, label, max, marked ?? 0);
}

const RENDERERS: Record<RegionId, Renderer> = {
	"motw-header": (doc, id, data) => {
		const result = section(doc, contract, id, false);
		result.appendChild(el(doc, "h2", data.heroName ?? data.name));
		if (data.heroName) result.appendChild(el(doc, "span", data.name));
		if (data.description) paragraphs(doc, result, data.description);
		return result;
	},
	"motw-ratings": (doc, id, data) => {
		const stats = Object.keys(data.stats);
		const ratings = Object.keys(data.ratings ?? {});
		if (stats.length === 0 && ratings.length === 0 && !data.statChoices?.length) return null;
		const result = section(doc, contract, id);
		for (const key of stats) result.appendChild(valueLine(doc, key, data.stats[key]));
		for (const key of ratings) result.appendChild(valueLine(doc, key, (data.ratings ?? {})[key]));
		if (data.statChoices?.length) result.appendChild(checks(doc, data.statChoices));
		return result;
	},
	"motw-tracks": (doc, id, data) => {
		const lines: Array<HTMLElement | null> = [
			track(doc, LABELS.luck, data.luckMax, data.luckMarked ?? data.luck),
			track(doc, LABELS.harm, data.harmMax, data.harmMarked),
			track(doc, LABELS.experience, data.experienceMax, data.experienceMarked),
		];
		const present = lines.filter((line): line is HTMLElement => line !== null);
		if (data.luckMax === undefined && data.luck !== undefined) present.unshift(el(doc, "li", `${LABELS.luck} ${data.luck}`));
		if (data.unstable !== undefined) {
			const unstable = el(doc, "li");
			unstable.classList.add("handbook-motw-boxes");
			unstable.appendChild(checkbox(doc, data.unstable, LABELS.unstable));
			unstable.appendChild(el(doc, "span", LABELS.unstable));
			present.push(unstable);
		}
		if (present.length === 0) return null;
		const result = section(doc, contract, id);
		const list = el(doc, "ul");
		for (const line of present) list.appendChild(line);
		result.appendChild(list);
		return result;
	},
	"motw-weapon": (doc, id, data) => {
		if (!data.specialWeapon) return null;
		const result = section(doc, contract, id);
		result.appendChild(el(doc, "p", data.specialWeapon));
		return result;
	},
	"motw-moves": (doc, id, data) => {
		if (data.moves.length === 0) return null;
		const result = section(doc, contract, id);
		const starting = data.startingMoves ?? [];
		result.appendChild(checks(doc, data.moves.map((move) => moveEntry(move, starting))));
		return result;
	},
	"motw-look": (doc, id, data) => {
		if (!data.look?.length) return null;
		const result = section(doc, contract, id);
		result.appendChild(plainList(doc, data.look));
		return result;
	},
	"motw-introductions": (doc, id, data) => {
		const lines = [...(data.introductions ?? []), ...(data.history ?? [])];
		if (lines.length === 0) return null;
		const result = section(doc, contract, id);
		result.appendChild(plainList(doc, lines));
		return result;
	},
	"motw-improvements": (doc, id, data) => {
		const entries = [...data.improvements, ...(data.advancements ?? [])];
		if (entries.length === 0) return null;
		const result = section(doc, contract, id);
		result.appendChild(checks(doc, entries));
		return result;
	},
	"motw-notes": (doc, id, data) => {
		if (!data.notes?.length) return null;
		const result = section(doc, contract, id);
		result.appendChild(plainList(doc, data.notes));
		return result;
	},
};

/** The regions this layout draws; `assert:motw-layout` compares them with the published contract. */
export const MOTW_LAYOUT_REGIONS: readonly string[] = Object.keys(RENDERERS);

/** Face placement follows the published presentation contract; the geometry is the pack's sheet. */
export function renderMotwLayout(data: MonsterOfTheWeekPlaybook, doc: Document): HTMLElement {
	const root = el(doc, "article");
	root.classList.add("handbook-pbta-playbook", "handbook-motw-playbook");
	for (const face of contract.faces) {
		const faceNode = el(doc, "div");
		faceNode.classList.add("handbook-motw-face");
		faceNode.dataset.face = face.id;
		const header = (RENDERERS as Partial<Record<string, Renderer>>)[face.header]?.(doc, face.header, data);
		if (header) faceNode.appendChild(header);
		for (const [columnIndex, ids] of face.columns.entries()) {
			const column = el(doc, "div");
			column.classList.add("handbook-motw-column");
			column.dataset.column = String(columnIndex + 1);
			for (const id of ids) {
				const region = (RENDERERS as Partial<Record<string, Renderer>>)[id]?.(doc, id, data);
				if (region) column.appendChild(region);
			}
			faceNode.appendChild(column);
		}
		root.appendChild(faceNode);
	}
	return root;
}
