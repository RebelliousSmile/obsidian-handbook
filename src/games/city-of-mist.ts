import { GamePack } from "./types";
import { accent, palette, tokens } from "./tokens";

/**
 * City of Mist.
 *
 * The light scheme is the one the v1 preset carried. The dark scheme lived in
 * `theme/CoM_dark.json` and was lost with the theme folder; it is restored
 * here, completed to cover the roles the light scheme covers.
 */
export const cityOfMistPack: GamePack = {
	id: "city-of-mist",
	label: "City of Mist",
	style: {
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
	},
	assets: {
		// The illustrations the blocks ask for, keyed by the role the SCSS
		// reads them under. They live in the vault rather than in the bundle:
		// the artwork of a published game is the reader's copy to hold, and the
		// theme card frames alone weighed 2.48 MB of the stylesheet.
		images: {
			"callout-edge": "callout-edge.svg",
			"iceberg-location": "iceberg-location.svg",
			"iceberg-character": "iceberg-character.svg",
			"iceberg-group": "iceberg-group.svg",
		},
	},
};
