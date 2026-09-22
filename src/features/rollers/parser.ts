export interface RollerTable {
	headers: string[];
	rows: string[][];
	lookupFormula: string | null;
}

export interface RollerData {
	table: RollerTable;
}

function cells(line: string): string[] | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
	return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function isDivider(row: string[]): boolean {
	return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/** Parse exactly one ordinary Markdown table from a roller block. */
export function parseRoller(source: string): RollerData | null {
	const tables: string[][][] = [];
	let current: string[][] = [];

	for (const line of source.split(/\r?\n/)) {
		const row = cells(line);
		if (row) {
			current.push(row);
			continue;
		}
		if (current.length > 0) {
			tables.push(current);
			current = [];
		}
	}
	if (current.length > 0) tables.push(current);
	if (tables.length !== 1) return null;

	const [header, divider, ...rows] = tables[0];
	if (!header || !divider || !isDivider(divider) || header.length === 0 || rows.length === 0) return null;
	if (header.some((cell) => !cell) || rows.some((row) => row.length !== header.length || row.some((cell) => !cell))) return null;

	const lookup = /^dice\s*:\s*(.+)$/i.exec(header[0]);
	if (lookup && (header.length !== 2 || !lookup[1].trim())) return null;

	return { table: { headers: header, rows, lookupFormula: lookup?.[1].trim() ?? null } };
}
