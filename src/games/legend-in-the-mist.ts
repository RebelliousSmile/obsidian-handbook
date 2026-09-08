import { GamePack } from "./types";
import { accent, palette, tokens } from "./tokens";

/**
 * Legend in the Mist.
 *
 * The game never had a dark scheme. The one here keeps its warm leather
 * register instead of turning the parchment grey.
 */
export const legendInTheMistPack: GamePack = {
	id: "legend-in-the-mist",
	label: "Legend in the Mist",
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
				},
			),
			workspace: {
				"--background-secondary": "#DFD7CA",
				"--background-secondary-alt": "#DACDBC",
				"--brumes-root-split-background": "#EEEAE1",
			},
		},
		dark: {
			note: tokens(
				accent("#C4776F"),
				{
					"--background-primary": "#1F1B17",
					"--background-primary-alt": "#00000000",
					"--text-normal": "#E8DFD2",
					"--text-muted": "#A99C8A",
					"--text-faint": "#756A5C",
					"--h1-color": "#C4776F",
					"--h2-color": "#C4776F",
					"--h3-color": "#D19C94",
				},
				palette({
					red: "#C4776F",
					orange: "#C08A70",
					yellow: "#EFD693",
					green: "#7FB08F",
					blue: "#9A9AD4",
					cyan: "#8FC8DC",
					purple: "#8E82BE",
					pink: "#C6A6C4",
				}),
				{
					"--bold-color": "#E8DFD2",
					"--link-color": "#C4776F",
					"--link-color-hover": "#D89C93",
					"--link-unresolved-color": "#A98A86",
					"--link-external-color": "#9A9AD4",
					"--link-external-color-hover": "#B0B0E4",
					"--list-marker-color": "#A99C8A",
					"--table-header-color": "#D8B78A",
				},
			),
			workspace: {
				"--background-secondary": "#191512",
				"--background-secondary-alt": "#14100D",
				"--brumes-root-split-background": "#16130F",
			},
		},
	},
};
