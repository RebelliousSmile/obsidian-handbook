import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lanternPackage = process.argv[2] ?? resolve(root, "../lantern/package.json");
const handbook = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const lantern = JSON.parse(readFileSync(lanternPackage, "utf8"));
const lock = readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8");

assert.equal(lock.includes("release-assets.githubusercontent.com"), false, "lockfile must not pin an expiring storage redirect");

function providerVersion(pkg, name, requireFinal) {
	const url = pkg.dependencies?.[name];
	assert.equal(typeof url, "string", `${pkg.name}: ${name} pin is missing`);
	const parsed = new URL(url);
	assert.equal(parsed.protocol, "https:", `${name} release pin must use HTTPS`);
	assert.equal(parsed.hostname, "github.com", `${name} release pin must use GitHub's canonical URL`);
	assert.equal(parsed.search, "", `${name} release pin must not carry a query`);
	assert.equal(parsed.hash, "", `${name} release pin must not carry a fragment`);
	const suffix = requireFinal ? "" : "(?:-rc\\.\\d+)?";
	const match = parsed.pathname.match(new RegExp(`^/RebelliousSmile/${name}/releases/download/v(\\d+\\.\\d+\\.\\d+)${suffix}/([^/]+)\\.tgz$`));
	assert.ok(match, `${pkg.name}: ${name} must point to a ${requireFinal ? "final " : ""}versioned public release asset`);
	const [, version, archive] = match;
	assert.ok(archive === `${name}-${version}` || name === "schema-adrenaline" && archive === "candidate", `${pkg.name}: ${name} archive name is not the published final asset`);
	return { url, version };
}

async function assertHandbookPin(name) {
	const { url, version } = providerVersion(handbook, name, true);
	assert.ok(lock.includes(`specifier: ${url}`), `${name}: lock importer specifier differs from package.json`);
	assert.ok(lock.includes(`version: ${url}`), `${name}: lock importer version differs from package.json`);
	assert.ok(lock.includes(`  ${name}@${url}:`), `${name}: lock package or snapshot key differs from package.json`);
	const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(`tarball: ${url}`));
	assert.ok(resolution, `${name}: canonical tarball is absent from lock resolution`);
	const integrity = /integrity: (sha512-[A-Za-z0-9+/]+={0,2})/.exec(resolution)?.[1];
	assert.ok(integrity, `${name}: lock resolution is missing SHA-512 SRI`);
	const response = await fetch(url);
	assert.ok(response.ok, `${name}: final release archive download failed: ${response.status}`);
	const publishedIntegrity = `sha512-${createHash("sha512").update(Buffer.from(await response.arrayBuffer())).digest("base64")}`;
	assert.equal(integrity, publishedIntegrity, `${name}: lock SRI differs from final release archive bytes`);
	return version;
}

const handbookVersions = Object.fromEntries(await Promise.all(
	["schema-adrenaline", "schema-in-the-mist", "schema-pbta"].map(async (name) => [name, await assertHandbookPin(name)]),
));
const lanternAdrenaline = providerVersion(lantern, "schema-adrenaline", false).version;
const lanternMist = providerVersion(lantern, "schema-in-the-mist", false).version;
assert.equal(handbookVersions["schema-adrenaline"].split(".")[0], lanternAdrenaline.split(".")[0], "schema-adrenaline major differs between Handbook and Lantern");
console.log(`Consumer schema pins are canonical and byte verified: Adrenaline ${handbookVersions["schema-adrenaline"]}/${lanternAdrenaline}, Mist ${handbookVersions["schema-in-the-mist"]}/${lanternMist}, PbtA ${handbookVersions["schema-pbta"]}.`);
