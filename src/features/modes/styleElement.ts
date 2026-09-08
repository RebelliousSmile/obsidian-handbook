import { BrumesMode } from "../../settings/types";
import {
	GameStyleLayer,
	GameStyleTokens,
	GameStyleValues,
} from "../../games/types";

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

function renderLayer(
	selector: string,
	layer: GameStyleLayer,
	withWorkspace: boolean,
): string {
	const body = [renderTokens(layer.note, "\t")];

	if (withWorkspace) {
		body.push(renderTokens(layer.workspace, "\t"));
	}

	const declarations = body.filter((part) => part.length > 0).join("\n");

	if (!declarations) {
		return "";
	}

	return `${selector} {\n${declarations}\n}`;
}

/**
 * Build the whole style of a game as one block.
 *
 * The variants are written as compound selectors — `.brumes--<mode>.theme-dark`
 * and not `.theme-dark` alone. Both classes sit on the same `body`: at equal
 * specificity only source order would decide, and nothing guarantees our
 * sheet comes after the active theme's.
 *
 * The declarations land on `body`, never on a note container: the iceberg and
 * mountain card mixins are included outside the mode class so they reach the
 * canvas, and they only see these values through inheritance.
 */
export function buildGameStyle(
	mode: BrumesMode,
	values: GameStyleValues,
	workspaceTheme: boolean,
): string {
	const selector = `body.brumes--${mode}`;

	const blocks = [
		renderLayer(selector, values.base, workspaceTheme),
		renderLayer(`${selector}.theme-light`, values.light, workspaceTheme),
		renderLayer(`${selector}.theme-dark`, values.dark, workspaceTheme),
	];

	return blocks.filter((block) => block.length > 0).join("\n\n");
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
