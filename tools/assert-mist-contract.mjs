import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { buildSync } from "esbuild";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const releaseUrl =
	"https://github.com/RebelliousSmile/schema-in-the-mist/releases/download/v1.0.0/schema-in-the-mist-1.0.0.tgz";
const integrity =
	"sha512-6wgDSCKL9I2W/c00IRdIxOdXzrj4O6LE1catb5fztjaF0+QhFbro8Wn2mrvtr3S9koMSvuDRwWiAj+zgWhasiQ==";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(packageJson.dependencies["schema-in-the-mist"], releaseUrl);

const npmLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const npmPackage = npmLock.packages["node_modules/schema-in-the-mist"];
assert.equal(npmPackage.resolved, releaseUrl);
assert.equal(npmPackage.integrity, integrity);

const pnpmLock = readFileSync("pnpm-lock.yaml", "utf8");
assert.ok(pnpmLock.includes(`specifier: ${releaseUrl}`));
assert.ok(pnpmLock.includes(`version: ${releaseUrl}`));
assert.ok(pnpmLock.includes(`integrity: ${integrity}`));
assert.ok(pnpmLock.includes(`tarball: ${releaseUrl}`));
assert.ok(
	!pnpmLock.includes("release-assets.githubusercontent.com"),
	"pnpm lockfile must not persist a temporary signed GitHub URL",
);

const installedPackageUrl = import.meta.resolve("schema-in-the-mist/package.json");
const installedPackage = JSON.parse(
	readFileSync(new URL(installedPackageUrl), "utf8"),
);
assert.equal(installedPackage.version, "1.0.0");

const work = mkdtempSync(join(tmpdir(), "handbook-mist-contract-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "harness.cjs");
writeFileSync(
	stub,
	`export class Notice { constructor() {} }
export class Menu {}
export class MenuItem {}
export class Editor {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Modal {}
export class ItemView {}
export function setIcon() {}
`,
);

try {
	buildSync({
		entryPoints: ["tools/assertMistContract.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node16",
		alias: { obsidian: stub },
		external: ["fs", "path", "module"],
		logLevel: "warning",
	});
	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	process.exit(run.status ?? 1);
} finally {
	rmSync(work, { recursive: true, force: true });
}
