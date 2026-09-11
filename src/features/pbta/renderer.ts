import type { Move, Playbook } from "schema-pbta";
import type { BlockShape, BlockZone } from "../blocks/shape";
import { renderZones } from "../blocks/shape";
import { pbtaMoveShape, pbtaPlaybookShape } from "./shape";

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

function stringList(doc: Document, values: readonly string[]): HTMLElement {
	const list = element(doc, "ul");
	for (const value of values) list.appendChild(element(doc, "li", value));
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

export function renderPbtaPlaybook(data: Playbook, doc: Document): HTMLElement {
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
		stats: (zone) => {
			const node = section(doc, pbtaPlaybookShape, zone);
			for (const key of Object.keys(data.stats)) node.appendChild(labelledValue(doc, key, data.stats[key]));
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
	});
	return root;
}

export function renderPbtaMove(data: Move, doc: Document): HTMLElement {
	const root = element(doc, "article");
	root.classList.add(pbtaMoveShape.root);
	root.appendChild(renderMoveContents(data, doc));
	return root;
}
