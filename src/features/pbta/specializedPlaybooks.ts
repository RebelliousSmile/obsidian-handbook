import {
	parseMasksPlaybookToml,
	parseMonsterOfTheWeekPlaybookToml,
	parseMonsterheartsPlaybookToml,
	parsePlaybookToml,
	parseTheSprawlPlaybookToml,
	parseUrbanShadowsPlaybookToml,
	stringifyMasksPlaybookToml,
	stringifyMonsterOfTheWeekPlaybookToml,
	stringifyMonsterheartsPlaybookToml,
	stringifyPlaybookToml,
	stringifyTheSprawlPlaybookToml,
	stringifyUrbanShadowsPlaybookToml,
	type MasksPlaybook,
	type MonsterheartsPlaybook,
	type MonsterOfTheWeekPlaybook,
	type Playbook,
	type TheSprawlPlaybook,
	type UrbanShadowsPlaybook,
} from "schema-pbta";

export type ResolvedPbtaPlaybook =
	| { target: "playbook"; data: Playbook }
	| { target: "masks-playbook"; data: MasksPlaybook }
	| { target: "monster-of-the-week-playbook"; data: MonsterOfTheWeekPlaybook }
	| { target: "monsterhearts-playbook"; data: MonsterheartsPlaybook }
	| { target: "urban-shadows-playbook"; data: UrbanShadowsPlaybook }
	| { target: "the-sprawl-playbook"; data: TheSprawlPlaybook };

const SPECIALIZED_PARSERS: Array<{
	target: Exclude<ResolvedPbtaPlaybook["target"], "playbook">;
	parse: (source: string) => ResolvedPbtaPlaybook["data"];
}> = [
	{ target: "masks-playbook", parse: parseMasksPlaybookToml },
	{ target: "monster-of-the-week-playbook", parse: parseMonsterOfTheWeekPlaybookToml },
	{ target: "monsterhearts-playbook", parse: parseMonsterheartsPlaybookToml },
	{ target: "urban-shadows-playbook", parse: parseUrbanShadowsPlaybookToml },
	{ target: "the-sprawl-playbook", parse: parseTheSprawlPlaybookToml },
];

export function parsePbtaPlaybookToml(source: string): ResolvedPbtaPlaybook | null {
	for (const candidate of SPECIALIZED_PARSERS) {
		try {
			return { target: candidate.target, data: candidate.parse(source) } as ResolvedPbtaPlaybook;
		} catch { /* Try the next canonical target. */ }
	}
	try {
		return { target: "playbook", data: parsePlaybookToml(source) };
	} catch {
		return null;
	}
}

export function stringifyPbtaPlaybookToml(playbook: ResolvedPbtaPlaybook): string {
	switch (playbook.target) {
		case "masks-playbook": return stringifyMasksPlaybookToml(playbook.data);
		case "monster-of-the-week-playbook": return stringifyMonsterOfTheWeekPlaybookToml(playbook.data);
		case "monsterhearts-playbook": return stringifyMonsterheartsPlaybookToml(playbook.data);
		case "urban-shadows-playbook": return stringifyUrbanShadowsPlaybookToml(playbook.data);
		case "the-sprawl-playbook": return stringifyTheSprawlPlaybookToml(playbook.data);
		case "playbook": return stringifyPlaybookToml(playbook.data);
	}
}
