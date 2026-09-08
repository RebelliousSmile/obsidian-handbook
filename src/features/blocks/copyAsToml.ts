import { Editor, Notice } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { logScope } from "../../utils/logger";
import { BrumesBlock, blockIds, isBlockEnabled } from "./types";

const log = logScope("BlockToml");

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;

/** The fenced block the cursor sits in, whatever its language. */
interface FencedBlock {
	language: string;
	source: string;
}

function readFence(line: string): { marker: string; info: string } | null {
	const match = FENCE.exec(line);
	if (!match) {
		return null;
	}

	return { marker: match[2], info: match[3].trim() };
}

function closesFence(
	fence: { marker: string; info: string },
	opener: { marker: string },
): boolean {
	return (
		fence.info.length === 0 &&
		fence.marker[0] === opener.marker[0] &&
		fence.marker.length >= opener.marker.length
	);
}

/**
 * Walk the note from the top so nested fences cannot be mistaken for a block
 * of their own, and return the one the cursor is inside.
 */
export function getFencedBlockAtCursor(editor: Editor): FencedBlock | null {
	const cursorLine = editor.getCursor().line;
	const lines = editor.getValue().split("\n");
	let opener: { line: number; marker: string; language: string } | null = null;

	for (let index = 0; index < lines.length; index++) {
		const fence = readFence(lines[index]);

		if (!opener) {
			if (fence) {
				opener = {
					line: index,
					marker: fence.marker,
					language: fence.info.split(/\s+/)[0].toLowerCase(),
				};
			}
			continue;
		}

		if (!fence || !closesFence(fence, opener)) {
			continue;
		}

		if (cursorLine >= opener.line && cursorLine <= index) {
			return {
				language: opener.language,
				source: lines.slice(opener.line + 1, index).join("\n"),
			};
		}

		opener = null;
	}

	// An unclosed fence still counts, so a block being typed can be copied.
	if (opener && cursorLine >= opener.line) {
		return {
			language: opener.language,
			source: lines.slice(opener.line + 1).join("\n"),
		};
	}

	return null;
}

/**
 * A block that can leave the note as a schema-in-the-mist document: the block
 * itself, the serializer, and the wording the notices use when the source
 * under the cursor will not parse.
 */
export interface TomlExport<T> {
	block: BrumesBlock<T>;
	/**
	 * The command id, written out rather than derived from the block id:
	 * a block has been renamed before, and a hotkey bound to the command
	 * must survive the next rename.
	 */
	commandId: string;
	/** How the command and the notices name it, e.g. "theme card". */
	noun: string;
	toToml(data: T): string;
	/** What the block is missing, so the notice says what to fix. */
	describeFailure(source: string): string;
}

function getSourceAtCursor<T>(
	editor: Editor,
	block: BrumesBlock<T>,
): string | null {
	const fenced = getFencedBlockAtCursor(editor);
	if (!fenced) {
		return null;
	}

	return blockIds(block).indexOf(fenced.language) === -1
		? null
		: fenced.source;
}

async function copyAsToml<T>(
	source: string,
	spec: TomlExport<T>,
): Promise<void> {
	const data = spec.block.parse(source);

	if (data === null) {
		new Notice(
			`Cannot copy this ${spec.noun}: ${spec.describeFailure(source)}.`,
		);
		return;
	}

	try {
		await navigator.clipboard.writeText(spec.toToml(data));
		new Notice(`Copied the ${spec.noun} as TOML.`);
	} catch (error) {
		log.error("Could not write the TOML to the clipboard", error);
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Notice("Could not write the TOML to the clipboard.");
	}
}

/**
 * Offer the block under the cursor as TOML, in the shape the shared schema
 * defines, so it can be pasted into Lantern in the Mist.
 */
export function loadCopyAsTomlCommand<T>(
	plugin: BrumesPlugin,
	spec: TomlExport<T>,
): void {
	plugin.addCommand({
		id: spec.commandId,
		name: `Copy ${spec.noun} as TOML`,
		editorCheckCallback: (checking: boolean, editor: Editor) => {
			if (!isBlockEnabled(spec.block, plugin.settings)) {
				return false;
			}

			const source = getSourceAtCursor(editor, spec.block);
			if (source === null) {
				return false;
			}

			if (!checking) {
				void copyAsToml(source, spec);
			}

			return true;
		},
	});
}

/** Name the part a block is missing, so the notice says what to fix. */
export function describeMissingPart(source: string, part: string): string {
	const lines = source
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	return lines.length === 0 ? "the block is empty" : part;
}
