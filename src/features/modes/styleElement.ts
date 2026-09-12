import { BrumesMode, ColourScheme } from "../../settings/types";
import {
	GamePolarity,
	GameStyleLayer,
	GameStyleTokens,
	GameStyleValues,
} from "../../games/types";
import {
	BLOCK_SCOPE_CLASS,
	COLOUR_SCHEME_DARK_CLASS,
	COLOUR_SCHEME_LIGHT_CLASS,
	WORKSPACE_THEME_CLASS,
} from "./domModeClass";

const STYLE_ELEMENT_ID = "brumes-game-style";

/**
 * A value never legitimately closes a declaration or a block. Dropping those
 * characters keeps a malformed pack from writing rules of its own once packs
 * stop coming from the bundle.
 */
function sanitizeValue(value: string): string {
	return value.replace(/[{};<>]/g, "").trim();
}

function renderTokens(tokens: GameStyleTokens, indent: string): string {
	const lines: string[] = [];

	for (const name of Object.keys(tokens)) {
		const value = sanitizeValue(tokens[name]);
		if (!value) {
			continue;
		}

		lines.push(`${indent}${name}: ${value};`);
	}

	return lines.join("\n");
}

function renderTokenBlock(selector: string, tokens: GameStyleTokens): string {
	const declarations = renderTokens(tokens, "\t");

	if (!declarations) {
		return "";
	}

	return `${selector} {\n${declarations}\n}`;
}

function renderLayer(
	noteSelector: string,
	workspaceSelector: string,
	layer: GameStyleLayer,
	withWorkspace: boolean,
): string {
	const blocks = [renderTokenBlock(noteSelector, layer.note)];

	if (withWorkspace) {
		blocks.push(renderTokenBlock(workspaceSelector, layer.workspace));
	}

	return blocks.filter((block) => block.length > 0).join("\n\n");
}

function polarityClass(
	polarity: GamePolarity,
	colourScheme: ColourScheme,
): string {
	if (colourScheme === polarity) {
		return `.${
			polarity === "light"
				? COLOUR_SCHEME_LIGHT_CLASS
				: COLOUR_SCHEME_DARK_CLASS
		}`;
	}

	return `.theme-${polarity}`;
}

function noteSelector(
	mode: BrumesMode,
	polarity?: GamePolarity,
	colourScheme: ColourScheme = "obsidian",
): string {
	const modeClass = `brumes--${mode}`;
	const themeClass = polarity
		? polarityClass(polarity, colourScheme)
		: "";
	const localScope = `.${BLOCK_SCOPE_CLASS}.${modeClass}`;

	return [
		`body.${modeClass}${themeClass} .workspace-leaf-content[data-type="markdown"]`,
		`body.${modeClass}${themeClass} .markdown-source-view`,
		`body.${modeClass}${themeClass} .markdown-reading-view`,
		// Obsidian's real PDF export (`printToPdf()`) reuses `document.body` —
		// keeping our mode/theme classes — but appends its rendered content in a
		// sibling `.print .markdown-preview-view`, never nested under
		// `.markdown-reading-view`/`.markdown-source-view` (confirmed by reading
		// `obsidian.asar`). Without this variant, every custom property this
		// function's callers write (cartouche colours, rules, fonts…) is simply
		// absent from that subtree, whatever `src/styles/**/*.scss` selectors
		// then try to read from it.
		`body.${modeClass}${themeClass} .print .markdown-preview-view`,
		polarity ? `body${themeClass} ${localScope}` : localScope,
	].join(",\n");
}

function workspaceSelector(
	mode: BrumesMode,
	polarity?: GamePolarity,
	colourScheme: ColourScheme = "obsidian",
): string {
	const themeClass = polarity
		? polarityClass(polarity, colourScheme)
		: "";
	return `body.brumes--${mode}.${WORKSPACE_THEME_CLASS}${themeClass}`;
}

/**
 * Build the whole style of a game as one block.
 *
 * The variants are written as compound selectors — `.brumes--<mode>.theme-dark`
 * and not `.theme-dark` alone. Both classes sit on the same `body`: at equal
 * specificity only source order would decide, and nothing guarantees our
 * sheet comes after the active theme's.
 *
 * How many variants get written is the pack's to say, never this function's to
 * guess:
 *
 * - two polarities and the vault's theme picks, on those compound selectors;
 * - one, and it is written on the bare mode selector, after `base` and so
 *   above it — the game holds its own register whichever theme is active,
 *   rather than losing its colours the moment someone toggles a scheme it
 *   never had;
 * - none, and `base` is all there is. A layer the pack did not declare is not
 *   written, and not written as a copy of `base` either.
 *
 * Note declarations land on Markdown views and on the local scope attached to
 * rendered blocks. Workspace declarations land on `body` only while the
 * workspace toggle class is present. This keeps a game's paper and ink inside
 * notes without starving code-block widgets whose document missed the body
 * mode class during an Obsidian live-preview refresh.
 */
export function buildGameStyle(
	mode: BrumesMode,
	values: GameStyleValues,
	workspaceTheme: boolean,
	polarities: GamePolarity[] = [],
	colourScheme: ColourScheme = "obsidian",
): string {
	const blocks = [
		renderLayer(
			noteSelector(mode),
			workspaceSelector(mode),
			values.base,
			workspaceTheme,
		),
	];

	if (polarities.length === 1) {
		// Same selector as `base`, written after it: at equal specificity the
		// later block wins, which is exactly the relation wanted here.
		blocks.push(
			renderLayer(
				noteSelector(mode),
				workspaceSelector(mode),
				values[polarities[0]],
				workspaceTheme,
			),
		);
	} else if (colourScheme === "obsidian") {
		for (const polarity of polarities) {
			blocks.push(
				renderLayer(
					noteSelector(mode, polarity, colourScheme),
					workspaceSelector(mode, polarity, colourScheme),
					values[polarity],
					workspaceTheme,
				),
			);
		}
	} else if (polarities.includes(colourScheme)) {
		blocks.push(
			renderLayer(
				noteSelector(mode, colourScheme, colourScheme),
				workspaceSelector(mode, colourScheme, colourScheme),
				values[colourScheme],
				workspaceTheme,
			),
		);
	}

	return blocks.filter((block) => block.length > 0).join("\n\n");
}

/**
 * Rewrite every screen selector `buildGameStyle` could have produced so that,
 * under `@media print`, all of them carry the pack's light layer instead —
 * printing always forces light polarity regardless of the vault's live theme
 * or colour-scheme override.
 *
 * Forcing polarity at generation time inside `buildGameStyle` itself does not
 * work: it would only pose a DOM class (`.brumes--colour-light`) that the
 * vault's real setting never puts on `body` when the vault is actually dark,
 * so the forced block would match nothing while the screen block — not
 * excluded from the `print` media — keeps winning. Rewriting every selector
 * variant under `@media print` instead wins by scope, not by a class that
 * would never be present.
 *
 * Returns an empty string when a print block would be a byte-for-byte
 * duplicate of the always-active bare-selector rule: no declared polarity
 * (bare selector already shows `base`), or a single declared polarity that is
 * already `light` (bare selector already shows light in every circumstance).
 */
export function buildPrintOverride(
	mode: BrumesMode,
	values: GameStyleValues,
	workspaceTheme: boolean,
	polarities: GamePolarity[] = [],
): string {
	if (polarities.length === 0 || (polarities.length === 1 && polarities[0] === "light")) {
		return "";
	}

	const printLayer = polarities.includes("light") ? values.light : values.base;

	const blocks = [
		renderLayer(
			noteSelector(mode),
			workspaceSelector(mode),
			printLayer,
			workspaceTheme,
		),
	];

	if (polarities.length === 2) {
		for (const scheme of ["light", "dark"] as const) {
			blocks.push(
				renderLayer(
					noteSelector(mode, scheme, "obsidian"),
					workspaceSelector(mode, scheme, "obsidian"),
					printLayer,
					workspaceTheme,
				),
			);
			blocks.push(
				renderLayer(
					noteSelector(mode, scheme, scheme),
					workspaceSelector(mode, scheme, scheme),
					printLayer,
					workspaceTheme,
				),
			);
		}
	}

	const body = blocks.filter((block) => block.length > 0).join("\n\n");
	if (!body) {
		return "";
	}

	const colorAdjust = renderTokenBlock(`body.brumes--${mode}`, {
		"print-color-adjust": "exact",
		"-webkit-print-color-adjust": "exact",
	});

	return `@media print {\n${body}\n\n${colorAdjust}\n}`;
}

/**
 * Owns the style element in every open document.
 *
 * Obsidian opens detached windows with a document of their own, which is why
 * `domModeClass` reaches for `activeDocument`. A style written once into the
 * main document would leave a popped-out note undressed, so every document is
 * tracked and written to.
 */
export class GameStyleWriter {
	private css = "";
	private readonly documents: Document[] = [];

	addDocument(doc: Document) {
		if (this.documents.indexOf(doc) !== -1) {
			return;
		}

		this.documents.push(doc);
		this.writeTo(doc);
	}

	forgetDocument(doc: Document) {
		const index = this.documents.indexOf(doc);
		if (index === -1) {
			return;
		}

		this.documents.splice(index, 1);
		removeGameStyle(doc);
	}

	applyGameStyle(css: string) {
		this.css = css;

		for (const doc of this.documents) {
			this.writeTo(doc);
		}
	}

	/** Leave nothing behind when the plugin unloads. */
	removeGameStyle() {
		for (const doc of this.documents) {
			removeGameStyle(doc);
		}

		this.documents.length = 0;
		this.css = "";
	}

	private writeTo(doc: Document) {
		if (!this.css) {
			removeGameStyle(doc);
			return;
		}

		const element = ensureStyleElement(doc);
		if (element.textContent !== this.css) {
			element.textContent = this.css;
		}
	}
}

function ensureStyleElement(doc: Document): HTMLStyleElement {
	const existing = doc.getElementById(STYLE_ELEMENT_ID);

	if (existing instanceof HTMLStyleElement) {
		return existing;
	}

	existing?.remove();

	const element = doc.createElement("style");
	element.id = STYLE_ELEMENT_ID;
	doc.head.appendChild(element);

	return element;
}

export function removeGameStyle(doc: Document) {
	doc.getElementById(STYLE_ELEMENT_ID)?.remove();
}
