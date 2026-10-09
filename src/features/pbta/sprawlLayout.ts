import type { TheSprawlPlaybook } from "schema-pbta";
import contract from "schema-pbta/packs/the-sprawl/presentation-contract.json";
import { checks, el, keyValue, paragraphs, plainList, section, type MotwEntry } from "./motwShared";
import { hexagons, hourTrack, signed } from "./sprawlPrimitives";

type RegionId = (typeof contract.regions)[number]["id"];
type Move = TheSprawlPlaybook["moves"][number];
type Gear = NonNullable<TheSprawlPlaybook["gear"]>[number];
type Renderer = (doc: Document, id: RegionId, data: TheSprawlPlaybook) => HTMLElement | null;

const LABELS = { cred: "Cred", xp: "Expérience", harm: "Blessures", link: "Lien" };

function moveEntry(move: Move, starting: readonly string[]): MotwEntry {
	if ("ref" in move) return { label: move.ref, checked: move.checked === true || starting.indexOf(move.ref) >= 0 };
	return { label: move.name, note: move.description, checked: move.checked === true };
}

function gearEntry(gear: Gear): MotwEntry {
	return { label: gear.quantity !== undefined && gear.quantity > 1 ? `${gear.name} ×${gear.quantity}` : gear.name, note: gear.description };
}

function withChecks(doc: Document, id: RegionId, entries: readonly MotwEntry[]): HTMLElement | null {
	if (entries.length === 0) return null;
	const result = section(doc, contract, id);
	result.appendChild(checks(doc, entries));
	return result;
}

const RENDERERS: Record<RegionId, Renderer> = {
	"sprawl-header": (doc, id, data) => {
		const result = section(doc, contract, id, false);
		result.appendChild(el(doc, "h2", data.characterName ?? data.name));
		if (data.characterName) result.appendChild(el(doc, "span", data.name));
		if (data.description) paragraphs(doc, result, data.description);
		return result;
	},
	"sprawl-look": (doc, id, data) => {
		const pairs = keyValue(doc, (data.look ?? []).map((line): [string, string | undefined] => [line.label, line.value]));
		if (!pairs) return null;
		const result = section(doc, contract, id);
		result.appendChild(pairs);
		return result;
	},
	"sprawl-gear": (doc, id, data) => {
		const entries = [
			...(data.gear ?? []).map(gearEntry),
			...(data.missionGear ?? []).map((label): MotwEntry => ({ label })),
		];
		return withChecks(doc, id, entries);
	},
	"sprawl-cyberware": (doc, id, data) => withChecks(doc, id, data.cyberware ?? []),
	"sprawl-moves": (doc, id, data) => {
		const starting = data.startingMoves ?? [];
		return withChecks(doc, id, data.moves.map((move) => moveEntry(move, starting)));
	},
	"sprawl-stats": (doc, id, data) => {
		const keys = Object.keys(data.stats);
		if (keys.length === 0) return null;
		const result = section(doc, contract, id);
		result.appendChild(hexagons(doc, keys.map((key): [string, string] => [key, signed(data.stats[key])])));
		return result;
	},
	"sprawl-cred-xp": (doc, id, data) => {
		if (data.cred === undefined && data.xp === undefined && data.xpMax === undefined) return null;
		const result = section(doc, contract, id);
		const entries: Array<readonly [string, string | undefined]> = [
			[LABELS.cred, data.cred === undefined ? undefined : String(data.cred)],
			[LABELS.xp, data.xp === undefined && data.xpMax === undefined ? undefined : `${data.xp ?? 0}${data.xpMax === undefined ? "" : `/${data.xpMax}`}`],
		];
		result.appendChild(hexagons(doc, entries.filter((entry) => entry[1] !== undefined)));
		return result;
	},
	"sprawl-directives": (doc, id, data) => {
		const choices = data.directiveChoices ?? [];
		const chosen = choices.map((choice) => choice.label);
		const entries: MotwEntry[] = [
			...data.directives.filter((label) => chosen.indexOf(label) < 0).map((label): MotwEntry => ({ label })),
			...choices,
		];
		return withChecks(doc, id, entries);
	},
	"sprawl-advancement": (doc, id, data) => withChecks(doc, id, data.advancement ?? []),
	"sprawl-links": (doc, id, data) => {
		if (!data.links?.length) return null;
		const result = section(doc, contract, id);
		result.appendChild(hexagons(doc, data.links.map((link): [string, string] => [link.name ?? LABELS.link, signed(link.value)])));
		return result;
	},
	"sprawl-contacts": (doc, id, data) => {
		if (!data.contacts?.length) return null;
		const result = section(doc, contract, id);
		result.appendChild(plainList(doc, data.contacts));
		return result;
	},
	"sprawl-harm": (doc, id, data) => {
		if (data.hoursMarked === undefined) return null;
		const result = section(doc, contract, id);
		result.appendChild(hourTrack(doc, LABELS.harm, data.hoursMarked));
		return result;
	},
};

/** The regions this layout draws; `assert:sprawl-layout` compares them with the published contract. */
export const SPRAWL_LAYOUT_REGIONS: readonly string[] = Object.keys(RENDERERS);

/** Face placement follows the published presentation contract; the geometry is the pack's sheet. */
export function renderSprawlLayout(data: TheSprawlPlaybook, doc: Document): HTMLElement {
	const root = el(doc, "article");
	root.classList.add("handbook-pbta-playbook", "handbook-sprawl-playbook");
	for (const face of contract.faces) {
		const faceNode = el(doc, "div");
		faceNode.classList.add("handbook-sprawl-face");
		faceNode.dataset.face = face.id;
		const header = (RENDERERS as Partial<Record<string, Renderer>>)[face.header]?.(doc, face.header, data);
		if (header) faceNode.appendChild(header);
		for (const [columnIndex, ids] of face.columns.entries()) {
			const column = el(doc, "div");
			column.classList.add("handbook-sprawl-column");
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
