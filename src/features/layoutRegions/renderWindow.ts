import { MarkdownView } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";

/**
 * The part of Obsidian's reading-view renderer this feature leans on. None of
 * it is public API: every member is checked before use, and a renderer that
 * does not match leaves the note in a single column.
 */
interface PreviewRenderer {
	sizerEl?: unknown;
	renderExtraMinPx?: unknown;
	queueRender?: unknown;
}

/** A margin no note reaches: every section stays drawn. */
const WHOLE_NOTE = 1e7;

const held = new WeakMap<HTMLElement, { renderer: PreviewRenderer; margin: number }>();

function previewRenderer(plugin: BrumesPlugin, sizer: HTMLElement): PreviewRenderer | null {
	let found: PreviewRenderer | null = null;
	plugin.app.workspace.iterateAllLeaves((leaf) => {
		if (found || !(leaf.view instanceof MarkdownView)) return;
		const renderer = (leaf.view.previewMode as unknown as { renderer?: PreviewRenderer }).renderer;
		if (renderer && renderer.sizerEl === sizer) found = renderer;
	});
	return found;
}

function redraw(renderer: PreviewRenderer): void {
	if (typeof renderer.queueRender === "function") {
		(renderer.queueRender as () => void).call(renderer);
	}
}

/**
 * Obsidian draws only the sections near the viewport and places the others
 * from heights it measured as a single stack. Columns break that measure: the
 * sections it believes to be further down are left out, and the reader meets
 * blank pages. A note that flows therefore keeps all its sections drawn.
 *
 * Returns false when the renderer cannot be held, so the caller never flows a
 * note that would then be clipped.
 */
export function holdWholeNote(plugin: BrumesPlugin, sizer: HTMLElement): boolean {
	if (held.has(sizer)) return true;
	const renderer = previewRenderer(plugin, sizer);
	if (!renderer || typeof renderer.renderExtraMinPx !== "number") return false;
	held.set(sizer, { renderer, margin: renderer.renderExtraMinPx });
	renderer.renderExtraMinPx = WHOLE_NOTE;
	redraw(renderer);
	return true;
}

/** Give the renderer its own drawing margin back once nothing flows any more. */
export function releaseWholeNote(sizer: HTMLElement): void {
	const state = held.get(sizer);
	if (!state) return;
	held.delete(sizer);
	state.renderer.renderExtraMinPx = state.margin;
	redraw(state.renderer);
}
