import { BlockShape } from "../blocks/shape";

const SECTION = "brumes-challenge--section";

/** The zones of a Legend in the Mist challenge, as the renderer draws them. */
export const challengeShape: BlockShape = {
	block: "litm-challenge",
	root: "brumes-challenge",
	zones: [
		{ name: "header", holds: "the name, the roles, then the rating" },
		{
			name: "description",
			holds: "the description, one paragraph per line",
			family: SECTION,
			optional: true,
		},
		{
			name: "limits",
			holds: "the limits, each with its rating and its consequence",
			heading: "Limits",
			family: SECTION,
			optional: true,
		},
		{
			name: "might",
			holds: "the might aspects, each with its level and vulnerability",
			heading: "Might",
			family: SECTION,
			optional: true,
		},
		{
			name: "tags",
			holds: "the tags and statuses",
			heading: "Tags & statuses",
			family: SECTION,
			optional: true,
		},
		{
			name: "features",
			holds: "the special features, each a name and an effect",
			heading: "Special features",
			family: SECTION,
			optional: true,
		},
		{
			name: "threats",
			holds: "the threats, each a name, a trigger and its consequences",
			heading: "Threats & consequences",
			family: SECTION,
			optional: true,
		},
		{
			name: "general-consequences",
			holds: "the consequences that hold for the whole challenge",
			heading: "General consequences",
			family: SECTION,
			optional: true,
		},
		{
			name: "secrets",
			holds: "the secrets, each an optional label and its text",
			heading: "Secrets",
			family: SECTION,
			optional: true,
		},
		{
			name: "source",
			holds: "where the challenge comes from, read from its meta block",
			optional: true,
		},
	],
	// Kept as a gap on purpose: a might level and a limit in progress are
	// states of what a zone holds, not places a zone could name.
	gaps: [
		"A might aspect adds brumes-challenge--might--<level> and a limit in progress adds brumes-challenge--limit--progress. Both are states of a zone's contents, which no zone names.",
	],
};
