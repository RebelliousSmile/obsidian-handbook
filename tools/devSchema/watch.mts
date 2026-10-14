import { existsSync, utimesSync, watch, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { PLUGIN_ID, syncSchemaSource } from "./sync.mjs";
import type { SyncOptions, SyncResult } from "./sync.mjs";

export type Change = "install" | "preview" | "ignore";

/**
 * Sort a path of the checkout (relative, `/`-separated). The catalogue and
 * everything a pack ships install; the HTML preview of a pack (`preview/`, and
 * its own `styles/` next to `pack.json`, not the `assets/` ones) never reaches
 * Obsidian.
 */
export function classifyChange(path: string): Change {
	const parts = path.split("/").filter((part) => part !== "");
	if (parts.length === 1 && parts[0] === "handbook.json") return "install";
	if (parts[0] !== "handbook" || parts.length < 3) return "ignore";
	if (parts[2] === "preview" || parts[2] === "styles") return "preview";
	return "install";
}

/** Ask Hot Reload to reload Handbook: marker file, then a fresh `main.js` time. */
export function requestReload(vaultRoot: string, configDir: string): boolean {
	const plugin = join(vaultRoot, configDir, "plugins", PLUGIN_ID);
	const main = join(plugin, "main.js");
	if (!existsSync(main)) return false;
	const marker = join(plugin, ".hotreload");
	if (!existsSync(marker)) writeFileSync(marker, "");
	const now = new Date();
	utimesSync(main, now, now);
	return true;
}

function describe(result: SyncResult): string {
	const packs = result.packs.map((pack) => `${pack.id}@${pack.version}`).join(", ");
	return `${result.repository} ${result.revision.slice(0, 7)} — ${packs === "" ? "no pack" : packs}`;
}

export interface WatchOptions extends SyncOptions {
	debounceMs?: number;
	log?: (line: string) => void;
	error?: (line: string) => void;
}

/** One pass: synchronise, report, ask for the reload. Returns whether it worked. */
export async function runOnce(options: WatchOptions): Promise<boolean> {
	const log = options.log ?? console.log;
	const error = options.error ?? console.error;
	const configDir = options.configDir ?? ".obsidian";
	try {
		const result = await syncSchemaSource(options);
		const reloaded = requestReload(resolve(options.vaultRoot), configDir);
		log(`[${new Date().toLocaleTimeString()}] installed ${describe(result)}`);
		if (!reloaded) log("Handbook has no main.js here: run « Reload installed schema sources » in Obsidian.");
		return true;
	} catch (failure) {
		error(`not installed, the last valid version stays in place: ${failure instanceof Error ? failure.message : String(failure)}`);
		return false;
	}
}

/** Synchronise now, then again on every installable change until stopped. */
export async function watchSource(options: WatchOptions): Promise<() => void> {
	const log = options.log ?? console.log;
	const root = resolve(options.sourceRoot);
	const debounceMs = options.debounceMs ?? 150;
	await runOnce(options);

	let timer: ReturnType<typeof setTimeout> | undefined;
	let running = false;
	let again = false;
	const settle = (): void => {
		if (running) {
			again = true;
			return;
		}
		running = true;
		void runOnce(options).finally(() => {
			running = false;
			if (again) {
				again = false;
				settle();
			}
		});
	};

	const watcher = watch(root, { recursive: true }, (_event, filename) => {
		if (filename === null) return;
		const changed = relative(root, join(root, filename.toString())).split(sep).join("/");
		const kind = classifyChange(changed);
		if (kind === "ignore") return;
		if (kind === "preview") {
			log(`${changed} belongs to the HTML preview and is not loaded by Obsidian.`);
			return;
		}
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(settle, debounceMs);
	});
	log(`Watching ${root} for installable changes...`);
	return () => {
		if (timer !== undefined) clearTimeout(timer);
		watcher.close();
	};
}
