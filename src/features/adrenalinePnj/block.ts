import { BrumesBlock } from "../blocks/types";
import { AdrenalinePnjData, parseAdrenalinePnj } from "./parser";
import { renderAdrenalinePnj } from "./renderer";
import { adrenalinePnjShape } from "./shape";

export const adrenalinePnjBlock: BrumesBlock<AdrenalinePnjData> = {
	id: "adrenaline-pnj",
	mode: "adrenaline",
	flag: "adrenalinePnjParser",
	label: "Fiche PNJ Adrenaline",
	icon: "contact-round",
	shape: adrenalinePnjShape,
	parse: parseAdrenalinePnj,
	render: renderAdrenalinePnj,
	template: () => `\`\`\`adrenaline-pnj\nnom = "Nouveau PNJ"\n[narratif]\nrole = "Rôle dans le scénario"\n\`\`\`\n`,
};
