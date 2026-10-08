/**
 * A guard is written by role, never by literal.
 *
 * A train moves versions, pins and tags: that is its work. A guard that
 * compares one of them to a number written in its source turns red because
 * the train did what it was asked, and costs a cycle. It reads the source that
 * declares the value instead (`package.json`, the lockfile, a train manifest).
 *
 * Two things live here, both pure:
 *   - `findLiterals`: the three figures a guard may not carry, a version of
 *     three components, a release tag, the archive URL of a release;
 *   - `finalPin`: the role "the final release a consumer pins", read from the
 *     files that declare it, for a guard that used to spell it out.
 */

/** A line that carries a closed test datum says so, and says why. */
export const FIXTURE_MARKER = "guard-fixture:";

/**
 * The guards of Handbook that measure a pin, a version or a train. A generic
 * pattern (a regular expression without frozen figures) is not a literal.
 */
export const GUARDS = [
	"tools/assert-adrenaline-contract.mjs",
	"tools/assert-consumer-schema-pins.mjs",
	"tools/assert-mist-contract.mjs",
	"tools/assert-pbta-contract.mjs",
	"tools/assert-release-train-schema-adrenaline.mjs",
	"tools/assert-release-train-schema-in-the-mist.mjs",
	"tools/assert-release-train-schema-pbta.mjs",
	"tools/assert-release-version.mjs",
	"tools/pbtaPackCoverage.harness.mts",
	"tools/prove-schema-adrenaline-candidate.mjs",
	"tools/prove-schema-in-the-mist-candidate.mjs",
	"tools/prove-schema-pbta-candidate.mjs",
	"tools/release-train-schema-pbta-assert.mjs",
];

// The most telling figure first: an archive URL also holds a tag, a tag also holds a version.
const MOTIFS = [
	["release archive URL", /releases\/download\/v?\d[^\s"'`]*/],
	["release tag", /(?<![\w.-])v\d+\.\d+\.\d+(?:-rc\.\d+)?(?!\.\d)/],
	["version number", /(?<![\w.-])\d+\.\d+\.\d+(?!\.\d)/],
];

/** Whether `line` is only commentary, given whether it opens inside a block comment; a comment compares nothing. */
function commentary(line, inBlock) {
	const text = line.trim();
	if (inBlock) return { comment: true, inBlock: !text.includes("*/") };
	if (text.startsWith("//")) return { comment: true, inBlock: false };
	if (text.startsWith("/*")) return { comment: true, inBlock: !text.includes("*/") };
	return { comment: false, inBlock: false };
}

/** The frozen figures of a guard's `source`: `{ line, kind, literal }`, the line counted from 1. */
export function findLiterals(source) {
	const found = [];
	let inBlock = false;
	source.split(/\r?\n/).forEach((line, index) => {
		const state = commentary(line, inBlock);
		inBlock = state.inBlock;
		if (state.comment) return;
		const marker = line.indexOf(FIXTURE_MARKER);
		if (marker !== -1 && line.slice(marker + FIXTURE_MARKER.length).replace(/\*\/\s*$/, "").trim() !== "") return;
		for (const [kind, pattern] of MOTIFS) {
			const match = line.match(pattern);
			if (match) {
				found.push({ line: index + 1, kind, literal: match[0] });
				return;
			}
		}
	});
	return found;
}

/** One line per frozen figure of `files` (`{ path: source }`), naming file and line. */
export function describeLiterals(files) {
	const lines = [];
	for (const path of Object.keys(files).sort()) {
		for (const entry of findLiterals(files[path])) {
			lines.push(`${path}:${entry.line}: ${entry.kind} ${entry.literal} is written in a guard; read the source that declares it, or mark a closed test datum with \`${FIXTURE_MARKER} <why>\``);
		}
	}
	return lines;
}

/**
 * The final release of `name` a consumer pins: its URL as `packageJson`
 * declares it, the integrity its lockfile records for that URL, and the
 * version, which the installed package must carry. Throws on a role that is
 * not held, naming both values.
 */
export function finalPin(name, packageJson, lockText, installedVersion) {
	const releaseUrl = packageJson.dependencies?.[name];
	if (typeof releaseUrl !== "string") throw new Error(`${name} is not a dependency of package.json`);
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = releaseUrl.match(new RegExp(`^https://github\\.com/RebelliousSmile/${escaped}/releases/download/v(\\d+\\.\\d+\\.\\d+)/${escaped}-\\1\\.tgz$`));
	if (!match) throw new Error(`${name} is pinned to ${releaseUrl}, which is not the archive of a final release of ${name}`);
	const version = match[1];
	const resolution = lockText.split(/\r?\n/).find((line) => line.includes("resolution: {") && line.includes(`tarball: ${releaseUrl}}`));
	const integrity = resolution?.match(/integrity: (sha512-[A-Za-z0-9+/=]+)/)?.[1];
	if (!integrity) throw new Error(`pnpm-lock.yaml records no integrity for ${releaseUrl}, the pin of ${name} in package.json`);
	if (installedVersion !== version) throw new Error(`${name} is installed at ${String(installedVersion)} while package.json pins ${version}`);
	return { releaseUrl, version, integrity };
}
