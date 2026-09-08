import { BlockShape } from "../blocks/shape";

/** The zones of a Legend in the Mist theme kit, as the renderer draws them. */
export const themeKitShape: BlockShape = {
	root: "brumes-theme-kit",
	zones: [
		{
			name: "category",
			holds: "the themebook the kit belongs to, in capitals",
			optional: true,
		},
		{ name: "name", holds: "the kit's name" },
		{ name: "power-tags", holds: "the power tags", optional: true },
		{ name: "weakness-tags", holds: "the weakness tags", optional: true },
		{ name: "quest", holds: "the quest the kit answers", optional: true },
		{
			name: "improvement",
			holds: "the improvement's name, then its effect",
			optional: true,
		},
	],
	gaps: [
		// Two zones sharing a third class is exactly what the vocabulary has no
		// word for: a zone is a place, not a family.
		"Both tag lists also carry brumes-theme-kit--tags, which no zone names.",
	],
};
