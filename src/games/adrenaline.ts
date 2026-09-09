import { GamePack } from "./types";
import { accent, palette, tokens } from "./tokens";

/**
 * Adrenaline System.
 *
 * Zombiology currently publishes the engine and its first game together. The
 * reusable visual language is warm paper with dark red bands, then near-black
 * pages with pale ink. Infection art, logos and biological marks stay out:
 * they belong to Zombiology, not to the engine.
 *
 * Both polarities are sourced. The core book prints complete light pages and
 * complete red-black pages; neither layer below is derived from the other.
 */
export const adrenalinePack: GamePack = {
	id: "adrenaline",
	label: "Adrenaline System",
	polarities: ["light", "dark"],
	style: {
		base: {
			note: {
				"--font-text-theme": '"Roboto", sans-serif',
				"--font-header-theme":
					'"Fira Sans Extra Condensed", sans-serif',
				"--font-monospace-theme": '"Courier Prime", monospace',
				"--inline-title-font":
					'"Fira Sans Extra Condensed", sans-serif',
				"--inline-title-text-transform": "uppercase",
				"--inline-title-weight": "800",
				"--h1-font": '"Fira Sans Extra Condensed", sans-serif',
				"--h1-text-transform": "uppercase",
				"--h1-weight": "800",
				"--h2-font": '"Fira Sans Extra Condensed", sans-serif',
				"--h2-text-transform": "uppercase",
				"--h2-weight": "800",
				"--h3-font": '"Fira Sans Extra Condensed", sans-serif',
				"--h3-text-transform": "uppercase",
				"--h3-weight": "700",
				"--radius-s": "1px",
				"--radius-m": "2px",
				"--radius-l": "2px",
				"--checkbox-radius": "0px",
				"--tag-radius": "1px",
				"--code-radius": "1px",
				"--link-decoration": "none",
				"--link-decoration-hover": "underline",
			},
			workspace: {},
		},
		light: {
			note: tokens(
				accent("#9D2416"),
				{
					"--background-primary": "#F0EAE1",
					"--background-primary-alt": "#E8DED3",
					"--background-secondary": "#E2D7CB",
					"--text-normal": "#211A18",
					"--text-muted": "#655A55",
					"--text-faint": "#95877F",
					"--h1-color": "#71170F",
					"--h2-color": "#8B2115",
					"--h3-color": "#9D2416",
					"--code-background": "#E2D7CB",
					"--blockquote-border-color": "#9D2416",
					"--text-highlight-bg": "#E46B463D",
					"--adrenaline-panel": "#E2D7CB",
					"--adrenaline-band": "#71170F",
					"--adrenaline-band-ink": "#FFF8F0",
					"--adrenaline-rule": "#9D2416",
				},
				palette({
					red: "#9D2416",
					orange: "#C44925",
					yellow: "#A66C16",
					green: "#4F6D45",
					cyan: "#39727A",
					blue: "#3F5874",
					purple: "#6D4D70",
					pink: "#9B4A59",
				}),
				{
					"--bold-color": "#71170F",
					"--link-color": "#9D2416",
					"--link-color-hover": "#C44925",
					"--list-marker-color": "#9D2416",
					"--checkbox-color": "#9D2416",
					"--table-header-color": "#71170F",
					"--tag-color": "#FFF8F0",
					"--tag-background": "#71170F",
				},
			),
			workspace: {
				"--background-secondary": "#E2D7CB",
				"--background-secondary-alt": "#71170F",
				"--brumes-root-split-background": "#E8DED3",
			},
		},
		dark: {
			note: tokens(
				accent("#F05A32"),
				{
					"--background-primary": "#160D0B",
					"--background-primary-alt": "#21100E",
					"--background-secondary": "#2B1210",
					"--text-normal": "#F4E9DF",
					"--text-muted": "#C9B8AD",
					"--text-faint": "#8F7B71",
					"--h1-color": "#FFF4E9",
					"--h2-color": "#F05A32",
					"--h3-color": "#E78463",
					"--code-background": "#2B1210",
					"--blockquote-border-color": "#F05A32",
					"--text-highlight-bg": "#F05A323D",
					"--adrenaline-panel": "#2B1210",
					"--adrenaline-band": "#71170F",
					"--adrenaline-band-ink": "#FFF4E9",
					"--adrenaline-rule": "#F05A32",
				},
				palette({
					red: "#F05A32",
					orange: "#E78463",
					yellow: "#D5A34B",
					green: "#82A873",
					cyan: "#69A7AD",
					blue: "#7694B4",
					purple: "#9D7AA2",
					pink: "#C77886",
				}),
				{
					"--bold-color": "#FFF4E9",
					"--link-color": "#F05A32",
					"--link-color-hover": "#E78463",
					"--list-marker-color": "#F05A32",
					"--checkbox-color": "#F05A32",
					"--table-header-color": "#FFF4E9",
					"--tag-color": "#FFF4E9",
					"--tag-background": "#71170F",
				},
			),
			workspace: {
				"--background-secondary": "#120806",
				"--background-secondary-alt": "#2B1210",
				"--brumes-root-split-background": "#100705",
			},
		},
	},
	assets: { images: {} },
};
