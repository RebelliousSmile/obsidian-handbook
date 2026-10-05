import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Write a minimal `obsidian` module into `directory` and return its path, for a
 * harness that bundles code importing it at runtime: it only needs these names to load.
 */
export async function writeObsidianStub(directory) {
	const stub = join(directory, "obsidian-stub.mjs");
	await writeFile(stub, `export class Notice {}
export function getLanguage() { return "en"; }
`);
	return stub;
}
