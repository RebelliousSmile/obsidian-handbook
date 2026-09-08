import { GamePack } from "./types";
import { accent, palette, tokens } from "./tokens";

/**
 * :Otherscape.
 *
 * The first game written as a pack and nothing else: no partial, no mixin, no
 * class of its own. The values below were sampled from the core book rather
 * than guessed — the pages render to PNG under `pdftoppm`, and the dominant
 * saturated colours cluster around four:
 *
 * - a cool bluish paper, `#E8ECEF` to `#F6FAF9`, textured with a faint grid;
 * - a deep blue-teal ink, `#072437` to `#0F162F`, that grounds every dark page;
 * - the neon cyan of the cover and the character cards, `#00CBFF` to `#3FD8FF`;
 * - an acid yellow-green, `#D8FF3F` in daylight and `#98FF00` at night, which
 *   the book uses as a highlight block behind black display type.
 *
 * Cyan takes the accent because it reads in both schemes; the acid stays what
 * it is in the book, a marker, and lands on the highlight rather than on the
 * links it would make illegible on white.
 *
 * Both polarities come from the same sampling: the book prints the cool paper
 * and the blue-teal ink as facing registers, page after page, so neither is a
 * scheme derived from the other.
 *
 * The typefaces are the book's by intent, not by name: NeoTokyo, Isotonic and
 * PP Fraktion Sans are commercial, so the pack asks for the closest faces the
 * plugin already carries — a heavy condensed grotesque for display, a
 * neo-grotesque for text, a typewriter for the fiction the book sets in
 * monospace.
 */
export const otherscapePack: GamePack = {
	id: "otherscape",
	label: ":Otherscape",
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
				"--inline-title-size": "3em",
				"--h1-font": '"Fira Sans Extra Condensed", sans-serif',
				"--h1-size": "2.6em",
				"--h1-weight": "800",
				"--h1-text-transform": "uppercase",
				"--h2-font": '"Fira Sans Extra Condensed", sans-serif',
				"--h2-size": "1.9em",
				"--h2-weight": "800",
				"--h2-text-transform": "uppercase",
				"--h3-font": '"Fira Sans Extra Condensed", sans-serif',
				"--h3-size": "1.4em",
				"--h3-weight": "700",
				"--h3-text-transform": "uppercase",
				"--h4-font": '"Roboto", sans-serif',
				"--h4-text-transform": "uppercase",
				"--h4-weight": "700",
				"--h5-font": '"Roboto", sans-serif',
				"--h5-text-transform": "uppercase",
				"--h6-font": '"Roboto", sans-serif',
				"--h6-text-transform": "uppercase",
				// The Megacity is drawn in straight lines and hard edges.
				"--radius-s": "0px",
				"--radius-m": "0px",
				"--radius-l": "0px",
				"--checkbox-radius": "0px",
				"--tag-radius": "0px",
				"--code-radius": "0px",
				"--link-decoration": "none",
				"--link-decoration-hover": "underline",
				"--link-external-decoration": "none",
				"--link-external-decoration-hover": "underline",
				"--list-indent": "1.2em",
				"--blockquote-border-thickness": "3px",
			},
			workspace: {},
		},
		light: {
			note: tokens(
				accent("#0087B0"),
				{
					"--background-primary": "#F2F5F7",
					"--background-primary-alt": "#E8ECEF",
					"--background-secondary": "#E8ECEF",
					"--text-normal": "#12161B",
					"--text-muted": "#4A555F",
					"--text-faint": "#8A949D",
					// Black display type on an acid block, the way the book
					// sets every heading it wants read first.
					"--text-highlight-bg": "#D8FF3F",
					"--h1-color": "#0B1A28",
					"--h2-color": "#0B1A28",
					"--h3-color": "#0F4C63",
					"--code-background": "#E4E9ED",
					"--blockquote-border-color": "#00A8D6",
				},
				palette({
					// The book names the three theme types by colour: Self is
					// red, Mythos purple, Noise blue.
					red: "#C4384E",
					purple: "#7B4FB0",
					blue: "#2E6FA8",
					orange: "#D9702F",
					yellow: "#B8C400",
					green: "#6FA81E",
					cyan: "#0098BF",
					pink: "#D4348A",
				}),
				{
					"--bold-color": "#0B1A28",
					"--italic-color": "#12161B",
					"--link-color": "#0087B0",
					"--link-color-hover": "#00A8D6",
					"--link-unresolved-color": "#4A555F",
					"--link-external-color": "#0F4C63",
					"--link-external-color-hover": "#0087B0",
					"--list-marker-color": "#0087B0",
					"--checkbox-color": "#0087B0",
					"--checkbox-color-hover": "#00A8D6",
					"--table-header-color": "#0B1A28",
					"--tag-color": "#0B1A28",
					"--tag-background": "#D8FF3F",
					"--tag-background-hover": "#C6E82E",
				},
				// The three theme types, by the colours the book gives them. No
				// template reads these yet; phase 4 parameterises the theme card
				// with them instead of hard-coding a game in a partial.
				{
					"--brumes-theme-self": "#C4384E",
					"--brumes-theme-mythos": "#7B4FB0",
					"--brumes-theme-noise": "#2E6FA8",
				},
			),
			workspace: {
				"--background-secondary": "#E1E6EA",
				"--background-secondary-alt": "#0B1A28",
				"--brumes-root-split-background": "#EAEEF1",
			},
		},
		dark: {
			note: tokens(
				accent("#3FD8FF"),
				{
					"--background-primary": "#0A1B2A",
					"--background-primary-alt": "#0F2436",
					"--background-secondary": "#0F2436",
					"--text-normal": "#E2EAF1",
					"--text-muted": "#95A6B5",
					"--text-faint": "#5F7285",
					// At night the acid stops being a block and becomes ink:
					// the display colour of every dark page in the book.
					"--text-highlight-bg": "#98FF0033",
					"--h1-color": "#B8F53C",
					"--h2-color": "#B8F53C",
					"--h3-color": "#3FD8FF",
					"--code-background": "#0F2436",
					"--blockquote-border-color": "#3FD8FF",
				},
				palette({
					red: "#E05A6E",
					purple: "#A98BD0",
					blue: "#5D9BD4",
					orange: "#E89050",
					yellow: "#D8FF3F",
					green: "#98FF00",
					cyan: "#3FD8FF",
					pink: "#F05CA8",
				}),
				{
					"--bold-color": "#B8F53C",
					"--italic-color": "#E2EAF1",
					"--link-color": "#3FD8FF",
					"--link-color-hover": "#8FEFEF",
					"--link-unresolved-color": "#95A6B5",
					"--link-external-color": "#8FEFEF",
					"--link-external-color-hover": "#3FD8FF",
					"--list-marker-color": "#3FD8FF",
					"--checkbox-color": "#3FD8FF",
					"--checkbox-color-hover": "#8FEFEF",
					"--table-header-color": "#B8F53C",
					"--tag-color": "#0A1B2A",
					"--tag-background": "#98FF00",
					"--tag-background-hover": "#B8F53C",
				},
				{
					"--brumes-theme-self": "#E05A6E",
					"--brumes-theme-mythos": "#A98BD0",
					"--brumes-theme-noise": "#5D9BD4",
				},
			),
			workspace: {
				"--background-secondary": "#081521",
				"--background-secondary-alt": "#061019",
				"--brumes-root-split-background": "#07141F",
			},
		},
	},
	assets: {
		// Nothing is resolved yet: phase 4 moves the illustrations into the
		// vault and reads these. Declaring the roles now keeps the format
		// closed while the game has no art of its own.
		images: {},
	},
};
