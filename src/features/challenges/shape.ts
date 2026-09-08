import { BlockShape } from "../blocks/shape";

/** The zones of a Legend in the Mist challenge, as the renderer draws them. */
export const challengeShape: BlockShape = {
	root: "brumes-challenge",
	zones: [
		{ name: "header", holds: "the name, the roles, then the rating" },
		{
			name: "description",
			holds: "the description, one paragraph per line",
			optional: true,
		},
		{
			name: "limits",
			holds: "the limits, each with its rating and its consequence",
			optional: true,
		},
		{
			name: "might",
			holds: "the might aspects, each with its level and vulnerability",
			optional: true,
		},
		{ name: "tags", holds: "the tags and statuses", optional: true },
		{
			name: "features",
			holds: "the special features, each a name and an effect",
			optional: true,
		},
		{
			name: "threats",
			holds: "the threats, each a name, a trigger and its consequences",
			optional: true,
		},
		{
			name: "general-consequences",
			holds: "the consequences that hold for the whole challenge",
			optional: true,
		},
		{
			name: "secrets",
			holds: "the secrets, each an optional label and its text",
			optional: true,
		},
		{
			name: "source",
			holds: "where the challenge comes from, read from its meta block",
			optional: true,
		},
	],
	gaps: [
		"Every zone but the header and the source also carries brumes-challenge--section and opens with its own heading.",
		"A might aspect adds brumes-challenge--might--<level> and a limit in progress adds brumes-challenge--limit--progress. Both are states of a zone's contents, which no zone names.",
	],
};
