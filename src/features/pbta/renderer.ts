import type { MonsterheartsPlaybook, Move, Playbook } from "schema-pbta";
import type { BlockShape, BlockZone } from "../blocks/shape";
import { renderZones } from "../blocks/shape";
import { pbtaMoveShape, pbtaPlaybookShape } from "./shape";
import type { ResolvedPbtaPlaybook } from "./specializedPlaybooks";

function element(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const node = doc.createElement(tag);
	if (text !== undefined) node.textContent = text;
	return node;
}

function section(doc: Document, shape: BlockShape, zone: BlockZone): HTMLElement {
	const node = element(doc, "section");
	node.classList.add(`${shape.root}--${zone.name}`);
	return node;
}

function formatValue(value: unknown): string {
	if (Array.isArray(value)) return value.join(", ");
	if (typeof value === "boolean") return value ? "Yes" : "No";
	return String(value);
}

function labelledValue(doc: Document, label: string, value: unknown): HTMLElement {
	const row = element(doc, "div");
	row.classList.add("handbook-pbta-field");
	row.appendChild(element(doc, "dt", label));
	row.appendChild(element(doc, "dd", formatValue(value)));
	return row;
}

function statProfile(doc: Document, profile: NonNullable<Playbook["statProfiles"]>[number]): HTMLElement {
	const node = element(doc, "section");
	node.classList.add("handbook-pbta-stat-profile");
	node.appendChild(element(doc, "h4", profile.label));
	for (const key of Object.keys(profile.stats)) node.appendChild(labelledValue(doc, key, profile.stats[key]));
	return node;
}

function mechanicGroup(doc: Document, title: string): HTMLElement {
	const node = element(doc, "section");
	node.classList.add("handbook-pbta-mechanic-group");
	node.appendChild(element(doc, "h4", title));
	return node;
}

function renderMonsterheartsMechanics(data: MonsterheartsPlaybook, doc: Document): HTMLElement | null {
	const node = element(doc, "section");
	if (data.strings) {
		const group = mechanicGroup(doc, "Strings");
		group.appendChild(labelledValue(doc, "max", data.strings.max));
		if (data.strings.starting !== undefined) group.appendChild(labelledValue(doc, "starting", data.strings.starting));
		node.appendChild(group);
	}
	if (data.ascendants?.length) {
		const group = mechanicGroup(doc, "Ascendants");
		for (const ascendant of data.ascendants) group.appendChild(labelledValue(doc, ascendant.name, ascendant.value));
		node.appendChild(group);
	}
	if (data.conditions?.length) {
		const group = mechanicGroup(doc, "Conditions");
		for (const condition of data.conditions) {
			const entry = element(doc, "article");
			entry.classList.add("handbook-pbta-mechanic-entry");
			entry.appendChild(element(doc, "h5", condition.name));
			if (condition.description) entry.appendChild(element(doc, "p", condition.description));
			group.appendChild(entry);
		}
		node.appendChild(group);
	}
	if (data.advances.length) {
		const group = mechanicGroup(doc, "Advances");
		for (const advance of data.advances) group.appendChild(labelledValue(doc, advance.label, advance.checked ?? false));
		node.appendChild(group);
	}
	return node.children.length > 0 ? node : null;
}

function stringList(doc: Document, values: readonly unknown[]): HTMLElement {
	const list = element(doc, "ul");
	for (const value of values) {
		const label = typeof value === "string"
			? value
			: value && typeof value === "object" && "label" in value && typeof value.label === "string"
				? value.label
				: value && typeof value === "object" && "value" in value && typeof value.value === "string"
					? value.value
					: String(value);
		list.appendChild(element(doc, "li", label));
	}
	return list;
}

function callout(doc: Document, kind: string, title: string, text: string): HTMLElement {
	const aside = element(doc, "aside");
	aside.classList.add("handbook-pbta-callout");
	aside.dataset.callout = kind;
	aside.appendChild(element(doc, "strong", title));
	aside.appendChild(element(doc, "p", text));
	return aside;
}

function renderMoveContents(data: Move | Playbook["moves"][number], doc: Document): HTMLElement {
	const card = element(doc, "article");
	card.classList.add("handbook-pbta-move-card");
	if ("ref" in data) {
		card.appendChild(element(doc, "strong", `Move: ${data.ref}`));
		return card;
	}
	card.appendChild(element(doc, "h4", data.name));
	card.appendChild(element(doc, "p", data.description));
	if (data.trigger) card.appendChild(callout(doc, "pbta-trigger", "Trigger", data.trigger));
	if (data.choices) card.appendChild(callout(doc, "pbta-choice", "Choices", data.choices));
	if (data.roll) {
		const roll = `${data.roll.rollType}${data.roll.rollFormula ? ` · ${data.roll.rollFormula}` : ""}${data.roll.rollMod === undefined ? "" : ` · ${data.roll.rollMod >= 0 ? "+" : ""}${data.roll.rollMod}`}`;
		card.appendChild(labelledValue(doc, "Roll", roll));
	}
	if (data.results) {
		for (const key of Object.keys(data.results)) {
			const result = data.results[key];
			card.appendChild(callout(doc, "pbta-result", result.label, result.text));
		}
	}
	if (data.tags?.length) card.appendChild(stringList(doc, data.tags));
	return card;
}

function renderEditorial(data: Record<string, unknown>, doc: Document): HTMLElement | null {
	const editorial = data.editorial;
	if (!editorial || typeof editorial !== "object" || Array.isArray(editorial)) return null;
	const node = element(doc, "section");
	const entries = editorial as Record<string, unknown>;
	for (const key of Object.keys(entries)) {
		const value = entries[key];
		if (!value || typeof value !== "object" || Array.isArray(value)) continue;
		const entry = value as { heading?: unknown; paragraphs?: unknown };
		if (typeof entry.heading === "string") node.appendChild(element(doc, "h4", entry.heading));
		if (Array.isArray(entry.paragraphs)) {
			for (const paragraph of entry.paragraphs) {
				if (typeof paragraph === "string") node.appendChild(element(doc, "p", paragraph));
			}
		}
	}
	return node.children.length > 0 ? node : null;
}

/** The mechanical fields each specialised target prints, asserted against the shared corpus. */
export const PBTA_SPECIALIZED_FIELDS: Record<Exclude<ResolvedPbtaPlaybook["target"], "playbook">, string[]> = {
	"masks-playbook": ["momentOfTruth", "potential", "influence"],
	"monster-of-the-week-playbook": ["improvements", "luck", "ratings"],
	"monsterhearts-playbook": ["strings", "ascendants", "conditions", "advances"],
	"urban-shadows-playbook": ["corruption", "endMove"],
	"the-sprawl-playbook": ["directives", "missionGear", "cred"],
};

function renderMechanics(target: ResolvedPbtaPlaybook["target"], data: Record<string, unknown>, doc: Document): HTMLElement | null {
	if (target === "playbook") return null;
	if (target === "monsterhearts-playbook") return renderMonsterheartsMechanics(data as MonsterheartsPlaybook, doc);
	const node = element(doc, "section");
	for (const key of PBTA_SPECIALIZED_FIELDS[target]) {
		const value = data[key];
		if (value === undefined) continue;
		node.appendChild(labelledValue(doc, key, value));
	}
	return node.children.length > 0 ? node : null;
}

export function renderPbtaPlaybook(resolved: ResolvedPbtaPlaybook, doc: Document): HTMLElement {
	const data = resolved.data;
	const raw = resolved.data as unknown as Record<string, unknown>;
	const root = element(doc, "article");
	root.classList.add(pbtaPlaybookShape.root);
	renderZones(root, pbtaPlaybookShape, {
		identity: (zone) => {
			const node = section(doc, pbtaPlaybookShape, zone);
			node.appendChild(element(doc, "p", data.game));
			node.appendChild(element(doc, "h3", data.name));
			node.appendChild(element(doc, "p", data.description));
			if (data.statsDetail) node.appendChild(callout(doc, "pbta-rule", "Starting spread", data.statsDetail));
			return node;
		},
		editorial: (zone) => {
			const node = renderEditorial(raw, doc);
			if (!node) return null;
			node.classList.add(`${pbtaPlaybookShape.root}--${zone.name}`);
			return node;
		},
		stats: (zone) => {
			const node = section(doc, pbtaPlaybookShape, zone);
			for (const key of Object.keys(data.stats)) node.appendChild(labelledValue(doc, key, data.stats[key]));
			for (const profile of data.statProfiles ?? []) node.appendChild(statProfile(doc, profile));
			return node;
		},
		attributes: (zone) => {
			if (!data.attributes || Object.keys(data.attributes).length === 0) return null;
			const node = section(doc, pbtaPlaybookShape, zone);
			for (const key of Object.keys(data.attributes)) node.appendChild(labelledValue(doc, key, data.attributes[key]));
			return node;
		},
		moves: (zone) => {
			if (data.moves.length === 0) return null;
			const node = section(doc, pbtaPlaybookShape, zone);
			for (const move of data.moves) node.appendChild(renderMoveContents(move, doc));
			return node;
		},
		choices: (zone) => {
			if (!data.choiceSets?.length) return null;
			const node = section(doc, pbtaPlaybookShape, zone);
			for (const choiceSet of data.choiceSets) {
				const group = element(doc, "section");
				group.appendChild(element(doc, "h4", choiceSet.title));
				if (choiceSet.description) group.appendChild(element(doc, "p", choiceSet.description));
				const list = element(doc, "ul");
				for (const choice of choiceSet.choices) list.appendChild(element(doc, "li", "ref" in choice ? choice.ref : choice.name));
				group.appendChild(list);
				node.appendChild(group);
			}
			return node;
		},
		creation: (zone) => {
			if (!data.creation?.length) return null;
			const node = section(doc, pbtaPlaybookShape, zone);
			for (const question of data.creation) {
				node.appendChild(element(doc, "h4", question.label));
				node.appendChild(stringList(doc, question.options));
			}
			return node;
		},
		gear: (zone) => {
			if (!data.gear?.length) return null;
			const node = section(doc, pbtaPlaybookShape, zone);
			for (const gear of data.gear) node.appendChild(labelledValue(doc, gear.name, gear.quantity ?? gear.description ?? ""));
			return node;
		},
		advancement: (zone) => {
			if (!data.advancement?.length) return null;
			const node = section(doc, pbtaPlaybookShape, zone);
			node.appendChild(stringList(doc, data.advancement));
			return node;
		},
		mechanics: (zone) => {
			const node = renderMechanics(resolved.target, raw, doc);
			if (!node) return null;
			node.classList.add(`${pbtaPlaybookShape.root}--${zone.name}`);
			return node;
		},
	});
	return root;
}

export function renderPbtaMove(data: Move, doc: Document): HTMLElement {
	const root = element(doc, "article");
	root.classList.add(pbtaMoveShape.root);
	root.appendChild(renderMoveContents(data, doc));
	return root;
}
