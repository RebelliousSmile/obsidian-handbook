/**
 * Bundle the harness of the scheduling of `pnpm check`, then run it.
 *
 * Same motif as the other harnesses: esbuild turns the `.mts` harness into
 * something node runs. It starts no script: the launcher is a fake one.
 */
import { buildSync } from "esbuild";
import { mkdtempSync, rmSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const work = mkdtempSync(resolve("tools", ".check-run-harness-"));

let status = 0;
try {
	const bundle = join(work, "harness.cjs");
	buildSync({
		entryPoints: ["tools/checkRun.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node18",
		external: ["obsidian", "fs"],
		logLevel: "warning",
	});
	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	status = run.status ?? 1;
} finally {
	rmSync(work, { recursive: true, force: true });
}

process.exit(status);
