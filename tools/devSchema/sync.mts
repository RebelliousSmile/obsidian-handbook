import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Plugin } from "obsidian";
import { installResolvedSchemaSource } from "../../src/games/sourceInstaller";
import { isSafeSchemaSourceRepository, schemaSourceId } from "../../src/games/sources";
import type { SchemaSource } from "../../src/games/sources";
import { readLocalSource } from "./localSource.mjs";
import { createNodeAdapter } from "./nodeAdapter.mjs";

export const PLUGIN_ID = "obsidian-handbook";

export interface SyncOptions {
	/** Checkout of a `schema-*` repository, root of its `handbook.json`. */
	sourceRoot: string;
	vaultRoot: string;
	configDir?: string;
}

export interface SyncResult {
	sourceId: string;
	repository: string;
	revision: string;
	packs: Array<{ id: string; version: string }>;
}

async function readJson(path: string, label: string): Promise<unknown> {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch {
		throw new Error(`${label} cannot be read: ${path}`);
	}
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`${label} is not valid JSON`);
	}
}

/**
 * One pass of the local loop: read a checkout and promote it into the vault
 * through the installer Handbook itself ships. Nothing is written when any
 * document, asset or limit is refused, and `data.json` is never touched.
 */
export async function syncSchemaSource(options: SyncOptions): Promise<SyncResult> {
	const vaultRoot = resolve(options.vaultRoot);
	const sourceRoot = resolve(options.sourceRoot);
	const configDir = options.configDir ?? ".obsidian";

	const pluginManifest = join(vaultRoot, configDir, "plugins", PLUGIN_ID, "manifest.json");
	const manifest = await readJson(pluginManifest, "Handbook is not installed in this vault; its manifest").catch(() => {
		throw new Error(`Handbook is not installed in this vault: ${pluginManifest}`);
	}) as { version?: unknown };
	if (typeof manifest.version !== "string" || manifest.version.length === 0) {
		throw new Error(`${pluginManifest} has no version`);
	}

	const catalogue = await readJson(join(sourceRoot, "handbook.json"), "handbook.json") as {
		repository?: unknown;
		packs?: unknown;
	};
	if (!isSafeSchemaSourceRepository(catalogue.repository)) {
		throw new Error("handbook.json has no usable repository");
	}
	const repository = catalogue.repository;

	const source: SchemaSource = {
		repository,
		id: schemaSourceId(repository),
		reference: { kind: "branch", value: "local" },
	};
	const adapter = createNodeAdapter(vaultRoot);
	const plugin = {
		manifest: { version: manifest.version },
		app: { vault: { configDir, adapter } },
	} as unknown as Plugin;

	const resolved = await readLocalSource(sourceRoot);
	await installResolvedSchemaSource(plugin, source, resolved);

	const packs: SyncResult["packs"] = [];
	if (Array.isArray(catalogue.packs)) {
		for (const entry of catalogue.packs as Array<{ id?: unknown; version?: unknown }>) {
			if (typeof entry.id === "string" && typeof entry.version === "string") {
				packs.push({ id: entry.id, version: entry.version });
			}
		}
	}
	return { sourceId: source.id, repository, revision: resolved.revision, packs };
}
