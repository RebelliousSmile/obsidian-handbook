import {
	parseMoveToml,
	parsePlaybookToml,
	stringifyMoveToml,
	stringifyPlaybookToml,
	type Move,
	type Playbook,
} from "schema-pbta";
import type { BrumesBlock } from "../blocks/types";
import { renderPbtaMove, renderPbtaPlaybook } from "./renderer";
import { pbtaMoveShape, pbtaPlaybookShape } from "./shape";

function safeParse<T>(parse: (source: string) => T, source: string): T | null {
	try { return parse(source); } catch { return null; }
}

export const pbtaPlaybookBlock: BrumesBlock<Playbook> = {
	id: "pbta-playbook",
	capability: "block:pbta-playbook",
	handout: true,
	flag: "pbtaParser",
	label: "PbtA character playbook",
	icon: "book-user",
	shape: pbtaPlaybookShape,
	parse: (source) => safeParse(parsePlaybookToml, source),
	render: renderPbtaPlaybook,
	template: () => `\`\`\`pbta-playbook\nslug = "new-playbook"\nname = "New playbook"\ngame = "masks"\ndescription = "Describe this playbook."\nmoves = []\n\n[stats]\ndanger = 0\n\`\`\`\n`,
};

export const pbtaMoveBlock: BrumesBlock<Move> = {
	id: "pbta-move",
	capability: "block:pbta-move",
	flag: "pbtaParser",
	label: "PbtA move",
	icon: "dices",
	shape: pbtaMoveShape,
	parse: (source) => safeParse(parseMoveToml, source),
	render: renderPbtaMove,
	template: () => `\`\`\`pbta-move\nslug = "new-move"\nname = "New move"\ngame = "masks"\nmoveType = "basic"\ndescription = "Describe this move."\n\`\`\`\n`,
};

export const pbtaPlaybookToToml = stringifyPlaybookToml;
export const pbtaMoveToToml = stringifyMoveToml;
