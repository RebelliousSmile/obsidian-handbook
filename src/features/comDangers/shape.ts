import { BlockShape } from "../blocks/shape";

/** The zones of a City of Mist danger profile, as the renderer draws them. */
export const comDangerShape: BlockShape = {
	root: "brumes-com-danger",
	zones: [
		{ name: "header", holds: "the danger's name, then its rating" },
		{
			name: "description",
			holds: "the description, one paragraph per line",
			optional: true,
		},
		{
			name: "spectrums",
			holds: "the defeat spectrums, each with its outcome",
			optional: true,
		},
		{
			name: "countdown",
			holds: "the countdown spectrums, drawn apart from the others",
			optional: true,
		},
		{
			name: "moves",
			holds: "the moves, each a label, a name and its text",
			optional: true,
		},
		{
			name: "source",
			holds: "where the danger comes from, read from its meta block",
			optional: true,
		},
	],
	gaps: [
		"Every zone but the header and the source also carries brumes-com-danger--section and opens with its own heading.",
		// One list, split in two by a field of its items. The zones name the
		// result; nothing here says the split happened.
		"The spectrums and countdown zones are one parsed list split by each spectrum's kind.",
	],
};
