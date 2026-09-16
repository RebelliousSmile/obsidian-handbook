import { Menu, Notice, TFile } from "obsidian";
import type { MarkdownSectionInformation } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { MIST_SOURCE_CONVERSION_CODECS } from "schema-in-the-mist";
import { looksLikeToml } from "./schemaValues";
import type { TomlExport } from "./copyAsToml";

interface RenderedTomlContext {
	sourcePath: string;
	section: MarkdownSectionInformation | null;
	renderedSource: string;
	spec: TomlExport<unknown>;
	rememberedAt: number;
}

const renderedTomlContexts = new WeakMap<BrumesPlugin, RenderedTomlContext>();
const RENDERED_TOML_CONTEXT_LIFETIME_MS = 30_000;

/** Remember the card that received the right mouse button before Obsidian opens its editor menu. */
export function rememberRenderedTomlContext(
	plugin: BrumesPlugin,
	context: Omit<RenderedTomlContext, "rememberedAt">,
): void {
	renderedTomlContexts.set(plugin, { ...context, rememberedAt: Date.now() });
}

/** Add the paste action to Obsidian's own menu for the card just right-clicked. */
export function contributeRenderedTomlPaste(menu: Menu, plugin: BrumesPlugin): boolean {
	const context = renderedTomlContexts.get(plugin);
	if (!context || Date.now() - context.rememberedAt > RENDERED_TOML_CONTEXT_LIFETIME_MS) {
		return false;
	}

	menu.addItem((item) => item
		.setTitle(`Paste toml into ${context.spec.noun}`)
		.setIcon("clipboard-paste")
		.onClick(() => {
			void pasteTomlIntoRenderedBlock(
				plugin,
				context.sourcePath,
				context.section,
				context.renderedSource,
				context.spec,
			);
		}),
	);
	return true;
}

/** Convert a clipboard document only when the target block can render the result. */
export function tomlToBlockSource<T>(
	clipboard: string,
	spec: TomlExport<T>,
): string | null {
	if (!spec.sourceTarget || !looksLikeToml(clipboard)) {
		return null;
	}

	try {
		const source = MIST_SOURCE_CONVERSION_CODECS[spec.sourceTarget]
			.convertToSource(clipboard).source;
		return spec.block.parse(source) === null ? null : source;
	} catch {
		return null;
	}
}

export function replaceSectionBody(
	note: string,
	section: MarkdownSectionInformation,
	renderedSource: string,
	replacement: string,
): string | null {
	const lines = note.split("\n");
	const current = lines.slice(section.lineStart, section.lineEnd + 1).join("\n");
	const sourceIndex = current.indexOf(renderedSource);
	if (sourceIndex === -1) return null;

	const next = current.slice(0, sourceIndex) + replacement + current.slice(sourceIndex + renderedSource.length);
	lines.splice(section.lineStart, section.lineEnd - section.lineStart + 1, ...next.split("\n"));
	return lines.join("\n");
}

/** Import clipboard TOML into precisely the rendered fenced block that owns it. */
export async function pasteTomlIntoRenderedBlock<T>(
	plugin: BrumesPlugin,
	sourcePath: string,
	section: MarkdownSectionInformation | null,
	renderedSource: string,
	spec: TomlExport<T>,
): Promise<void> {
	if (!section) {
		new Notice("Could not locate this block in the note.");
		return;
	}

	let clipboard: string;
	try {
		clipboard = await navigator.clipboard.readText();
	} catch {
		new Notice("Could not read toml from the clipboard.");
		return;
	}

	const replacement = tomlToBlockSource(clipboard, spec);
	if (replacement === null) {
		new Notice(`Clipboard does not match this ${spec.noun} TOML document.`);
		return;
	}

	const file = plugin.app.vault.getAbstractFileByPath(sourcePath);
	if (!(file instanceof TFile)) {
		new Notice("The source note is no longer available.");
		return;
	}

	const note = await plugin.app.vault.read(file);
	const next = replaceSectionBody(note, section, renderedSource, replacement);
	if (next === null) {
		new Notice("This block changed before it could be updated; nothing was overwritten.");
		return;
	}

	try {
		await plugin.app.vault.modify(file, next);
		new Notice(`Pasted TOML into the ${spec.noun}.`);
	} catch {
		new Notice("Could not update the source note.");
	}
}
