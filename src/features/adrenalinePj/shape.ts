import { PJ_PRESENTATION } from "schema-adrenaline/presentation";
import { BlockShape } from "../blocks/shape";

export const adrenalinePjShape: BlockShape = {
	block: PJ_PRESENTATION.sheet.id,
	root: "brumes-adrenaline-pj",
	zones: PJ_PRESENTATION.sections.map((section) => ({
		name: section.id,
		holds: section.blocks.map((block) => block.label).join(", "),
		...("showTitle" in section && section.showTitle === false ? {} : { heading: section.label }),
	})),
};
