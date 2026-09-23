import { buildSync } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const work = mkdtempSync(resolve("tools", ".handbook-contextual-toml-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "harness.mjs");

writeFileSync(
	stub,
	`export class Notice { constructor() {} }
export class Menu {}
export class MenuItem {}
export class Editor {}
export class Plugin {}
export class TFile {}
`,
);

let status = 1;
try {
	buildSync({
		entryPoints: ["tools/contextualTomlExport.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node16",
		alias: { obsidian: stub },
		external: ["fs", "path", "postcss"],
		logLevel: "warning",
	});

	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	status = run.status ?? 1;
} finally {
	rmSync(work, { recursive: true, force: true });
}

process.exit(status);
