import { BrumesMode } from "../../settings/types";

/**
 * A game used to be dressed by a Style Settings preset imported by hand into
 * the Border theme. The values now live here, and the plugin writes them
 * itself into a style element it owns.
 *
 * Two sets per game, on purpose:
 *
 * - `note` dresses the note (colours, fonts, links, lists, callouts);
 * - `workspace` repaints everything around it, and is only written when the
 *   `workspaceTheme` flag is on. Without that split the flag loses its point.
 */
export type GameStyleTokens = Record<string, string>;

export interface GameStyleLayer {
	note: GameStyleTokens;
	workspace: GameStyleTokens;
}

export interface GameStyleValues {
	/** Written whatever the colour scheme is: fonts, sizes, decorations. */
	base: GameStyleLayer;
	/** Written under `.theme-light` only. */
	light: GameStyleLayer;
	/** Written under `.theme-dark` only. */
	dark: GameStyleLayer;
}

const EMPTY_LAYER: GameStyleLayer = { note: {}, workspace: {} };

function parseHex(hex: string): number[] | null {
	const value = hex.charAt(0) === "#" ? hex.substring(1) : hex;
	if (value.length < 6) {
		return null;
	}

	const channels = [
		parseInt(value.substring(0, 2), 16),
		parseInt(value.substring(2, 4), 16),
		parseInt(value.substring(4, 6), 16),
	];

	for (const channel of channels) {
		if (isNaN(channel)) {
			return null;
		}
	}

	return channels;
}

function round(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

/**
 * Obsidian reads a named colour twice: `--color-red` for a plain value, and
 * `--color-red-rgb` for the triple it composes into `rgba()` — callouts and
 * highlights go through the second one. Writing only the first leaves half
 * the interface on the installed theme's palette.
 */
function palette(colors: GameStyleTokens): GameStyleTokens {
	const result: GameStyleTokens = {};

	for (const name of Object.keys(colors)) {
		const hex = colors[name];
		result["--color-" + name] = hex;

		const channels = parseHex(hex);
		if (channels) {
			result["--color-" + name + "-rgb"] =
				channels[0] + ", " + channels[1] + ", " + channels[2];
		}
	}

	return result;
}

/**
 * What the `accent-color-override` toggle of the preset did: the accent is
 * not one colour in Obsidian but a triple of hue, saturation and lightness,
 * from which the interface derives its hovers and its active states.
 */
function accent(hex: string): GameStyleTokens {
	const result: GameStyleTokens = {
		"--color-accent": hex,
		"--interactive-accent": hex,
	};

	const channels = parseHex(hex);
	if (!channels) {
		return result;
	}

	const r = channels[0] / 255;
	const g = channels[1] / 255;
	const b = channels[2] / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const lightness = (max + min) / 2;
	const delta = max - min;

	let hue = 0;
	let saturation = 0;

	if (delta !== 0) {
		saturation = delta / (1 - Math.abs(2 * lightness - 1));

		if (max === r) {
			hue = 60 * (((g - b) / delta) % 6);
		} else if (max === g) {
			hue = 60 * ((b - r) / delta + 2);
		} else {
			hue = 60 * ((r - g) / delta + 4);
		}

		if (hue < 0) {
			hue += 360;
		}
	}

	result["--accent-h"] = String(round(hue, 2));
	result["--accent-s"] = round(saturation * 100, 2) + "%";
	result["--accent-l"] = round(lightness * 100, 2) + "%";

	return result;
}

/** Assemble a layer from several records, later ones winning. */
function tokens(...parts: GameStyleTokens[]): GameStyleTokens {
	const merged: GameStyleTokens = {};

	for (const part of parts) {
		for (const name of Object.keys(part)) {
			merged[name] = part[name];
		}
	}

	return merged;
}

const CITY_OF_MIST: GameStyleValues = {
	base: {
		note: {
			"--font-text-theme": '"PT Serif", serif',
			"--font-header-theme":
				'"Fira Sans Extra Condensed", sans-serif',
			// The v1 theme printed only the top three levels in the
			// condensed face. Below them a heading is a paragraph label,
			// not a case title, so it stays in the body serif.
			"--h4-font": '"PT Serif", serif',
			"--h5-font": '"PT Serif", serif',
			"--h6-font": '"PT Serif", serif',
			"--h6-size": "1.1em",
			"--inline-title-font":
				'"Fira Sans Extra Condensed", sans-serif',
			"--inline-title-text-transform": "uppercase",
			"--inline-title-weight": "800",
			"--inline-title-size": "3em",
			"--h1-font": '"Fira Sans Extra Condensed", sans-serif',
			"--h1-size": "3em",
			"--h1-weight": "800",
			"--h1-text-transform": "uppercase",
			"--h2-font": '"Fira Sans Extra Condensed", sans-serif',
			"--h2-size": "2em",
			"--h2-weight": "800",
			"--h2-text-transform": "uppercase",
			"--h3-font": '"PT Serif", serif',
			"--h3-text-transform": "uppercase",
			"--h4-text-transform": "uppercase",
			"--h5-text-transform": "uppercase",
			"--h6-text-transform": "uppercase",
			"--link-decoration": "underline",
			"--link-decoration-hover": "underline",
			"--link-decoration-thickness": "2px",
			"--link-external-decoration": "underline",
			"--link-external-decoration-hover": "underline",
			"--list-indent": "0em",
			"--checkbox-radius": "0px",
		},
		workspace: {},
	},
	light: {
		note: tokens(
			accent("#E6007E"),
			{
				"--background-primary": "#FFFCF7",
				"--background-primary-alt": "#00000000",
			},
			palette({
				red: "#EE5662",
				orange: "#A95B48",
				yellow: "#FFF1A2",
				green: "#D9E8AE",
				blue: "#2B4E75",
				cyan: "#00C2F4",
				purple: "#512B71",
				pink: "#E6007E",
			}),
			{
				"--bold-color": "#000000",
				"--italic-color": "#000000",
				"--link-color": "#000000",
				"--link-color-hover": "#000000",
				"--link-external-color": "#000000",
				"--link-external-color-hover": "#000000",
				"--link-unresolved-color": "#000000",
				"--list-marker-color": "#000000",
				"--checkbox-color": "#842837",
				"--checkbox-color-hover": "#842837",
				"--tag-color": "#000000",
				"--tag-background": "#FFF1A200",
				"--tag-background-hover": "#00000000",
			},
		),
		workspace: {
			"--background-secondary": "#ECEAE5",
			"--background-secondary-alt": "#281C34",
		},
	},
	dark: {
		// The v1 dark scheme lived in `theme/CoM_dark.json` and was lost when
		// the theme folder went. These are its values, completed to cover the
		// roles the light scheme covers.
		note: tokens(
			accent("#E6007E"),
			{
				"--background-primary": "#2A273F",
				"--background-primary-alt": "#00000000",
				"--text-normal": "#E0DEF4",
				"--text-muted": "#908CAA",
				"--text-faint": "#6E6A86",
			},
			palette({
				red: "#EE5662",
				orange: "#C97A63",
				yellow: "#EAD98A",
				green: "#9FBE7A",
				blue: "#7AA2C8",
				cyan: "#00C2F4",
				purple: "#A98BD0",
				pink: "#E6007E",
			}),
			{
				"--bold-color": "#E0DEF4",
				"--italic-color": "#E0DEF4",
				"--link-color": "#E0DEF4",
				"--link-color-hover": "#FFFFFF",
				"--link-external-color": "#C4C0E0",
				"--link-external-color-hover": "#E0DEF4",
				"--link-unresolved-color": "#908CAA",
				"--list-marker-color": "#908CAA",
				"--checkbox-color": "#C4566A",
				"--checkbox-color-hover": "#D9707F",
				"--tag-color": "#E0DEF4",
				"--tag-background": "#00000000",
				"--tag-background-hover": "#00000000",
			},
		),
		workspace: {
			"--background-secondary": "#232136",
			"--background-secondary-alt": "#393552",
		},
	},
};

const LEGEND_IN_THE_MIST: GameStyleValues = {
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
		// The game never had a dark scheme. This one keeps its warm leather
		// register instead of turning the parchment grey.
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
};

const OTHERSCAPE: GameStyleValues = {
	base: EMPTY_LAYER,
	light: EMPTY_LAYER,
	dark: EMPTY_LAYER,
};

const GAME_STYLE_VALUES: Record<BrumesMode, GameStyleValues> = {
	"city-of-mist": CITY_OF_MIST,
	"legend-in-the-mist": LEGEND_IN_THE_MIST,
	otherscape: OTHERSCAPE,
};

export function getGameStyleValues(mode: BrumesMode): GameStyleValues {
	return GAME_STYLE_VALUES[mode];
}
