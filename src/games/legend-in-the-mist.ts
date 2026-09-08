import { GamePack } from "./types";
import { accent, palette, tokens } from "./tokens";

/**
 * Legend in the Mist.
 *
 * One polarity, and it is a statement about the books rather than a gap: the
 * line is printed on parchment and never had a dark scheme. So the light
 * layer holds whichever theme the vault is set to — a note stays parchment in
 * a dark Obsidian instead of falling back on a bare `base` that carries fonts
 * and no colours at all.
 *
 * There was a dark scheme here until the polarities were declared. It was the
 * plugin's own invention — warm leather rather than grey parchment, and quite
 * defensible as a design — but nothing in the game sourced it, and a scheme
 * nobody can trace back to a page is indistinguishable, once rendered, from
 * one that was. It is in the history of this file if it is ever wanted as a
 * pack of its own.
 */
export const legendInTheMistPack: GamePack = {
	id: "legend-in-the-mist",
	label: "Legend in the Mist",
	polarities: ["light"],
	style: {
		base: {
			note: {
				"--font-text-theme": '"Labrada", sans-serif',
				"--font-header-theme": '"PragRoman", sans-serif',
				"--inline-title-font": '"PragRoman", sans-serif',
				"--inline-title-text-transform": "uppercase",
				"--inline-title-weight": "700",
				"--h1-font": '"PragRoman", sans-serif',
				"--h1-text-transform": "uppercase",
				"--h2-font": '"PragRoman", sans-serif',
				"--h2-text-transform": "none",
				"--h3-font": '"PragRoman", sans-serif',
				"--h3-text-transform": "uppercase",
				"--h3-weight": "400",
				"--h3-size": "1em",
				"--list-indent": "0em",
				"--list-spacing": "0.2em",
				"--list-bullet-size": "0.25em",
			},
			workspace: {},
		},
		light: {
			note: tokens(
				accent("#752B2B"),
				{
					"--background-primary": "#EFEAE6",
					"--background-primary-alt": "#C1353500",
					"--text-normal": "#000000",
					"--h1-color": "#752B2B",
					"--h2-color": "#752B2B",
					"--h3-color": "#915656",
				},
				palette({
					red: "#762B2C",
					orange: "#7D3C3D",
					yellow: "#EFD693",
					green: "#4D8061",
					blue: "#5C5C92",
					cyan: "#69ACC6",
					purple: "#3A3159",
					pink: "#A27FA0",
				}),
				{
					"--bold-color": "#000000",
					"--link-color": "#752B2B",
					"--link-unresolved-color": "#915656",
					"--link-external-color": "#5C5C91",
					"--link-external-color-hover": "#5E5EB0",
					"--list-marker-color": "#000000",
					"--table-header-color": "#422513",
					"--brumes-table-ink": "#000000",
					"--brumes-table-header-paper": "#DAC5B2",
					"--brumes-table-row-paper": "#E5DCCB",
					// The three tiers of might, named by role rather than by
					// colour. The theme card reads them from here; the
					// mountain cards restate them, because a canvas card is
					// opened in a document these never reach — the reason is
					// written at the top of `_mountain.scss`.
					"--brumes-might-origin-color": "#4D8061",
					"--brumes-might-adventure-color": "#7D3C3D",
					"--brumes-might-greatness-color": "#5C5C92",
					// The box a player ticks: leather on the parchment the
					// note is printed on.
					"--checkbox-color": "#AA9B82",
					"--checkbox-marker-color": "#EFEAE6",
					// The four highlighter marks.
					// Vol. II - The Narrator | p.87
					"--brumes-power-color": "#EFD693",
					"--brumes-status-color": "#BCCDB0",
					"--brumes-limit-color": "#D9B2AA",
					"--brumes-weakness-color": "#EDBB89",
				},
			),
			workspace: {
				"--background-secondary": "#DFD7CA",
				"--background-secondary-alt": "#DACDBC",
				"--brumes-root-split-background": "#EEEAE1",
			},
		},
		// Not written, and not left half-written either: the polarities above
		// say the game sources one, so the reader never reaches this. It is
		// empty rather than absent because the three layers are the shape of a
		// pack, and a pack that carries a scheme it does not declare would be a
		// polarity waiting to be turned on by accident.
		dark: { note: {}, workspace: {} },
	},
	assets: {
		// See the note in the City of Mist pack: the illustrations live in the
		// vault. This game carries most of them, the four theme card frames
		// included.
		images: {
			"inline-title-rule": "inline-title-rule.svg",
			"heading-2-rule": "heading-2-rule.svg",
			"separator": "separator.svg",
			"checkbox-minus": "checkbox-minus.svg",
			"checkbox-plus": "checkbox-plus.svg",
			"checkbox-tilde": "checkbox-tilde.svg",
			"weakness-mark": "weakness-mark.svg",
			"limit-mark": "limit-mark.svg",
			"limit-mark-empty": "limit-mark-empty.svg",
			// The might icons come twice over, once tinted for the canvas card
			// and once for the theme card. Same shape, different fill, and a
			// background image cannot be recoloured by CSS.
			"mountain-might-origin": "mountain-might-origin.svg",
			"mountain-might-adventure": "mountain-might-adventure.svg",
			"mountain-might-greatness": "mountain-might-greatness.svg",
			"card-might-origin": "card-might-origin.svg",
			"card-might-adventure": "card-might-adventure.svg",
			"card-might-greatness": "card-might-greatness.svg",
			"theme-card": "theme-card.png",
			"theme-card-origin": "theme-card-origin.png",
			"theme-card-adventure": "theme-card-adventure.png",
			"theme-card-greatness": "theme-card-greatness.png",
		},
		// PragRoman is free to use and free to give away, but its licence
		// forbids including it in a product — which a plugin release is. It
		// therefore leaves the bundle and is asked for like an illustration:
		// present, the headings are the book's; absent, every token that
		// names it falls through to the next family in its stack.
		fonts: {
			PragRoman: { file: "fonts/pragroman.ttf", weight: "500" },
		},
	},
};
