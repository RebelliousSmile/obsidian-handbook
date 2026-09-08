import { BrumesBlock } from "../blocks/types";
import { ChallengeData, parseChallenge } from "./parser";
import { renderChallenge } from "./renderer";
import { challengeShape } from "./shape";

function challengeTemplate(): string {
	return [
		"```litm-challenge",
		"{Challenge name}",
		"roles: role, role",
		"rating: 3",
		": What this challenge is, in one line.",
		"LIMITS",
		"Limit 2",
		"Progress limit 4 > What happens when it fills.",
		"MIGHT",
		"adventure: Aspect (vulnerability)",
		"TAGS",
		"{a tag} status-2",
		"FEATURES",
		"Feature name > What it does.",
		"THREATS",
		"Threat : When it triggers.",
		"> A consequence (effect)",
		"CONSEQUENCES",
		"What it does when nothing else applies.",
		"SECRETS",
		"Label: What the narrator knows.",
		"```",
		"",
	].join("\n");
}

export const challengeBlock: BrumesBlock<ChallengeData> = {
	id: "litm-challenge",
	mode: "legend-in-the-mist",
	flag: "challengeParser",
	label: "Challenge",
	icon: "swords",
	shape: challengeShape,
	parse: parseChallenge,
	render: renderChallenge,
	template: challengeTemplate,
};
