import {
	parseMasksNpcToml,
	parseNpcToml,
	stringifyMasksNpcToml,
	stringifyNpcToml,
	type MasksNpc,
	type Npc,
} from "schema-pbta";
import type { BrumesBlock } from "../blocks/types";
import { renderMasksNpc } from "./masksNpc";
import { pbtaNpcShape } from "./shape";

export type ResolvedPbtaNpc =
	| { target: "npc"; data: Npc }
	| { target: "masks-npc"; data: MasksNpc };

/** Parsers tried in order: the specialised target first, the generic one last. */
const SPECIALIZED_NPC_PARSERS: Array<{ target: "masks-npc"; parse: (source: string) => MasksNpc }> = [
	{ target: "masks-npc", parse: parseMasksNpcToml },
];

/** The specialised targets this block resolves from a document alone. */
export const PBTA_NPC_PROJECTED_TARGETS: readonly "masks-npc"[] = SPECIALIZED_NPC_PARSERS.map((candidate) => candidate.target);

export function parsePbtaNpcToml(source: string): ResolvedPbtaNpc | null {
	for (const candidate of SPECIALIZED_NPC_PARSERS) {
		try {
			return { target: candidate.target, data: candidate.parse(source) };
		} catch { /* Try the next target. */ }
	}
	try {
		return { target: "npc", data: parseNpcToml(source) };
	} catch {
		return null;
	}
}

export function stringifyPbtaNpcToml(npc: ResolvedPbtaNpc): string {
	return npc.target === "masks-npc" ? stringifyMasksNpcToml(npc.data) : stringifyNpcToml(npc.data);
}

function el(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const node = doc.createElement(tag);
	if (text !== undefined) node.textContent = text;
	return node;
}

function moveLine(move: Npc["moves"][number]): string {
	if ("ref" in move) return move.ref;
	return move.description ? `${move.name} — ${move.description}` : move.name;
}

function definition(doc: Document, label: string, value: string): HTMLElement {
	const row = el(doc, "div");
	row.appendChild(el(doc, "dt", label));
	row.appendChild(el(doc, "dd", value));
	return row;
}

/** The sober rendering: name, description, drive, moves, attributes. No region of any game. */
function renderSoberNpc(npc: ResolvedPbtaNpc, doc: Document): HTMLElement {
	const root = el(doc, "article");
	root.classList.add(pbtaNpcShape.root);
	const identity = el(doc, "section");
	identity.classList.add(`${pbtaNpcShape.root}--identity`);
	identity.appendChild(el(doc, "h2", npc.data.name));
	for (const paragraph of npc.data.description.split(/\n{2,}/)) identity.appendChild(el(doc, "p", paragraph));
	const dl = el(doc, "dl");
	let entries = 0;
	const add = (label: string, value: string) => { dl.appendChild(definition(doc, label, value)); entries += 1; };
	if (npc.data.drive) add("Drive", npc.data.drive);
	if (npc.target === "npc") {
		const attributes = npc.data.attributes ?? {};
		for (const key of Object.keys(attributes)) {
			const value = attributes[key];
			add(key, Array.isArray(value) ? value.join(", ") : String(value));
		}
	} else {
		const extras: Array<[string, string | undefined]> = [
			["Generation", npc.data.generation],
			["Real name", npc.data.realName],
			["Abilities", npc.data.abilities],
			["Resistance", npc.data.resistance === undefined ? undefined : String(npc.data.resistance)],
			["Conditions", npc.data.conditions?.join(", ")],
			["Self", `${npc.data.self.value} (${npc.data.self.min} to ${npc.data.self.max})`],
			["Worst Self", npc.data.worstSelf],
			["Best Self", npc.data.bestSelf],
		];
		for (const [label, value] of extras) if (value) add(label, value);
	}
	if (entries > 0) identity.appendChild(dl);
	root.appendChild(identity);
	const lines = npc.target === "npc" ? npc.data.moves.map(moveLine) : npc.data.moves ?? [];
	if (lines.length) {
		const moves = el(doc, "section");
		moves.classList.add(`${pbtaNpcShape.root}--moves`);
		const ul = el(doc, "ul");
		for (const line of lines) ul.appendChild(el(doc, "li", line));
		moves.appendChild(ul);
		root.appendChild(moves);
	}
	return root;
}

export const pbtaNpcBlock: BrumesBlock<ResolvedPbtaNpc> = {
	id: "pbta-npc",
	capability: "block:pbta-npc",
	flag: "pbtaParser",
	label: "PbtA non-player character",
	icon: "user-round",
	shape: pbtaNpcShape,
	parse: parsePbtaNpcToml,
	render: (data, doc, context) =>
		data.target === "masks-npc" && context?.packId === "masks" ? renderMasksNpc(data.data, doc) : renderSoberNpc(data, doc),
	template: (settings) => `\`\`\`pbta-npc\nslug = "new-npc"\nname = "New NPC"\ngame = "${settings.mode}"\ndescription = "Describe this character."\nmoves = []\n\`\`\`\n`,
};

export const pbtaNpcToToml = stringifyPbtaNpcToml;
