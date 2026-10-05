const CALLOUT_OPENING = /^(\s*(?:>\s*)+\[!)([^\]|]+)((?:\|[^\]]*)?\][+-]?)/;
const FENCE = /^\s*(?:>\s*)*(`{3,}|~{3,})(.*)$/;

export interface RetargetResult {
	lines: string[];
	changed: number;
}

/**
 * Point every callout whose type the game does not declare at `fallback`,
 * leaving its modifiers, fold marker and body alone. Fenced code is skipped:
 * a callout written there is a sample, not a callout.
 */
export function retargetCallouts(
	lines: readonly string[],
	declared: ReadonlySet<string>,
	fallback: string,
): RetargetResult {
	let fence: string | null = null;
	let changed = 0;
	const result = lines.map((line) => {
		const opening = FENCE.exec(line);
		if (opening) {
			const marker = opening[1];
			if (fence === null) fence = marker;
			// A fence closes on the same character, at least as long, with nothing after it.
			else if (marker[0] === fence[0] && marker.length >= fence.length && opening[2].trim() === "") fence = null;
			return line;
		}
		if (fence !== null) return line;
		const match = CALLOUT_OPENING.exec(line);
		if (!match || declared.has(match[2].trim().toLowerCase())) return line;
		changed++;
		return `${match[1]}${fallback}${match[3]}${line.slice(match[0].length)}`;
	});
	return { lines: result, changed };
}

/** Line of the opening `> [!type]` of the callout holding `line`, or null. */
export function findCalloutOpening(getLine: (index: number) => string, line: number): number | null {
	for (let index = line; index >= 0; index--) {
		const text = getLine(index);
		if (!/^\s*>/.test(text)) return null;
		if (CALLOUT_OPENING.test(text)) return index;
	}
	return null;
}

/** Replace the type of the opening line, keeping its modifiers and fold marker. */
export function setCalloutType(line: string, type: string): string {
	const match = CALLOUT_OPENING.exec(line);
	if (!match) return line;
	return `${match[1]}${type}${match[3]}${line.slice(match[0].length)}`;
}
