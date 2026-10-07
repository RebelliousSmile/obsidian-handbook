/**
 * What a provider publishes: the files of its package, and their fingerprint.
 *
 * A candidate holds what `npm pack` puts in the archive, not the checkout: a
 * directory the package leaves out of `files` is in one and not in the other.
 * `npm pack --dry-run --json` lists those files without writing an archive
 * and without publishing; it runs the `prepack` script, as the real packaging
 * does, so what a provider generates there is in the list.
 *
 * The fingerprint is a sha256 over the sorted list, each file with the sha256
 * of its bytes in the checkout. Same commit, same checkout, same fingerprint.
 * It is local: a checkout with other line endings gives another one, so it is
 * compared between two presentations of one machine, never with an archive.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runGuarded } from "./guarded.mjs";

/** Always npm, whatever the provider installs with: the candidate is packed by `npm pack`. */
export const PACK_COMMAND = ["npm", "pack", "--dry-run", "--json"];

/**
 * The JSON `npm pack --json` ends its standard output with. A `prepack`
 * script writes there too, before it: the array is read from its last opening
 * line, not from the start of the output.
 */
function packListing(stdout) {
	const text = stdout.replace(/\r\n/g, "\n");
	const starts = [];
	for (let at = text.indexOf("["); at >= 0; at = text.indexOf("[", at + 1)) {
		if (at === 0 || text[at - 1] === "\n") starts.push(at);
	}
	for (const at of starts.reverse()) {
		try {
			const parsed = JSON.parse(text.slice(at));
			if (Array.isArray(parsed) && Array.isArray(parsed[0]?.files)) return parsed[0];
		} catch {
			// Not the listing: a line of a script that happens to open a bracket.
		}
	}
	return null;
}

/** sha256 over `path\0sha256(bytes)\n` of each file, in the order given. Throws when a file cannot be read. */
export function fingerprint(dir, files) {
	const hash = createHash("sha256");
	for (const file of files) {
		hash.update(`${file}\0${createHash("sha256").update(readFileSync(join(dir, file))).digest("hex")}\n`);
	}
	return hash.digest("hex");
}

/**
 * Pack the checkout `dir` for nothing, behind the publication guard, and read
 * what would be published. `run` starts the command and gives its guarded
 * result; the caller passes its own to keep the whole output (`logs.mjs`).
 *
 * @returns {{ result: object, files: string[], sha256: string } | { result: object, error: string }}
 */
export function packedFiles(dir, run = (command) => runGuarded(dir, command, "present")) {
	const result = run(PACK_COMMAND);
	if (result.status !== 0) return { result, error: `${PACK_COMMAND.join(" ")} exited ${result.status}` };
	const listing = packListing(result.stdout ?? "");
	if (!listing) return { result, error: `${PACK_COMMAND.join(" ")} did not list the files of the package` };
	const files = listing.files.map((file) => String(file.path).split("\\").join("/")).sort();
	try {
		return { result, files, sha256: fingerprint(dir, files) };
	} catch (error) {
		return { result, error: `${PACK_COMMAND.join(" ")} lists a file that cannot be read: ${error.message}` };
	}
}
