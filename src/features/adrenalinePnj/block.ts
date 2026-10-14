import { BrumesBlock } from "../blocks/types";
import { AdrenalinePnjData, parseAdrenalinePnj } from "./parser";
import { renderAdrenalinePnj } from "./renderer";
import { adrenalinePnjShape } from "./shape";
import { pnjTemplate } from "./template";

export const adrenalinePnjBlock: BrumesBlock<AdrenalinePnjData> = {
	id: "adrenaline-pnj",
	capability: "block:adrenaline-pnj",
	label: "Fiche PNJ Adrenaline",
	icon: "contact-round",
	shape: adrenalinePnjShape,
	parse: parseAdrenalinePnj,
	render: renderAdrenalinePnj,
	template: pnjTemplate,
};
