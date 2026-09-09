import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "handbook-variants-"));
const output = join(temporaryDirectory, "assert-game-variants.mjs");

try {
	await build({
		entryPoints: ["tools/assertGameVariants.harness.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
		external: ["obsidian"],
	});
	await import(output);
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
