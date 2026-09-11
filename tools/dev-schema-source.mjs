import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	utimesSync,
	watch,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

function argument(name) {
	const index = process.argv.indexOf(name);
	if (index !== -1) {
		return process.argv[index + 1] ?? null;
	}
	const assignment = process.argv.find((value) => value.startsWith(`${name}=`));
	return assignment ? assignment.slice(name.length + 1) : null;
}

function positionalArguments() {
	const values = [];
	for (let index = 2; index < process.argv.length; index += 1) {
		const value = process.argv[index];
		if (["--source", "--vault", "--config-dir"].includes(value)) {
			index += 1;
			continue;
		}
		if (value === "--once" || value.startsWith("--")) {
			continue;
		}
		values.push(value);
	}
	return values;
}

function fail(message) {
	console.error(`Schema source dev: ${message}`);
	process.exit(1);
}

const sourceArgument = argument("--source");
const vaultArgument = argument("--vault") ?? positionalArguments()[0] ?? null;
const configDirectory = argument("--config-dir") ?? ".obsidian";
const once = process.argv.includes("--once");

if (!sourceArgument || !vaultArgument) {
	fail(
		"usage: npm run dev:schema-pbta -- <vault> [--config-dir=.obsidian]",
	);
}

const sourceRoot = resolve(sourceArgument);
const vaultRoot = resolve(vaultArgument);
const cataloguePath = join(sourceRoot, "handbook.json");

if (!existsSync(cataloguePath)) {
	fail(`missing source catalogue: ${cataloguePath}`);
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const catalogue = readJson(cataloguePath);
if (
	typeof catalogue.repository !== "string" ||
	!Array.isArray(catalogue.packs)
) {
	fail(`${cataloguePath} is not a usable Handbook catalogue`);
}

const sourceId = catalogue.repository.trim().toLowerCase().replace("/", "--");
const handbookData = join(vaultRoot, configDirectory, "handbook");
const installedSource = join(handbookData, "sources", sourceId);
const sourceMetadata = join(installedSource, "source.json");
const pluginDirectory = join(
	vaultRoot,
	configDirectory,
	"plugins",
	"obsidian-handbook",
);
const pluginMain = join(pluginDirectory, "main.js");
const hotReloadMarker = join(pluginDirectory, ".hotreload");

if (!existsSync(sourceMetadata)) {
	fail(
		`install ${catalogue.repository} once from Handbook before starting local development`,
	);
}
if (!existsSync(pluginMain)) {
	fail(`Handbook is not installed in this vault: ${pluginMain}`);
}

function prepareSync(currentCatalogue) {
	return currentCatalogue.packs.map((entry) => {
		if (
			typeof entry?.id !== "string" ||
			typeof entry?.path !== "string" ||
			!entry.path.endsWith("/pack.json")
		) {
			throw new Error("handbook.json contains an invalid pack entry");
		}

		const manifestPath = join(sourceRoot, ...entry.path.split("/"));
		const manifest = readJson(manifestPath);
		if (
			manifest?.pack?.id !== entry.id ||
			manifest?.version !== entry.version
		) {
			throw new Error(
				`${entry.path} does not match pack ${entry.id} version ${entry.version}`,
			);
		}

		return {
			id: entry.id,
			manifestPath,
			sourceDirectory: dirname(manifestPath),
		};
	});
}

function syncSource() {
	const currentCatalogue = readJson(cataloguePath);
	if (
		currentCatalogue.repository !== catalogue.repository ||
		!Array.isArray(currentCatalogue.packs)
	) {
		throw new Error("handbook.json changed repository or has no pack list");
	}
	const packs = prepareSync(currentCatalogue);
	mkdirSync(installedSource, { recursive: true });
	copyFileSync(cataloguePath, join(installedSource, "handbook.json"));

	for (const pack of packs) {
		const target = join(installedSource, "packs", pack.id);
		mkdirSync(target, { recursive: true });
		copyFileSync(pack.manifestPath, join(target, "pack.json"));

		const assets = join(pack.sourceDirectory, "assets");
		if (existsSync(assets)) {
			cpSync(assets, join(target, "assets"), {
				recursive: true,
				force: true,
			});
		}
	}

	if (!existsSync(hotReloadMarker)) {
		writeFileSync(hotReloadMarker, "");
	}
	const now = new Date();
	utimesSync(pluginMain, now, now);
	console.log(
		`[${now.toLocaleTimeString()}] Synced ${String(packs.length)} packs and requested Handbook reload.`,
	);
}

try {
	syncSource();
} catch (error) {
	fail(error instanceof Error ? error.message : String(error));
}

if (once) {
	process.exit(0);
}

let timer;
watch(sourceRoot, { recursive: true }, (_event, filename) => {
	if (!filename) return;
	const changed = relative(sourceRoot, join(sourceRoot, filename));
	const parts = changed.split(sep);
	const installable =
		changed === "handbook.json" ||
		(parts[0] === "handbook" &&
			(parts.at(-1) === "pack.json" || parts.includes("assets")));

	if (!installable) {
		if (parts.includes("styles")) {
			console.log(
				`${changed} belongs to the HTML preview and is not loaded by Obsidian.`,
			);
		}
		return;
	}

	clearTimeout(timer);
	timer = setTimeout(() => {
		try {
			syncSource();
		} catch (error) {
			console.error(
				`Local source not installed; keeping the last valid version: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}, 150);
});

console.log(`Watching ${sourceRoot} for installable Handbook pack changes...`);
