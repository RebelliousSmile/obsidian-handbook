import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { buildSync } from "esbuild";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/* The pin is read, never copied: a producer release is not this repo's to hard-code. What is checked
   is that every place recording the pin agrees with package.json — the bump stays a one-line edit. */
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const releaseUrl = packageJson.dependencies["schema-in-the-mist"];
assert.ok(
	releaseUrl.startsWith("https://github.com/") &&
		releaseUrl.includes("/schema-in-the-mist/releases/download/v") &&
		releaseUrl.endsWith(".tgz"),
	`schema-in-the-mist must be pinned to a public release asset, found ${releaseUrl}`,
);
const pinnedVersion = releaseUrl.slice(releaseUrl.lastIndexOf("-") + 1, -".tgz".length);

/* Only pnpm-lock.yaml is tracked, so it is the only lockfile a clean checkout has: the former
   package-lock.json assertion was green here and unreachable in CI. */
const pnpmLock = readFileSync("pnpm-lock.yaml", "utf8");
assert.ok(pnpmLock.includes(`specifier: ${releaseUrl}`));
const resolution = pnpmLock
	.split("\n")
	.filter((line) => line.indexOf("resolution: {") >= 0)
	.filter((line) => line.indexOf(`schema-in-the-mist-${pinnedVersion}.tgz`) >= 0)[0];
assert.ok(resolution, `pnpm lockfile must resolve the schema-in-the-mist v${pinnedVersion} release asset`);
assert.ok(
	resolution.indexOf("integrity: sha512-") >= 0,
	"the resolved schema-in-the-mist tarball must carry its SRI, or the pin proves nothing about its content",
);

const installedPackageUrl = import.meta.resolve("schema-in-the-mist/package.json");
const installedPackage = JSON.parse(
	readFileSync(new URL(installedPackageUrl), "utf8"),
);
assert.equal(installedPackage.version, pinnedVersion, "the installed package must be the pinned release");

const work = mkdtempSync(join(tmpdir(), "handbook-mist-contract-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "harness.cjs");
const requireFromHere = createRequire(import.meta.url);
const schemaPresentationUrl = pathToFileURL(
	join(
		dirname(requireFromHere.resolve("schema-pbta/cross-tool-provider.json")),
		"dist/presentation/monsterhearts-appearance-assets.js",
	),
).href;
writeFileSync(
	stub,
	`export class Notice { constructor() {} }
export class TFile {}
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
		define: { "import.meta.url": JSON.stringify(schemaPresentationUrl) },
		alias: { obsidian: stub },
		external: ["fs", "path", "module"],
		logLevel: "warning",
	});
	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	process.exit(run.status ?? 1);
} finally {
	rmSync(work, { recursive: true, force: true });
}
