import { Editor, Notice } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { blockIds, isBlockEnabled } from "../blocks/types";
import { logScope } from "../../utils/logger";
import { themeCardBlock } from "./block";
import { parseThemeCard } from "./parser";
import { themeCardToToml } from "./toml";

const log = logScope("ThemeCardToml");

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

	// An unclosed fence still counts, so a card being typed can be copied.
	if (opener && cursorLine >= opener.line) {
		return {
			language: opener.language,
			source: lines.slice(opener.line + 1).join("\n"),
		};
	}

	return null;
}

function getThemeCardSourceAtCursor(editor: Editor): string | null {
	const block = getFencedBlockAtCursor(editor);
	if (!block) {
		return null;
	}

	return blockIds(themeCardBlock).includes(block.language)
		? block.source
		: null;
}

/** Name the part a card is missing, so the notice says what to fix. */
function describeParseFailure(source: string): string {
	const lines = source
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return "the block is empty";
	}

	return "it has no title tag, add a line such as {Title Tag}";
}

async function copyThemeCardAsToml(source: string): Promise<void> {
	const card = parseThemeCard(source);

	if (card === null) {
		new Notice(
			`Cannot copy this theme card: ${describeParseFailure(source)}.`,
		);
		return;
	}

	try {
		await navigator.clipboard.writeText(themeCardToToml(card));
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Notice("Theme card copied as TOML.");
	} catch (error) {
		log.error("Could not write the TOML to the clipboard", error);
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Notice("Could not write the TOML to the clipboard.");
	}
}

/**
 * Offer the theme card under the cursor as TOML, in the shape the shared
 * schema defines, so it can be pasted into Lantern in the Mist.
 */
export function loadThemeCardCommands(plugin: BrumesPlugin): void {
	plugin.addCommand({
		id: "copy-theme-card-as-toml",
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		name: "Copy theme card as TOML",
		editorCheckCallback: (checking: boolean, editor: Editor) => {
			if (!isBlockEnabled(themeCardBlock, plugin.settings)) {
				return false;
			}

			const source = getThemeCardSourceAtCursor(editor);
			if (source === null) {
				return false;
			}

			if (!checking) {
				void copyThemeCardAsToml(source);
			}

			return true;
		},
	});
}
