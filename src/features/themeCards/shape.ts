import { BlockShape } from "../blocks/shape";

/** The zones of a Legend in the Mist theme card, as the renderer draws them. */
export const themeCardShape: BlockShape = {
	block: "theme-card",
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
	// Both lines below are the same refusal, and it stands: what they describe
	// depends on a value inside the card, not on a place in it. A vocabulary
	// able to name them would be a copy of this renderer's data model, and a
	// consumer with a model of its own could do nothing with it.
	gaps: [
		"The frame image depends on the might level: theme-card, then theme-card-origin, -adventure or -greatness on top of it.",
		"The might badge is drawn by ::after on the root, reading card-might-origin, -adventure or -greatness. No zone holds it.",
	],
};
