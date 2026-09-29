/**
 * Bundle the supervisor harness, then run it.
 *
 * Same motif as the other harnesses: esbuild turns the `.mts` harness into
 * something node runs. `ajv` stays external and resolves from the repository's
 * node_modules, which is why the bundle is written under `tools/`.
 */
import { buildSync } from "esbuild";
import { mkdtempSync, rmSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const work = mkdtempSync(resolve("tools", ".supervisor-harness-"));
const bundle = join(work, "harness.cjs");

let status = 1;
try {
	buildSync({
		entryPoints: ["tools/supervisor.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node18",
		external: ["obsidian", "fs", "ajv"],
		logLevel: "warning",
	});
	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	status = run.status ?? 1;
} finally {
	rmSync(work, { recursive: true, force: true });
}

process.exit(status);
