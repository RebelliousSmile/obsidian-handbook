import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

/**
 * The slice of Obsidian's `DataAdapter` that `installResolvedSchemaSource` and
 * `replaceSchemaSource` call, backed by a directory on disk. Paths are
 * vault-relative with `/`, as the installer writes them; anything that resolves
 * outside the vault root is refused, so a local run cannot write elsewhere.
 */
export interface NodeVaultAdapter {
	exists(path: string): Promise<boolean>;
	mkdir(path: string): Promise<void>;
	rmdir(path: string, recursive: boolean): Promise<void>;
	rename(from: string, to: string): Promise<void>;
	write(path: string, data: string): Promise<void>;
	writeBinary(path: string, data: ArrayBuffer): Promise<void>;
}

const TRANSIENT_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);

function isTransient(error: unknown): boolean {
	const code = (error as { code?: unknown } | null)?.code;
	return typeof code === "string" && TRANSIENT_CODES.has(code);
}

/**
 * Obsidian, an indexer or an antivirus may hold a folder for an instant on
 * Windows. A few short retries absorb that; a lasting lock still surfaces and
 * `replaceSchemaSource` restores the previous folder.
 */
async function retrying<T>(operation: () => Promise<T>, attempts: number): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			if (!isTransient(error) || attempt === attempts) break;
			await new Promise((done) => setTimeout(done, 100 * attempt));
		}
	}
	throw lastError;
}

/** Resolve `child` under `root`, or throw when it leaves it or is the root. */
export function resolveInside(root: string, child: string): string {
	const absolute = resolve(root, child);
	const offset = relative(root, absolute);
	if (offset === "" || offset.startsWith("..") || isAbsolute(offset)) {
		throw new Error(`path leaves the vault: ${child}`);
	}
	return absolute;
}

export function createNodeAdapter(vaultRoot: string, attempts = 5): NodeVaultAdapter {
	const root = resolve(vaultRoot);
	return {
		exists: async (path) => {
			try {
				await stat(resolveInside(root, path));
				return true;
			} catch (error) {
				if ((error as { code?: unknown } | null)?.code === "ENOENT") return false;
				throw error;
			}
		},
		mkdir: async (path) => {
			await mkdir(resolveInside(root, path), { recursive: true });
		},
		rmdir: async (path, recursive) => {
			const target = resolveInside(root, path);
			await retrying(() => rm(target, { recursive, force: false }), attempts);
		},
		rename: async (from, to) => {
			const source = resolveInside(root, from);
			const target = resolveInside(root, to);
			await retrying(() => rename(source, target), attempts);
		},
		write: async (path, data) => {
			await writeFile(resolveInside(root, path), data, "utf8");
		},
		writeBinary: async (path, data) => {
			await writeFile(resolveInside(root, path), new Uint8Array(data));
		},
	};
}
