import {
	firstContentLine,
	isFenceBoundary,
	lastContentLine,
	toggleFence,
} from "../layoutRegions/parser";

export type ModeSectionPolarity = "light" | "dark";
/** A forced polarity, or `alternate`: the opposite of the mode the note shows. */
export type ModeSectionMode = ModeSectionPolarity | "alternate";

/** `alternate` needs two modes to alternate between; a forced one needs its own. */
export function isModeOffered(mode: ModeSectionMode, offered: readonly string[]): boolean {
	return mode === "alternate" ? offered.length > 1 : offered.indexOf(mode) !== -1;
}

/** Class of a rendered block that lies inside a section whose mode is set. */
export function modeSectionClass(mode: ModeSectionMode): string {
	return `handbook-mode-${mode}`;
}

export interface ModeSection {
	mode: ModeSectionMode;
	openLine: number;
	closeLine: number;
	lineStart: number;
	lineEnd: number;
}

export type ModeSectionDiagnostic =
	| "empty"
	| "invalid-open"
	| "invalid-polarity"
	| "orphan-close"
	| "overlapping-open"
	| "unclosed-open";

export interface ModeSectionParseResult {
	diagnostics: readonly { line: number; reason: ModeSectionDiagnostic }[];
	sections: readonly ModeSection[];
}

const MODE_PREFIX = "<!-- handbook-mode:";
const OPEN_MARKER = /^<!-- handbook-mode: (light|dark|alternate) -->$/;
const POLARITY_MARKER = /^<!-- handbook-mode: ([^ ]+) -->$/;
const CLOSE_MARKER = "<!-- /handbook-mode -->";

/**
 * Finds source-only mode directives. The returned bounds exclude the marker
 * lines and are zero-based so they can be compared to Obsidian section info.
 * One forced mode holds at a time: opening another one inside it is refused.
 */
export function parseModeSections(source: string): ModeSectionParseResult {
	const lines = source.split(/\r?\n/);
	const diagnostics: { line: number; reason: ModeSectionDiagnostic }[] = [];
	const sections: ModeSection[] = [];
	let open: { mode: ModeSectionMode; line: number } | null = null;
	let fence: { character: "`" | "~"; length: number } | null = null;

	for (const [line, rawLine] of lines.entries()) {
		if (isFenceBoundary(rawLine, fence)) {
			fence = toggleFence(rawLine, fence);
			continue;
		}

		if (fence !== null) continue;

		const opening = rawLine.match(OPEN_MARKER);
		if (opening) {
			if (open !== null) {
				diagnostics.push({ line, reason: "overlapping-open" });
				open = null;
				continue;
			}

			open = { mode: opening[1] as ModeSectionMode, line };
			continue;
		}

		if (rawLine.startsWith(MODE_PREFIX)) {
			// A well-formed marker with an unknown word is told apart from a malformed one.
			diagnostics.push({
				line,
				reason: POLARITY_MARKER.test(rawLine) ? "invalid-polarity" : "invalid-open",
			});
			continue;
		}

		if (rawLine === CLOSE_MARKER) {
			if (open === null) {
				diagnostics.push({ line, reason: "orphan-close" });
				continue;
			}

			const contentStart = firstContentLine(lines, open.line + 1, line - 1);
			const contentEnd = lastContentLine(lines, open.line + 1, line - 1);
			if (contentStart === null || contentEnd === null) {
				diagnostics.push({ line, reason: "empty" });
			} else {
				sections.push({
					mode: open.mode,
					openLine: open.line,
					closeLine: line,
					lineStart: contentStart,
					lineEnd: contentEnd,
				});
			}
			open = null;
		}
	}

	if (open !== null) {
		diagnostics.push({ line: open.line, reason: "unclosed-open" });
	}

	return { diagnostics, sections };
}

/** The section a block lies in, when it lies in one entirely. */
export function sectionOfBlock(
	sections: readonly ModeSection[],
	info: { lineStart: number; lineEnd: number } | null,
): ModeSection | null {
	if (!info) return null;
	for (const section of sections) {
		if (info.lineStart >= section.openLine && info.lineEnd <= section.closeLine) return section;
	}
	return null;
}
