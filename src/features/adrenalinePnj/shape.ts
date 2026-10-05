import { PNJ_PRESENTATION } from "schema-adrenaline/presentation";
import { BlockShape } from "../blocks/shape";

/** One zone per published section, in the descriptor's order. */
export const adrenalinePnjShape: BlockShape = {
	block: PNJ_PRESENTATION.sheet.id,
	root: "brumes-adrenaline-pnj",
	zones: PNJ_PRESENTATION.sections.map((section) => ({
		name: section.id,
		holds: section.blocks.map((block) => block.label).join(", "),
		...("showTitle" in section && section.showTitle === false ? {} : { heading: section.label }),
		optional: section.id !== "entete",
	})),
};
