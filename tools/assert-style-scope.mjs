import { buildSync } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const work = mkdtempSync(join(tmpdir(), "handbook-style-scope-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = resolve("tools", ".assert-style-scope.mjs");

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
		entryPoints: ["tools/assertStyleScope.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node16",
		external: ["postcss", "postcss-selector-parser"],
		alias: { obsidian: stub },
		logLevel: "warning",
	});

	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	if (run.error) throw run.error;
	process.exitCode = run.status ?? 1;
} finally {
	rmSync(bundle, { force: true });
	rmSync(work, { recursive: true, force: true });
}
