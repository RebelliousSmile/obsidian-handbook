/**
 * What a published archive holds, read against what was presented.
 *
 * `present` validates the consumers against the package of each provider and
 * writes, for each file of that package, the sha256 of its content
 * (`packedFiles.mjs`). Before a consumer adopts the candidate, `publish` reads
 * the archive GitHub serves and holds it to that list: same files, same
 * content. It proves nothing again; it sees an accident, an archive packed
 * from something else than what was presented.
 *
 * A content is the bytes with CRLF read as LF: a checkout on Windows and the
 * runner that packs do not write the same line endings.
 */
import { gunzipSync } from "node:zlib";
import { contentHash } from "./packedFiles.mjs";

const BLOCK = 512;

function text(block, start, length) {
	const field = block.subarray(start, start + length);
	const end = field.indexOf(0);
	return field.subarray(0, end < 0 ? length : end).toString("utf8");
}

/** The `path` of a pax extended header, or null: records are `<length> <key>=<value>\n`. */
function paxPath(body) {
	for (let at = 0; at < body.length; ) {
		const space = body.indexOf(0x20, at);
		const length = space < 0 ? NaN : Number(body.subarray(at, space).toString("utf8"));
		if (!Number.isInteger(length) || length <= 0) return null;
		const record = body.subarray(space + 1, at + length - 1).toString("utf8");
		if (record.startsWith("path=")) return record.slice("path=".length);
		at += length;
	}
	return null;
}

/**
 * The files of a `.tgz` as npm packs it, each with the sha256 of its content.
 * The first directory of every path (`package/`) is dropped, as an install
 * does. Throws when the bytes are not a gzipped tar.
 *
 * @returns {Record<string, string>}
 */
export function archiveContents(bytes) {
	const tar = gunzipSync(bytes);
	const contents = {};
	let longPath = null;
	for (let at = 0; at + BLOCK <= tar.length; ) {
		const header = tar.subarray(at, at + BLOCK);
		if (header.every((byte) => byte === 0)) break;
		const size = parseInt(text(header, 124, 12).trim() || "0", 8);
		if (!Number.isInteger(size) || size < 0) throw new Error(`entry at byte ${at} has no readable size`);
		const type = String.fromCharCode(header[156] || 0x30);
		const body = tar.subarray(at + BLOCK, at + BLOCK + size);
		if (body.length !== size) throw new Error(`entry at byte ${at} is cut short`);
		at += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
		if (type === "x") longPath = paxPath(body) ?? longPath;
		else if (type === "L") longPath = text(body, 0, body.length);
		else if (type === "0" || type === "7") {
			const prefix = text(header, 345, 155);
			const path = longPath ?? (prefix ? `${prefix}/${text(header, 0, 100)}` : text(header, 0, 100));
			contents[path.split("/").slice(1).join("/")] = contentHash(body);
			longPath = null;
		} else if (type !== "g") longPath = null;
	}
	if (Object.keys(contents).length === 0) throw new Error("it holds no file");
	return contents;
}

/** What separates the archive from the presented package: null when nothing does. */
export function archiveDrift(presented, archive) {
	const differ = Object.keys(presented).filter((path) => path in archive && archive[path] !== presented[path]).sort();
	const missing = Object.keys(presented).filter((path) => !(path in archive)).sort();
	const extra = Object.keys(archive).filter((path) => !(path in presented)).sort();
	return differ.length + missing.length + extra.length === 0 ? null : { differ, missing, extra };
}

const SHOWN = 10;

function named(paths, what) {
	if (paths.length === 0) return null;
	const more = paths.length > SHOWN ? `, and ${paths.length - SHOWN} more` : "";
	return `${paths.length} file(s) ${what} (${paths.slice(0, SHOWN).join(", ")}${more})`;
}

/** One sentence naming the files of a drift. */
export function describeDrift(drift) {
	return [
		named(drift.differ, "with another content"),
		named(drift.missing, "presented and not in the archive"),
		named(drift.extra, "in the archive and not presented"),
	].filter(Boolean).join("; ");
}
