export interface LayoutRegion {
	columns: number;
	lineStart: number;
	lineEnd: number;
}

export type LayoutRegionDiagnostic =
	| "empty"
	| "invalid-open"
	| "orphan-close"
	| "overlapping-open"
	| "unclosed-open";

export interface LayoutRegionParseResult {
	diagnostics: readonly { line: number; reason: LayoutRegionDiagnostic }[];
	regions: readonly LayoutRegion[];
}

interface OpenRegion {
	columns: number;
	line: number;
}

const OPEN_MARKER = /^<!-- handbook-layout: columns=([1-9]\d*) -->$/;
const CLOSE_MARKER = "<!-- /handbook-layout -->";
const LAYOUT_PREFIX = "<!-- handbook-layout:";

/**
 * Finds source-only layout directives. The returned bounds exclude the marker
 * lines and are zero-based so they can be compared to Obsidian section info.
 */
export function parseLayoutRegions(source: string): LayoutRegionParseResult {
	const lines = source.split(/\r?\n/);
	const diagnostics: { line: number; reason: LayoutRegionDiagnostic }[] = [];
	const regions: LayoutRegion[] = [];
	let open: OpenRegion | null = null;
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

			open = { columns: Number(opening[1]), line };
			continue;
		}

		if (rawLine.startsWith(LAYOUT_PREFIX)) {
			diagnostics.push({ line, reason: "invalid-open" });
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
				regions.push({
					columns: open.columns,
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

	return { diagnostics, regions };
}

function firstContentLine(
	lines: readonly string[],
	start: number,
	end: number,
): number | null {
	for (let line = start; line <= end; line++) {
		if (lines[line].trim() !== "") return line;
	}
	return null;
}

function lastContentLine(
	lines: readonly string[],
	start: number,
	end: number,
): number | null {
	for (let line = end; line >= start; line--) {
		if (lines[line].trim() !== "") return line;
	}
	return null;
}

function isFenceBoundary(
	line: string,
	fence: { character: "`" | "~"; length: number } | null,
): boolean {
	const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
	if (!match) return false;

	if (fence === null) return true;
	return (
		match[1][0] === fence.character && match[1].length >= fence.length
	);
}

function toggleFence(
	line: string,
	fence: { character: "`" | "~"; length: number } | null,
): { character: "`" | "~"; length: number } | null {
	if (fence !== null) return null;

	const marker = line.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
	if (!marker) return null;

	return {
		character: marker[0] as "`" | "~",
		length: marker.length,
	};
}
