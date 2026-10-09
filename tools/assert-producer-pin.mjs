/**
 * Bundle the producer pin harness, then run it. Same motif as the other
 * harnesses: esbuild turns the `.mts` harness into something node runs.
 */
import { buildSync } from "esbuild";
import { mkdtempSync, rmSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const work = mkdtempSync(resolve("tools", ".producer-pin-harness-"));
let status = 0;
try {
	const bundle = join(work, "harness.mjs");
	buildSync({ entryPoints: ["tools/producerPin.harness.mts"], outfile: bundle, bundle: true, platform: "node", format: "esm", banner: { js: "import { createRequire as __cr } from \"module\"; const require = __cr(import.meta.url);" }, target: "node18", external: ["obsidian", "fs"], logLevel: "warning" });
	status = spawnSync(process.execPath, [bundle], { stdio: "inherit" }).status ?? 1;
} finally {
	rmSync(work, { recursive: true, force: true });
}
process.exit(status);
