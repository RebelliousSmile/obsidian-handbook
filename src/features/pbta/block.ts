import {
	parseMoveToml,
	stringifyMoveToml,
	type MonsterheartsPlaybook,
	type Move,
	type UrbanShadowsPlaybook,
} from "schema-pbta";
import type { BrumesBlock } from "../blocks/types";
import { renderPbtaMove, renderPbtaPlaybook } from "./renderer";
import { renderMonsterheartsLayout } from "./monsterheartsLayout";
import { renderUrbanShadowsLayout } from "./urbanShadowsLayout";
import { pbtaMoveShape, pbtaPlaybookShape } from "./shape";
import { parsePbtaPlaybookToml, stringifyPbtaPlaybookToml, type ResolvedPbtaPlaybook } from "./specializedPlaybooks";

type PlaybookLayout = (resolved: ResolvedPbtaPlaybook, doc: Document, resolveImage?: (path: string) => string | null) => HTMLElement;

/** A pack draws its playbook itself for one target; any other pairing falls back to the generic rendering. */
const PLAYBOOK_LAYOUTS: Record<string, Record<string, PlaybookLayout>> = {
	"monsterhearts": {
		"monsterhearts-playbook": (resolved, doc, resolveImage) => renderMonsterheartsLayout(resolved.data as MonsterheartsPlaybook, doc, resolveImage),
	},
	"urban-shadows": {
		"urban-shadows-playbook": (resolved, doc, resolveImage) => renderUrbanShadowsLayout(resolved.data as UrbanShadowsPlaybook, doc, resolveImage),
	},
};

function safeParse<T>(parse: (source: string) => T, source: string): T | null {
	try { return parse(source); } catch { return null; }
}

export const pbtaPlaybookBlock: BrumesBlock<ResolvedPbtaPlaybook> = {
	id: "pbta-playbook",
	capability: "block:pbta-playbook",
	handout: true,
	flag: "pbtaParser",
	label: "PbtA character playbook",
	icon: "book-user",
	shape: pbtaPlaybookShape,
	parse: parsePbtaPlaybookToml,
	render: (data, doc, context) => {
		const layout = context?.packId ? PLAYBOOK_LAYOUTS[context.packId]?.[data.target] : undefined;
		return layout ? layout(data, doc, context?.resolveImage) : renderPbtaPlaybook(data, doc);
	},
	template: (settings) => `\`\`\`pbta-playbook\nslug = "new-playbook"\nname = "New playbook"\ngame = "${settings.mode}"\ndescription = "Describe this playbook."\nmoves = []\n\n[stats]\n\`\`\`\n`,
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

export const pbtaPlaybookToToml = stringifyPbtaPlaybookToml;
export const pbtaMoveToToml = stringifyMoveToml;
