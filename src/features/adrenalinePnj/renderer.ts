import { PNJ_PRESENTATION } from "schema-adrenaline/presentation";
import { adrenalineSourceDocument } from "../adrenaline/document";
import { compactCardRoot, renderCompactSection } from "../adrenaline/compactCard";
import { renderZones, type ZoneBuilder } from "../blocks/shape";
import { AdrenalinePnjData } from "./parser";
import { pnjToDocument } from "./schema";
import { adrenalinePnjShape } from "./shape";

/** The compact PNJ card, drawn from the published descriptor over the document as entered. */
export function renderAdrenalinePnj(data: AdrenalinePnjData, doc: Document): HTMLElement {
	const source = adrenalineSourceDocument(data) ?? pnjToDocument(data);
	const root = compactCardRoot(doc, adrenalinePnjShape.root, PNJ_PRESENTATION, source);
	const builders: Record<string, ZoneBuilder> = {};
	for (const section of PNJ_PRESENTATION.sections) builders[section.id] = () => renderCompactSection(doc, section, source, PNJ_PRESENTATION);
	renderZones(root, adrenalinePnjShape, builders);
	return root;
}
