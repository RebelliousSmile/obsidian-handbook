import {
	parseMonsterOfTheWeekMonsterToml,
	parseMonsterOfTheWeekTeamToml,
	parseMonsterOfTheWeekThreatToml,
	stringifyMonsterOfTheWeekMonsterToml,
	stringifyMonsterOfTheWeekTeamToml,
	stringifyMonsterOfTheWeekThreatToml,
	type MonsterOfTheWeekMonster,
	type MonsterOfTheWeekTeam,
	type MonsterOfTheWeekThreat,
} from "schema-pbta";
import type { BrumesBlock } from "../blocks/types";
import { renderMotwMonster } from "./motwMonster";
import { renderMotwTeam } from "./motwTeam";
import { renderMotwThreat } from "./motwThreat";
import { pbtaMonsterShape, pbtaTeamShape, pbtaThreatShape } from "./shape";

/** The specialised targets these blocks resolve from a document alone: one block per document type. */
export const PBTA_MOTW_PROJECTED_TARGETS: readonly string[] = [
	"monster-of-the-week-team",
	"monster-of-the-week-monster",
	"monster-of-the-week-threat",
];

function tryParse<T>(parse: (source: string) => T, source: string): T | null {
	try {
		return parse(source);
	} catch {
		return null;
	}
}

export const pbtaTeamBlock: BrumesBlock<MonsterOfTheWeekTeam> = {
	id: "pbta-team",
	capability: "block:pbta-team",
	flag: "pbtaParser",
	label: "PbtA team",
	icon: "users",
	shape: pbtaTeamShape,
	parse: (source) => tryParse(parseMonsterOfTheWeekTeamToml, source),
	render: (data, doc) => renderMotwTeam(data, doc),
	template: (settings) => `\`\`\`pbta-team\nslug = "new-team"\nname = "New team"\ngame = "${settings.mode}"\nenemies = []\nallies = []\nmaneuvers = []\n\`\`\`\n`,
};

export const pbtaMonsterBlock: BrumesBlock<MonsterOfTheWeekMonster> = {
	id: "pbta-monster",
	capability: "block:pbta-monster",
	flag: "pbtaParser",
	label: "PbtA monster",
	icon: "skull",
	shape: pbtaMonsterShape,
	parse: (source) => tryParse(parseMonsterOfTheWeekMonsterToml, source),
	render: (data, doc) => renderMotwMonster(data, doc),
	template: (settings) => `\`\`\`pbta-monster\nslug = "new-monster"\nname = "New monster"\ngame = "${settings.mode}"\nmonsterType = "Type"\nmotivation = "What it wants."\n\`\`\`\n`,
};

export const pbtaThreatBlock: BrumesBlock<MonsterOfTheWeekThreat> = {
	id: "pbta-threat",
	capability: "block:pbta-threat",
	flag: "pbtaParser",
	label: "PbtA threat",
	icon: "triangle-alert",
	shape: pbtaThreatShape,
	parse: (source) => tryParse(parseMonsterOfTheWeekThreatToml, source),
	render: (data, doc) => renderMotwThreat(data, doc),
	template: (settings) => `\`\`\`pbta-threat\nslug = "new-threat"\nname = "New threat"\ngame = "${settings.mode}"\nthreatType = "Type"\nmotivation = "What it wants."\n\`\`\`\n`,
};

export const pbtaTeamToToml = stringifyMonsterOfTheWeekTeamToml;
export const pbtaMonsterToToml = stringifyMonsterOfTheWeekMonsterToml;
export const pbtaThreatToToml = stringifyMonsterOfTheWeekThreatToml;
