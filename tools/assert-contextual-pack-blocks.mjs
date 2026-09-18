import { buildSync } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

const work = mkdtempSync(join(tmpdir(), "handbook-contextual-pack-blocks-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "harness.cjs");

writeFileSync(stub, `export class Notice { constructor() {} }
export class Menu {}
export class MenuItem {}
export class Editor {}
export class Plugin {}
export class TFile {}
`);

try {
	buildSync({
		entryPoints: ["tools/contextualPackBlocks.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node16",
		alias: { obsidian: stub },
		external: ["fs", "path"],
		logLevel: "warning",
	});

	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	process.exit(run.status ?? 1);
} finally {
	rmSync(work, { recursive: true, force: true });
}
