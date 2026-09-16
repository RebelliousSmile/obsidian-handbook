import { Notice, TFile } from "obsidian";
import type { MarkdownSectionInformation } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { MIST_SOURCE_CONVERSION_CODECS } from "schema-in-the-mist";
import { looksLikeToml } from "./schemaValues";
import type { TomlExport } from "./copyAsToml";

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
		new Notice("Could not read TOML from the clipboard.");
		return;
	}

	if (!spec.sourceTarget || !looksLikeToml(clipboard)) {
		new Notice(`Clipboard does not contain a valid ${spec.noun} TOML document.`);
		return;
	}

	let replacement: string;
	try {
		replacement = MIST_SOURCE_CONVERSION_CODECS[spec.sourceTarget]
			.convertToSource(clipboard).source;
	} catch {
		new Notice(`Clipboard does not contain a valid ${spec.noun} TOML document.`);
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
