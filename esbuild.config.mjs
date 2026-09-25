import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { sassPlugin } from "esbuild-sass-plugin";
import fs from "fs";
import path from "path";
import { assertPluginBundle } from "./tools/assert-plugin-bundle.mjs";

const banner = `/* Handbook, game-specific themes and tools for Obsidian tabletop roleplaying vaults. */`;
const outdir = "dist";
const prod =
	process.argv.includes("production") ||
	process.argv.includes("--production");
const watch = process.argv.includes("--watch");
const pbtaReleaseUrl = JSON.parse(fs.readFileSync("package.json", "utf8")).dependencies["schema-pbta"];
const pbtaTag = /\/releases\/download\/([^/]+)\//.exec(pbtaReleaseUrl)?.[1];
if (!pbtaTag) throw new Error("schema-pbta must use a tagged release archive");

function ensureOutdir() {
	fs.mkdirSync(path.resolve(outdir), { recursive: true });
}

// Helper to copy manifest.json
function copyManifest() {
	const src = path.resolve("manifest.json");
	const dest = path.resolve(outdir, "manifest.json");
	fs.copyFileSync(src, dest);
	console.log("📄 Copied manifest.json");
}

// The illustrations no longer live inside the stylesheet: they are files the
// plugin looks for in its own folder in the vault, so the build has to put
// them next to `main.js` for a release to carry them at all.
function copyAssets() {
	const src = path.resolve("assets");
	if (!fs.existsSync(src)) {
		return;
	}

	const dest = path.resolve(outdir, "assets");
	fs.rmSync(dest, { recursive: true, force: true });
	fs.cpSync(src, dest, { recursive: true });
	console.log("🖼  Copied assets");
}

const styleBuildOptions = {
	banner: { js: banner, css: banner },
	entryPoints: ["src/styles/styles.scss"],
	bundle: true,
	loader: { ".scss": "css" },
	minify: prod,
	outdir,
	plugins: [sassPlugin({ type: "css" })],
};

const pluginBuildOptions = {
	banner: { js: banner },
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	format: "cjs",
	loader: { ".svg": "text" },
	plugins: [{
		name: "schema-pbta-browser-assets",
		setup(build) {
			build.onLoad({ filter: /monsterhearts-appearance-assets\.js$/ }, async ({ path: sourcePath }) => ({
				contents: (await fs.promises.readFile(sourcePath, "utf8")).replaceAll(
					"import.meta.url",
					JSON.stringify(`https://raw.githubusercontent.com/RebelliousSmile/schema-pbta/${pbtaTag}/dist/presentation/monsterhearts-appearance-assets.js`),
				),
				loader: "js",
			}));
		},
	}],
	target: "es2018",
	logLevel: "info",
	minify: prod,
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outdir,
};

async function run() {
	ensureOutdir();

	if (watch) {
		const [styleCtx, pluginCtx] = await Promise.all([
			esbuild.context(styleBuildOptions),
			esbuild.context(pluginBuildOptions),
		]);

		copyManifest();
		copyAssets();

		await Promise.all([styleCtx.watch(), pluginCtx.watch()]);
		console.log("👀 Watching for changes...");
		return;
	}

	await Promise.all([
		esbuild.build(styleBuildOptions),
		esbuild.build(pluginBuildOptions),
	]);
	assertPluginBundle(fs.readFileSync(path.resolve(outdir, "main.js"), "utf8"));

	copyManifest();
	copyAssets();
	console.log("✨ Build completed.");
}

run().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
