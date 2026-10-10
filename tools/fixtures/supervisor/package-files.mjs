/**
 * What the package of a test repository publishes, and the archive of it.
 *
 * The files are `package.json` and the entries of its `files`, or the whole
 * directory without that field: what the stand-in `npm pack --dry-run --json`
 * lists (`fake-npm.mjs`). The archive is a gzipped tar as npm packs one, every
 * path under `package/`, so the supervisor reads a test candidate the way it
 * reads a real one.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

/** The files under `path` (relative to `dir`), a file or a directory. */
function walk(dir, path, found = []) {
	const full = join(dir, path);
	if (!existsSync(full)) return found;
	if (!statSync(full).isDirectory()) {
		found.push(path.split("\\").join("/"));
		return found;
	}
	for (const entry of readdirSync(full)) {
		if (entry === ".git" || entry === "node_modules") continue;
		walk(dir, path === "." ? entry : join(path, entry), found);
	}
	return found;
}

export function packageFiles(dir) {
	const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
	const entries = Array.isArray(manifest.files) ? ["package.json", ...manifest.files] : ["."];
	return [...new Set(entries.reduce((found, entry) => walk(dir, entry, found), []))];
}

function header(path, size, mtime) {
	const block = Buffer.alloc(512);
	const name = `package/${path}`;
	if (Buffer.byteLength(name) > 100) throw new Error(`package-files: ${path} is too long for a test archive`);
	block.write(name, 0);
	block.write("0000644\0", 100);
	block.write("0000000\0", 108);
	block.write("0000000\0", 116);
	block.write(`${size.toString(8).padStart(11, "0")}\0`, 124);
	block.write(`${mtime.toString(8).padStart(11, "0")}\0`, 136);
	block.write("        ", 148);
	block.write("0", 156);
	block.write("ustar\u000000", 257);
	block.write(`${block.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, "0")}\0 `, 148);
	return block;
}

/**
 * The archive of the package of `dir`. `mtime` changes its bytes and none of
 * its files, as packing it again does. `crlf` writes every line ending as a
 * runner on another platform would. `files` replaces or adds a file (a
 * string) or leaves one out (null): an archive packed from something else.
 */
export function packageArchive(dir, { mtime = 0, crlf = false, files = {} } = {}) {
	const contents = new Map(packageFiles(dir).sort().map((path) => [path, readFileSync(join(dir, path))]));
	for (const path of Object.keys(files)) {
		if (files[path] === null) contents.delete(path);
		else contents.set(path, Buffer.from(files[path]));
	}
	const blocks = [];
	for (const [path, bytes] of contents) {
		const body = crlf ? Buffer.from(bytes.toString("latin1").replace(/\r?\n/g, "\r\n"), "latin1") : bytes;
		blocks.push(header(path, body.length, mtime), body, Buffer.alloc((512 - (body.length % 512)) % 512));
	}
	blocks.push(Buffer.alloc(1024));
	return gzipSync(Buffer.concat(blocks));
}
