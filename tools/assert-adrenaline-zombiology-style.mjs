import { buildSync } from "esbuild";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const candidates = [];
if (process.env.SCHEMA_ADRENALINE_ROOT) {
	candidates.push(resolve(process.env.SCHEMA_ADRENALINE_ROOT));
}
candidates.push(resolve(projectRoot, "..", "schema-adrenaline"));

const common = spawnSync("git", ["rev-parse", "--git-common-dir"], {
	cwd: projectRoot,
	encoding: "utf8",
});
if (common.status === 0) {
	const commonDirectory = resolve(projectRoot, common.stdout.trim());
	candidates.push(resolve(dirname(dirname(commonDirectory)), "schema-adrenaline"));
}

const sourceRoot = candidates.find((candidate) =>
	existsSync(join(candidate, "handbook", "adrenaline", "pack.json")),
);
if (!sourceRoot) {
	console.error(
		`schema-adrenaline was not found. Tried:\n${candidates.join("\n")}\nSet SCHEMA_ADRENALINE_ROOT to its checkout.`,
	);
	process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "handbook-adrenaline-zombiology-style-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "assert.cjs");
writeFileSync(stub, `export class Notice {}
export class Menu {}
export class MenuItem {}
export class Editor {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Modal {}
export class ItemView {}
export function setIcon() {}
`);

try {
	buildSync({
		entryPoints: ["tools/assertAdrenalineZombiologyStyle.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node16",
		alias: { obsidian: stub },
		logLevel: "warning",
	});
	const run = spawnSync(process.execPath, [bundle], {
		stdio: "inherit",
		env: { ...process.env, SCHEMA_ADRENALINE_ROOT: sourceRoot },
	});
	process.exit(run.status ?? 1);
} finally {
	rmSync(work, { recursive: true, force: true });
}
