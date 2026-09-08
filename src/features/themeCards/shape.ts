import { BlockShape } from "../blocks/shape";

/** The zones of a Legend in the Mist theme card, as the renderer draws them. */
export const themeCardShape: BlockShape = {
	root: "brumes-story-theme",
	image: "theme-card",
	zones: [
		{
			name: "category",
			holds: "the themebook the card is cut from, in capitals",
			optional: true,
		},
		{
			name: "title-box",
			holds: "the title tag, which is the card's first power tag",
		},
		{
			name: "tags",
			holds: "the power tags, then the weakness tags, in one list",
		},
	],
	gaps: [
		// The frame is not one image but four, chosen by might level, and the
		// might badge is a pseudo-element with no zone of its own. A shape that
		// only names one image role is telling half the truth about this card.
		"The frame image depends on the might level: theme-card, then theme-card-origin, -adventure or -greatness on top of it.",
		"The might badge is drawn by ::after on the root, reading card-might-origin, -adventure or -greatness. No zone holds it.",
	],
};
