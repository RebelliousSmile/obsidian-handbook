import { BlockShape } from "../blocks/shape";

/** The zones of a City of Mist theme card, as the renderer draws them. */
export const comThemeCardShape: BlockShape = {
	root: "brumes-com-theme-card",
	zones: [
		{ name: "header", holds: "the themebook, then the card's title" },
		{
			name: "drive",
			holds: "the drive's label, then the question it asks",
			optional: true,
		},
		{
			name: "tags",
			holds: "the power tags, then the weakness tags, in one list",
			optional: true,
		},
		{
			name: "improvements",
			holds: "the improvements, each a name and an effect",
			optional: true,
		},
		{
			name: "tracks",
			holds: "the attention track, then the deterioration track",
			optional: true,
		},
	],
	gaps: [
		// The card says something about itself that the vocabulary cannot: that
		// it disagrees with its own themebook.
		"The card's type adds brumes-com-theme-card--<type> to the root, and a drive or a track that contradicts the themebook adds brumes-com-theme-card--mismatch. Neither is a zone.",
	],
};
