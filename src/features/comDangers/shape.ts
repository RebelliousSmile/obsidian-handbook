import { BlockShape } from "../blocks/shape";

const SECTION = "brumes-com-danger--section";

/** The zones of a City of Mist danger profile, as the renderer draws them. */
export const comDangerShape: BlockShape = {
	block: "com-danger",
	root: "brumes-com-danger",
	zones: [
		{ name: "header", holds: "the danger's name, then its rating" },
		{
			name: "description",
			holds: "the description, one paragraph per line",
			family: SECTION,
			optional: true,
		},
		{
			name: "spectrums",
			holds: "the defeat spectrums, each with its outcome",
			heading: "Spectrums",
			family: SECTION,
			optional: true,
		},
		{
			name: "countdown",
			holds: "the countdown spectrums, drawn apart from the others",
			heading: "Countdown spectrums",
			family: SECTION,
			optional: true,
		},
		{
			name: "moves",
			holds: "the moves, each a label, a name and its text",
			heading: "Moves",
			family: SECTION,
			optional: true,
		},
		{
			name: "source",
			holds: "where the danger comes from, read from its meta block",
			optional: true,
		},
	],
	// Kept as a gap on purpose: the split is decided by a field of the parsed
	// spectrums, so the zones name its result and nothing here can name the
	// rule that produced it.
	gaps: [
		"The spectrums and countdown zones are one parsed list split by each spectrum's kind.",
	],
};
