import { BlockShape } from "../blocks/shape";

/** The zones of a Legend in the Mist journey, as the renderer draws them. */
export const journeyShape: BlockShape = {
	root: "brumes-journey",
	zones: [
		{ name: "header", holds: "the journey's type, then its name" },
		{
			name: "description",
			holds: "the description, one paragraph per line",
			optional: true,
		},
		{ name: "tags", holds: "the journey's tags", optional: true },
		{
			name: "benefits",
			holds: "what completing the journey earns",
			optional: true,
		},
		{
			name: "consequences",
			holds: "the consequences that hold for the whole journey",
			optional: true,
		},
		{
			name: "vignettes",
			holds: "the vignettes, each a name, a trigger and its consequences",
			optional: true,
		},
	],
	gaps: [
		// Every zone but the header opens with a heading the shape cannot name,
		// because a heading is neither a zone of its own nor a property of one.
		"Every zone but the header also carries brumes-journey--section and opens with its own heading.",
	],
};
