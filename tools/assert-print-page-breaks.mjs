import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "handbook-print-breaks-"));
const output = join(temporaryDirectory, "assert-print-page-breaks.mjs");
const stylesheet = join(temporaryDirectory, "styles.css");

try {
	await build({
		entryPoints: ["tools/printPageBreaks.harness.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
	});
	await import(pathToFileURL(output).href);
	await build({
		entryPoints: ["src/styles/styles.scss"],
		outfile: stylesheet,
		bundle: true,
		loader: { ".scss": "css" },
		plugins: [sassPlugin({ type: "css" })],
		logLevel: "silent",
	});
	const css = await readFile(stylesheet, "utf8");
	for (const fragment of [
		".print .markdown-preview-view .handbook-print-keep-together",
		".print .markdown-preview-view .handbook-print-full-page",
		"break-before: page",
		".handbook-print-page-lead",
	]) {
		if (!css.includes(fragment)) {
			throw new Error(`dist stylesheet lacks "${fragment}"`);
		}
	}
	// The print font of Adrenaline: body text and h3 follow the pack, not Arial.
	if (!/\.print \.markdown-preview-view\s*\{[^}]*font-family:\s*var\(--font-text-theme/.test(css)) {
		throw new Error("the Adrenaline export does not map the body font to --font-text-theme");
	}
	if (!/\.print \.markdown-preview-view\) h3[^{]*\{[^}]*font-family:\s*var\(--h3-font/.test(css)) {
		throw new Error("the Adrenaline export does not map h3 to --h3-font");
	}
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
