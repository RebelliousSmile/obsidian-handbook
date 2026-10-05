import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temporaryDirectory = await mkdtemp(
	join(tmpdir(), "handbook-callout-retarget-"),
);
const output = join(temporaryDirectory, "assert-callout-retarget.mjs");

try {
	await build({
		entryPoints: ["tools/calloutRetarget.harness.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
	});
	await import(pathToFileURL(output).href);
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}

