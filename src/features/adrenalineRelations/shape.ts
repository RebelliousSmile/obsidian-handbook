import { RELATIONS_PRESENTATION } from "schema-adrenaline/presentation";
import { BlockShape } from "../blocks/shape";

/** One zone per published section, in the descriptor's order. */
export const adrenalineRelationsShape: BlockShape = {
	block: RELATIONS_PRESENTATION.sheet.id,
	root: "brumes-adrenaline-relations",
	zones: RELATIONS_PRESENTATION.sections.map((section) => ({
		name: section.id,
		holds: section.blocks.map((block) => block.label).join(", "),
		heading: section.label,
		optional: section.id !== "entete",
	})),
};
