import type { MonsterheartsPlaybook } from "schema-pbta";
import contract from "schema-pbta/packs/monsterhearts/presentation-contract.json";

type Region = (typeof contract.regions)[number];

function node(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	if (text !== undefined) result.textContent = text;
	return result;
}

function title(key: string): string {
	return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
}

function scalar(value: unknown): string {
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "string" || typeof value === "number") return String(value);
	return "";
}

function renderValue(doc: Document, key: string, value: unknown): HTMLElement | null {
	if (value === undefined || value === null) return null;
	const block = node(doc, "div");
	block.classList.add("handbook-monsterhearts-field");
	if (value && typeof value === "object" && !Array.isArray(value)) {
		const editorial = value as Record<string, unknown>;
		if (typeof editorial.heading === "string" && Array.isArray(editorial.paragraphs)) {
			block.classList.add("handbook-monsterhearts-editorial");
			block.appendChild(node(doc, "h5", editorial.heading));
			for (const paragraph of editorial.paragraphs) {
				if (typeof paragraph === "string") block.appendChild(node(doc, "p", paragraph));
			}
			for (const extra of Object.keys(editorial).filter((field) => field !== "heading" && field !== "paragraphs")) {
				const child = renderValue(doc, extra, editorial[extra]);
				if (child) block.appendChild(child);
			}
			return block;
		}
	}
	if (key !== "name" && key !== "description") block.appendChild(node(doc, "strong", title(key)));
	if (Array.isArray(value)) {
		const list = node(doc, "ul");
		const entries: unknown[] = value;
		for (const entry of entries) {
			const item = node(doc, "li");
			if (entry && typeof entry === "object") {
				for (const childKey of Object.keys(entry)) {
					const childValue = (entry as Record<string, unknown>)[childKey];
					const child = renderValue(doc, childKey, childValue);
					if (child) item.appendChild(child);
				}
			} else item.textContent = scalar(entry);
			list.appendChild(item);
		}
		block.appendChild(list);
	} else if (typeof value === "object") {
		for (const childKey of Object.keys(value)) {
			const childValue = (value as Record<string, unknown>)[childKey];
			const child = renderValue(doc, childKey, childValue);
			if (child) block.appendChild(child);
		}
	} else {
		block.appendChild(node(doc, key === "name" ? "h3" : "span", scalar(value)));
	}
	return block;
}

function fieldValue(data: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce<unknown>((value, part) =>
		value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, data);
}

function renderRegion(doc: Document, data: Record<string, unknown>, region: Region): HTMLElement | null {
	const section = node(doc, "section");
	section.classList.add("handbook-monsterhearts-region");
	section.dataset.region = region.id;
	section.dataset.primitive = region.primitive;
	section.appendChild(node(doc, "h4", title(region.id.replace(/^monsterhearts-/, ""))));
	let populated = false;
	for (const field of region.fields) {
		const value = fieldValue(data, field);
		const rendered = renderValue(doc, field.split(".").pop() ?? field, value);
		if (!rendered) continue;
		section.appendChild(rendered);
		populated = true;
	}
	return populated ? section : null;
}

/** Region identity, order, fields, and primitives come from the published schema. */
export function renderMonsterheartsLayout(data: MonsterheartsPlaybook, doc: Document): HTMLElement {
	const root = node(doc, "article");
	root.classList.add("handbook-pbta-playbook", "handbook-monsterhearts-playbook");
	const values = data as unknown as Record<string, unknown>;
	const regions = new Map(contract.regions.map((region) => [region.id, region]));
	for (const id of contract.canonicalOrder) {
		const region = regions.get(id);
		if (!region) throw new Error(`Unknown Monsterhearts presentation region: ${id}`);
		const rendered = renderRegion(doc, values, region);
		if (rendered) root.appendChild(rendered);
	}
	return root;
}
