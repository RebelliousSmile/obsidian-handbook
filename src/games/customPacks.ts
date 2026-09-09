import { Plugin } from "obsidian";
import { logScope } from "../utils/logger";
import { readGamePack } from "./fromSchema";
import { GamePack } from "./types";

const log = logScope("Games");

const CUSTOM_PACKS_DIR_NAME = "packs";

/** A filename already reported this session, so a repeated read stays silent. */
const reportedFiles: string[] = [];

function reportFileOnce(fileName: string, message: string): void {
	if (reportedFiles.indexOf(fileName) !== -1) {
		return;
	}

	reportedFiles.push(fileName);
	log.error(message);
}

function customPacksPath(plugin: Plugin): string | null {
	const dir = plugin.manifest.dir;
	return dir ? `${dir}/${CUSTOM_PACKS_DIR_NAME}` : null;
}

/**
 * Every valid `GamePack` sitting in `<plugin dir>/packs/*.json`.
 *
 * A missing folder is the normal state of a vault with no custom pack and
 * warns about nothing. A file that fails to parse or that `readGamePack`
 * refuses is dropped alone, its name logged once per session — the folder
 * never blocks the rest, and no error ever reaches `onload()`.
 */
export async function loadCustomGamePacks(plugin: Plugin): Promise<GamePack[]> {
	const path = customPacksPath(plugin);
	if (!path) {
		return [];
	}

	const adapter = plugin.app.vault.adapter;
	let fileNames: string[];

	try {
		if (!(await adapter.exists(path))) {
			return [];
		}

		fileNames = (await adapter.list(path)).files
			.filter((file) => file.toLowerCase().endsWith(".json"))
			.sort();
	} catch (error) {
		log.error(`Could not read the "${CUSTOM_PACKS_DIR_NAME}" folder, ignoring it.`, error);
		return [];
	}

	const packs: GamePack[] = [];
	const seenIds: string[] = [];

	for (const filePath of fileNames) {
		const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);

		try {
			const raw = await adapter.read(filePath);
			let parsed: unknown;

			try {
				parsed = JSON.parse(raw);
			} catch {
				reportFileOnce(
					fileName,
					`Ignoring "${fileName}" in "${CUSTOM_PACKS_DIR_NAME}": not valid JSON.`,
				);
				continue;
			}

			const pack = readGamePack(parsed);

			if (!pack) {
				reportFileOnce(
					fileName,
					`Ignoring "${fileName}" in "${CUSTOM_PACKS_DIR_NAME}": not a usable game pack.`,
				);
				continue;
			}

			// Files are sorted by name (see above), so the first one to claim an
			// id is deterministic — a later custom pack sharing that id loses,
			// named by its own filename since a `GamePack` carries none.
			if (seenIds.indexOf(pack.id) !== -1) {
				reportFileOnce(
					fileName,
					`Ignoring "${fileName}" in "${CUSTOM_PACKS_DIR_NAME}": another custom pack already claimed the id "${pack.id}".`,
				);
				continue;
			}

			seenIds.push(pack.id);
			packs.push(pack);
		} catch {
			reportFileOnce(
				fileName,
				`Could not read "${fileName}" in "${CUSTOM_PACKS_DIR_NAME}", ignoring it.`,
			);
		}
	}

	return packs;
}
