import { BrumesBlock } from "../blocks/types";
import { AdrenalineMonsterData, parseAdrenalineMonster } from "./parser";
import { renderAdrenalineMonster } from "./renderer";
import { adrenalineMonsterShape } from "./shape";

export const adrenalineMonsterBlock: BrumesBlock<AdrenalineMonsterData> = {
	id: "adrenaline-monstre",
	mode: "adrenaline",
	flag: "adrenalineMonsterParser",
	label: "Fiche monstre Adrenaline",
	icon: "skull",
	shape: adrenalineMonsterShape,
	parse: parseAdrenalineMonster,
	render: renderAdrenalineMonster,
	template: () => `\`\`\`adrenaline-monstre\nnom = "Nouvelle créature"\n[caracteristiques]\nfor = 30\ncon = 30\ndex = 30\nrap = 30\n\`\`\`\n`,
};
