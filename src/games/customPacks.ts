import { Plugin } from "obsidian";
import { logScope } from "../utils/logger";
import { readGamePack } from "./fromSchema";
import {
	InstalledGamePlugin,
	readGamePluginManifest,
} from "./pluginManifest";

const log = logScope("Games");

const CUSTOM_PACKS_DIR_NAME = "packs";

/** A candidate already reported this session, so a repeated read stays silent. */
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
 * Every valid legacy GamePack in `<plugin dir>/packs/*.json`, plus every
 * declarative game plugin installed as `<plugin dir>/packs/<id>/pack.json`.
 *
 * A missing folder is the normal state of a vault with no custom pack and
 * warns about nothing. A file that fails to parse or that `readGamePack`
 * refuses is dropped alone, its name logged once per session — the folder
 * never blocks the rest, and no error ever reaches `onload()`.
 */
export async function loadCustomGamePacks(
	plugin: Plugin,
): Promise<InstalledGamePlugin[]> {
	const path = customPacksPath(plugin);
	if (!path) {
		return [];
	}

	const adapter = plugin.app.vault.adapter;
	let candidates: Array<{
		path: string;
		reportName: string;
		pluginRoot?: string;
	}>;

	try {
		if (!(await adapter.exists(path))) {
			return [];
		}

		const listing = await adapter.list(path);
		const flat = listing.files
			.filter((file) => file.toLowerCase().endsWith(".json"))
			.map((file) => ({
				path: file,
				reportName: file.slice(path.length + 1),
			}));
		const directories = listing.folders.map((folder) => ({
			path: `${folder}/pack.json`,
			reportName: `${folder.slice(path.length + 1)}/pack.json`,
			pluginRoot: folder,
		}));

		candidates = [...flat, ...directories].sort((a, b) =>
			a.reportName.localeCompare(b.reportName),
		);
	} catch (error) {
		log.error(`Could not read the "${CUSTOM_PACKS_DIR_NAME}" folder, ignoring it.`, error);
		return [];
	}

	const packs: InstalledGamePlugin[] = [];
	const seenIds: string[] = [];

	for (const candidate of candidates) {
		try {
			const raw = await adapter.read(candidate.path);
			let parsed: unknown;

			try {
				parsed = JSON.parse(raw);
			} catch {
				reportFileOnce(
					candidate.reportName,
					`Ignoring "${candidate.reportName}" in "${CUSTOM_PACKS_DIR_NAME}": not valid JSON.`,
				);
				continue;
			}

			let installed: InstalledGamePlugin;
			if (candidate.pluginRoot) {
				const result = readGamePluginManifest(
					parsed,
					plugin.manifest.version,
				);
				if (!result.manifest) {
					reportFileOnce(
						candidate.reportName,
						`Ignoring "${candidate.reportName}" in "${CUSTOM_PACKS_DIR_NAME}": ${result.error}.`,
					);
					continue;
				}

				const pack = result.manifest.pack;
				const directoryId = candidate.pluginRoot.slice(
					candidate.pluginRoot.lastIndexOf("/") + 1,
				);
				if (pack.id !== directoryId) {
					reportFileOnce(
						candidate.reportName,
						`Ignoring "${candidate.reportName}" in "${CUSTOM_PACKS_DIR_NAME}": directory "${directoryId}" does not match pack id "${pack.id}".`,
					);
					continue;
				}

				installed = {
					pack,
					installation: {
						root: candidate.pluginRoot,
						version: result.manifest.version,
						minimumHandbookVersion:
							result.manifest.minimumHandbookVersion,
						requires: result.manifest.requires,
					},
				};
			} else {
				const pack = readGamePack(parsed);

				if (!pack) {
					reportFileOnce(
						candidate.reportName,
						`Ignoring "${candidate.reportName}" in "${CUSTOM_PACKS_DIR_NAME}": not a usable game pack.`,
					);
					continue;
				}

				installed = { pack };
			}
			const pack = installed.pack;

			// Files are sorted by name (see above), so the first one to claim an
			// id is deterministic — a later custom pack sharing that id loses,
			// named by its own filename since a `GamePack` carries none.
			if (seenIds.indexOf(pack.id) !== -1) {
				reportFileOnce(
					candidate.reportName,
					`Ignoring "${candidate.reportName}" in "${CUSTOM_PACKS_DIR_NAME}": another game plugin already claimed the id "${pack.id}".`,
				);
				continue;
			}

			seenIds.push(pack.id);
			packs.push(installed);
		} catch {
			reportFileOnce(
				candidate.reportName,
				`Could not read "${candidate.reportName}" in "${CUSTOM_PACKS_DIR_NAME}", ignoring it.`,
			);
		}
	}

	return packs;
}
