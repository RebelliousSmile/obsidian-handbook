import type { RollerData } from "./parser";

export interface DiceRollerApi {
	getArrayRoller?(options: string[], rolls?: number): Promise<{ roll(): Promise<unknown>; results?: unknown[] }>;
	getRoller?(formula: string, sourceFile?: string): Promise<{ roll(): Promise<unknown>; result?: unknown; total?: unknown; results?: unknown[] }>;
}

function matchesRange(value: number, source: string): boolean {
	return source.split(",").some((part) => {
		const match = /^\s*(\d+)\s*(?:-|–)\s*(\d+)\s*$/.exec(part);
		if (match) return value >= Number(match[1]) && value <= Number(match[2]);
		return /^\s*\d+\s*$/.test(part) && value === Number(part.trim());
	});
}

function numericResult(roller: { result?: unknown; total?: unknown; results?: unknown[] }): number | null {
	for (const candidate of [roller.result, roller.total, roller.results?.[0]]) {
		if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
		if (typeof candidate === "string" && /^\d+$/.test(candidate)) return Number(candidate);
	}
	return null;
}

export async function rollTable(api: DiceRollerApi, data: RollerData): Promise<string | null> {
	if (data.table.lookupFormula === null) {
		if (!api.getArrayRoller) return null;
		const roller = await api.getArrayRoller(data.table.rows.map((row) => row.join(" | ")));
		await roller.roll();
		return typeof roller.results?.[0] === "string" ? roller.results[0] : null;
	}
	if (!api.getRoller) return null;
	const roller = await api.getRoller(data.table.lookupFormula);
	await roller.roll();
	const value = numericResult(roller);
	if (value === null) return null;
	return data.table.rows.find((row) => matchesRange(value, row[0]))?.[1] ?? null;
}
