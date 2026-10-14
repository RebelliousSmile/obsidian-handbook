import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import type { ResolvedGithubSource } from "../../src/games/githubSources";
import { resolveInside } from "./nodeAdapter.mjs";

const run = promisify(execFile);

/** `HEAD` of the checkout, which must itself be the repository root. */
async function headRevision(root: string): Promise<string> {
	let stdout: string;
	try {
		// The parent is a ceiling so a folder inside another repository is not
		// mistaken for a checkout of its own.
		({ stdout } = await run("git", ["-C", root, "rev-parse", "HEAD"], {
			env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(root) },
		}));
	} catch {
		throw new Error(`${root} is not a git checkout: its HEAD revision cannot be read`);
	}
	const revision = stdout.trim();
	if (!/^[0-9a-f]{40}$/i.test(revision)) {
		throw new Error(`${root} has no 40-character HEAD revision`);
	}
	return revision;
}

function missing(path: string, root: string, error: unknown): Error {
	if ((error as { code?: unknown } | null)?.code === "ENOENT") {
		return new Error(`${path} is not in ${root}`);
	}
	return error instanceof Error ? error : new Error(String(error));
}

/** Read a local checkout the way the installer reads a GitHub revision. */
export async function readLocalSource(checkoutRoot: string): Promise<ResolvedGithubSource> {
	const root = resolve(checkoutRoot);
	const revision = await headRevision(root);
	return {
		revision,
		readText: async (path) => {
			try {
				return await readFile(resolveInside(root, path), "utf8");
			} catch (error) {
				throw missing(path, root, error);
			}
		},
		inspectBinary: async (path) => {
			try {
				return { contentLength: (await stat(resolveInside(root, path))).size };
			} catch (error) {
				throw missing(path, root, error);
			}
		},
		readBinary: async (path) => {
			try {
				const bytes = await readFile(resolveInside(root, path));
				return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
			} catch (error) {
				throw missing(path, root, error);
			}
		},
	};
}
