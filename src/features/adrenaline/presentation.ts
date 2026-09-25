import type {
	AdrenalinePresentation,
	AdrenalinePresentationBlock,
	AdrenalinePresentationSection,
} from "schema-adrenaline/presentation";
import type { BlockShape, BlockZone } from "../blocks/shape";
import { renderZones } from "../blocks/shape";

/** Handbook's DOM adapter for the provider-owned sheet structure. */
export function presentationShape(presentation: AdrenalinePresentation, root: string): BlockShape {
	return {
		block: presentation.sheet.id,
		root,
		zones: [...presentation.sections]
			.sort((left, right) => left.order - right.order)
			.map((section) => ({
				name: section.id,
				holds: section.blocks.map((block) => block.label).join(", "),
				...(section.showTitle === false ? {} : { heading: section.label }),
			})),
	};
}

export type PresentationBlockBuilder = (
	block: AdrenalinePresentationBlock,
	section: AdrenalinePresentationSection,
) => HTMLElement | null;

export function renderPresentation(
	root: HTMLElement,
	doc: Document,
	presentation: AdrenalinePresentation,
	shape: BlockShape,
	build: PresentationBlockBuilder,
): void {
	const builders: Record<string, (zone: BlockZone) => HTMLElement | null> = {};
	for (const section of presentation.sections) {
		builders[section.id] = (zone) => {
			const element = doc.createElement(section.id === "entete" ? "header" : "section");
			element.classList.add("brumes-adrenaline--sheet-section", `brumes-adrenaline--section-${section.id}`);
			if (zone.heading) {
				const heading = doc.createElement("h4");
				heading.textContent = zone.heading;
				element.appendChild(heading);
			}
			let visible = false;
			for (const block of [...section.blocks].sort((left, right) => left.order - right.order)) {
				const content = build(block, section);
				if (!content) continue;
				content.classList.add("brumes-adrenaline--sheet-block", `brumes-adrenaline--block-${block.id}`);
				content.dataset.presentationForm = block.form ?? "";
				element.appendChild(content);
				visible = true;
			}
			return visible ? element : null;
		};
	}
	renderZones(root, shape, builders);
}

export function inkValue(doc: Document, value: string, className = ""): HTMLElement {
	const element = doc.createElement("span");
	element.classList.add("brumes-adrenaline--ink-value");
	if (className) element.classList.add(className);
	element.textContent = value;
	return element;
}

export function labelledValue(doc: Document, label: string, value?: string): HTMLElement {
	const row = doc.createElement("div");
	row.classList.add("brumes-adrenaline--labelled-value");
	const name = doc.createElement("span");
	name.textContent = label;
	row.appendChild(name);
	row.appendChild(inkValue(doc, value ?? ""));
	return row;
}
