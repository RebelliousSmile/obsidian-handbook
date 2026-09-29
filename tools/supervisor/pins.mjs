/**
 * Schema pins of a consumer: `package.json` plus every tracked lockfile.
 *
 * A pin is a GitHub release asset URL. The tag, and whether it is a release
 * candidate, are read from the URL; the SRI is read from each lockfile's
 * resolution of that very URL. A lockfile that resolves another URL, or no
 * SRI, is reported as it is found rather than repaired.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isTracked } from "./git.mjs";

const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json"];
const PIN_URL = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/(v(\d+\.\d+\.\d+)(?:-rc\.(\d+))?)\/([^/]+)\.tgz$/;

export function parsePinUrl(url) {
	const match = PIN_URL.exec(url ?? "");
	if (!match) return null;
	return {
		repository: match[1],
		tag: match[2],
		version: match[3],
		rc: match[4] === undefined ? null : Number(match[4]),
		archive: `${match[5]}.tgz`,
	};
}

/** Every `<name>@<url>` resolution of a pnpm lockfile, with its SRI. */
export function pnpmLockPins(raw, name) {
	// A working tree checked out with autocrlf, then partly rewritten by pnpm, mixes CRLF and LF.
	const text = raw.replace(/\r\n/g, "\n");
	const pins = [];
	const lines = text.split("\n");
	const key = new RegExp(`^  ${escape(name)}@(https://\\S+\\.tgz):$`);
	for (let index = 0; index < lines.length; index += 1) {
		const match = key.exec(lines[index]);
		if (!match) continue;
		const resolution = lines[index + 1] ?? "";
		const integrity = /integrity: (sha512-[A-Za-z0-9+/]+={0,2})/.exec(resolution)?.[1] ?? null;
		const tarball = /tarball: (\S+?)[},]/.exec(resolution)?.[1] ?? null;
		if (resolution.includes("resolution:")) pins.push({ url: tarball ?? match[1], integrity });
	}
	const specifier = new RegExp(`^      ${escape(name)}:\\n        specifier: (\\S+)`, "m").exec(text)?.[1] ?? null;
	return { specifier, resolutions: pins };
}

function escape(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function npmLockPin(text, name) {
	const entry = JSON.parse(text).packages?.[`node_modules/${name}`];
	return entry ? { url: entry.resolved ?? null, integrity: entry.integrity ?? null } : null;
}

/** The lockfile view of one pin: URL and SRI, or the reason it cannot be read. */
function lockEntry(dir, file, name, url) {
	const text = readFileSync(resolve(dir, file), "utf8");
	if (file === "pnpm-lock.yaml") {
		const { specifier, resolutions } = pnpmLockPins(text, name);
		const resolution = resolutions.find((candidate) => candidate.url === url) ?? resolutions[0] ?? null;
		return {
			file,
			specifier,
			url: resolution?.url ?? null,
			integrity: resolution?.integrity ?? null,
		};
	}
	const entry = npmLockPin(text, name);
	return { file, specifier: null, url: entry?.url ?? null, integrity: entry?.integrity ?? null };
}

export function trackedLockfiles(dir) {
	return LOCKFILES.filter((file) => existsSync(resolve(dir, file)) && isTracked(dir, file));
}

/** The pin of `name` in the consumer at `dir`, or null when it does not declare one. */
export function readPin(dir, name, lockfiles = trackedLockfiles(dir)) {
	const manifest = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));
	const url = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name] ?? null;
	if (url === null) return null;
	const parsed = parsePinUrl(url);
	return {
		package: name,
		url,
		tag: parsed?.tag ?? null,
		version: parsed?.version ?? null,
		rc: parsed ? parsed.rc !== null : null,
		lockfiles: lockfiles.map((file) => lockEntry(dir, file, name, url)),
	};
}
