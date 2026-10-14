import { BrumesBlock } from "../blocks/types";
import { AdrenalineMonsterData, parseAdrenalineMonster } from "./parser";
import { renderAdrenalineMonster } from "./renderer";
import { adrenalineMonsterShape } from "./shape";
import { monsterTemplate } from "./template";

export const adrenalineMonsterBlock: BrumesBlock<AdrenalineMonsterData> = {
	id: "adrenaline-monstre",
	capability: "block:adrenaline-monstre",
	label: "Fiche monstre Adrenaline",
	icon: "skull",
	shape: adrenalineMonsterShape,
	parse: parseAdrenalineMonster,
	render: renderAdrenalineMonster,
	template: monsterTemplate,
};
