import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

/* Moves one schema pin to a published release: package.json, then the lockfile. It is what the
   `Bump schema` workflow runs when a provider publishes, so a pin is never retyped by hand and
   never points anywhere but a versioned public release asset.

   The lockfile is rewritten as text, not by pnpm: resolving a release asset makes pnpm record the
   signed storage URL GitHub redirects to, which expires and carries no SRI. The SRI written here
   is computed from the published bytes, the very thing `assert:consumer-schema-pins` compares. */

const PROVIDERS = ["schema-adrenaline", "schema-in-the-mist", "schema-pbta"];
const TAG = /^v(\d+\.\d+\.\d+)(?:-rc\.\d+)?$/;
const RESOLVED = ["dependencies", "peerDependencies", "optionalDependencies"];

/** The canonical asset URL of `tag`: a candidate archive carries the final version. */
export function releaseAssetUrl(name, tag) {
	assert.ok(PROVIDERS.includes(name), `unknown schema package: ${String(name)}`);
	const match = TAG.exec(tag);
	assert.ok(match, `tag must be vX.Y.Z or vX.Y.Z-rc.N, found ${String(tag)}`);
	return `https://github.com/RebelliousSmile/${name}/releases/download/${tag}/${name}-${match[1]}.tgz`;
}

/** The URL `name` is pinned to; anything but a release asset of that package is refused. */
export function currentPin(source, name) {
	const url = JSON.parse(source).dependencies?.[name];
	const prefix = `https://github.com/RebelliousSmile/${name}/releases/download/`;
	assert.ok(typeof url === "string" && url.startsWith(prefix), `package.json does not pin ${name} to a release asset: ${String(url)}`);
	return url;
}

/** `source` with every mention of the old asset moved to the new one. */
export function withPin(source, from, to) {
	assert.ok(source.includes(from), `nothing pins ${from}`);
	return source.split(from).join(to);
}

/** A pnpm lockfile whose `name` resolution carries the SRI and version of the new archive. */
export function withPnpmResolution(lock, name, url, integrity, version) {
	const eol = lock.includes("\r\n") ? "\r\n" : "\n";
	const lines = lock.split(eol);
	const at = lines.indexOf(`  ${name}@${url}:`);
	assert.ok(at >= 0 && /^ {4}resolution: \{integrity: sha512-/.test(lines[at + 1] ?? ""), `pnpm-lock.yaml has no resolution for ${name}`);
	lines[at + 1] = `    resolution: {integrity: ${integrity}, tarball: ${url}}`;
	assert.ok(/^ {4}version: /.test(lines[at + 2] ?? ""), `pnpm-lock.yaml records no version for ${name}`);
	lines[at + 2] = `    version: ${version}`;
	return lines.join(eol);
}

/** package.json of an npm archive, read without unpacking it to disk. */
export function archiveManifest(bytes) {
	const tar = gunzipSync(bytes);
	for (let offset = 0; offset + 512 <= tar.length; ) {
		const name = tar.toString("utf8", offset, offset + 100).replace(/\0.*$/, "");
		if (name === "") break;
		const size = parseInt(tar.toString("utf8", offset + 124, offset + 136), 8);
		if (name === "package/package.json") return JSON.parse(tar.toString("utf8", offset + 512, offset + 512 + size));
		offset += 512 + Math.ceil(size / 512) * 512;
	}
	throw new assert.AssertionError({ message: "archive has no package/package.json" });
}

export function integrityOf(bytes) {
	return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

async function download(url) {
	const response = await fetch(url);
	assert.ok(response.ok, `${url} is not published: ${response.status}`);
	return Buffer.from(await response.arrayBuffer());
}

/** The published facts a lockfile needs, after proving the text rewrite is enough for them. */
export async function resolveBump(name, tag, from) {
	const to = releaseAssetUrl(name, tag);
	const bytes = await download(to);
	const manifest = archiveManifest(bytes);
	assert.equal(manifest.name, name, `${to} packs ${manifest.name}`);
	assert.equal(`v${manifest.version}`, tag.replace(/-rc\.\d+$/, ""), `${to} packs version ${manifest.version}`);
	if (from !== to) {
		const previous = archiveManifest(await download(from));
		for (const field of RESOLVED) {
			// New or moved dependencies need a real resolution, which no text rewrite can invent.
			assert.deepEqual(manifest[field] ?? {}, previous[field] ?? {}, `${name} ${tag} changes its ${field}: resolve the lockfile by hand`);
		}
	}
	return { to, integrity: integrityOf(bytes), version: manifest.version };
}

async function main() {
	const [name, tag] = process.argv.slice(2);
	const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const packagePath = resolve(root, "package.json");
	const lockPath = resolve(root, "pnpm-lock.yaml");
	const source = readFileSync(packagePath, "utf8");
	const from = currentPin(source, name);
	const { to, integrity, version } = await resolveBump(name, tag, from);
	if (from !== to) writeFileSync(packagePath, withPin(source, from, to));
	const lock = readFileSync(lockPath, "utf8");
	const next = withPnpmResolution(from === to ? lock : withPin(lock, from, to), name, to, integrity, version);
	if (next !== lock) writeFileSync(lockPath, next);
	console.log(from === to && next === lock ? `${name} is already pinned to ${tag}.` : `${name} pinned to ${tag}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
