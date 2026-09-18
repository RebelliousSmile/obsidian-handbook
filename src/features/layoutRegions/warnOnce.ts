import { logScope } from "../../utils/logger";

const log = logScope("Layout regions");
const warnedSources = new Set<string>();

export function warnOnce(sourcePath: string, message: string): void {
	const key = `${sourcePath}:${message}`;
	if (warnedSources.has(key)) return;
	warnedSources.add(key);
	log.warn(message, sourcePath);
}
