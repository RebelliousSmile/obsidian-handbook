import { BrumesBlock } from "../blocks/types";
import { AdrenalineRelationsData, parseAdrenalineRelations } from "./parser";
import { renderAdrenalineRelations } from "./renderer";
import { adrenalineRelationsShape } from "./shape";
import { relationsTemplate } from "./template";

export const adrenalineRelationsBlock: BrumesBlock<AdrenalineRelationsData> = {
	id: "adrenaline-relations",
	capability: "block:adrenaline-relations",
	label: "Feuille de relations Adrenaline",
	icon: "users-round",
	shape: adrenalineRelationsShape,
	parse: parseAdrenalineRelations,
	render: renderAdrenalineRelations,
	template: relationsTemplate,
};
