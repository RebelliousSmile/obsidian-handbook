/**
 * `supervise preview`: the train's own code, running, before anyone approves it.
 *
 * Nothing here knows a game. What the preview mounts is read from the train
 * and from the checkouts it names:
 *
 * - every provider of the train that publishes a `handbook.json` catalogue is
 *   installed as a Handbook schema source in each vault, at its checkout's
 *   HEAD, the way Handbook's own installer lays it out;
 * - every package a provider exports is resolved to its checkout, through its
 *   `exports` map, for the coordinator's build and for each consumer that
 *   declares the package and runs a vite dev server;
 * - the coordinator is built against those checkouts and deployed next to
 *   the vault's `data.json`, which is never written.
 *
 * Builds and dev servers run behind the publication guard: a preview
 * publishes nothing.
 */
import { spawn } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { concernedRepos } from "./digest.mjs";
import { revParse } from "./git.mjs";
import { coordinatorOf, repoDir, SupervisorError } from "./topology.mjs";
import { GUARD_DIR, guardedEnv } from "./present.mjs";
import { spawnCommand } from "./spawn.mjs";

export const PREVIEW_SERVER = fileURLToPath(new URL("./previewServer.mjs", import.meta.url));
/** Read by `esbuild.config.mjs`: the coordinator's bundle resolves the train's packages to their checkouts. */
export const PREVIEW_ALIASES_ENV = "HANDBOOK_PREVIEW_ALIASES";

const CATALOGUE = "handbook.json";
const VITE_CONFIGS = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];

function readJson(file) {
	return JSON.parse(readFileSync(file, "utf8"));
}

function slash(path) {
	return path.replace(/\\/g, "/");
}

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeRelative(path) {
	const clean = slash(path);
	return clean.length > 0 && !clean.startsWith("/") && !clean.split("/").some((part) => part === "" || part === "." || part === "..") ? clean : null;
}

/** The file an `exports` entry names for an ES import, conditions resolved. */
function exportTarget(value) {
	if (typeof value === "string") return value;
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	for (const condition of ["import", "default", "require"]) {
		if (condition in value) return exportTarget(value[condition]);
	}
	return null;
}

/**
 * Aliases that resolve `name` and its subpaths to `dir` exactly as its
 * `exports` map does, a query suffix (`?raw`, `?url`) kept. Exact entries
 * first, then patterns, longest first. Without `exports`, the whole package
 * points at the directory.
 */
export function exportAliases(name, dir, exportsMap) {
	const root = slash(resolve(dir));
	if (!exportsMap || typeof exportsMap !== "object") {
		return [{ find: `^${escapeRegExp(name)}(?=/|$)`, replacement: root }];
	}
	const map = typeof exportsMap === "string" || Object.keys(exportsMap).every((key) => !key.startsWith(".")) ? { ".": exportsMap } : exportsMap;
	const exact = [];
	const patterns = [];
	for (const [key, value] of Object.entries(map)) {
		const target = exportTarget(value);
		if (!target || !target.startsWith("./")) continue;
		const specifier = key === "." ? name : `${name}/${key.slice(2)}`;
		const file = `${root}/${target.slice(2)}`;
		const star = specifier.indexOf("*");
		if (star === -1) {
			exact.push({ find: `^${escapeRegExp(specifier)}(\\?.*)?$`, replacement: `${file}$1` });
			continue;
		}
		const find = `^${escapeRegExp(specifier.slice(0, star))}([^?]*)${escapeRegExp(specifier.slice(star + 1))}(\\?.*)?$`;
		patterns.push({ find, replacement: `${file.replace("*", "$1")}$2`, weight: specifier.length });
	}
	patterns.sort((left, right) => right.weight - left.weight);
	return [...exact, ...patterns.map(({ find, replacement }) => ({ find, replacement }))];
}

/** The same identity Handbook derives for a source (`schemaSourceId`). */
export function schemaSourceId(repository) {
	return repository.trim().toLowerCase().replace("/", "--");
}

function packageManager(dir) {
	return existsSync(join(dir, "pnpm-lock.yaml")) && !existsSync(join(dir, "package-lock.json")) ? "pnpm" : "npm";
}

function packageJson(dir) {
	const file = join(dir, "package.json");
	return existsSync(file) ? readJson(file) : null;
}

/** A provider's Handbook catalogue, checked the way Handbook's installer checks it, or null when it publishes none. */
function readCatalogue(repo, dir) {
	const file = join(dir, CATALOGUE);
	if (!existsSync(file)) return null;
	const catalogue = readJson(file);
	if (typeof catalogue.repository !== "string" || !Array.isArray(catalogue.packs)) {
		throw new SupervisorError(`preview: ${repo.id}: ${CATALOGUE} has no repository or no pack list`, 1);
	}
	if (catalogue.repository.toLowerCase() !== repo.repository.toLowerCase()) {
		throw new SupervisorError(`preview: ${repo.id}: ${CATALOGUE} names ${catalogue.repository}, the topology ${repo.repository}`, 1);
	}
	const packs = catalogue.packs.map((entry) => {
		const path = typeof entry?.path === "string" ? safeRelative(entry.path) : null;
		if (typeof entry?.id !== "string" || !path || !path.endsWith("/pack.json")) {
			throw new SupervisorError(`preview: ${repo.id}: ${CATALOGUE} has an invalid pack entry`, 1);
		}
		const manifestPath = join(dir, ...path.split("/"));
		const manifest = readJson(manifestPath);
		if (manifest?.pack?.id !== entry.id || manifest?.version !== entry.version) {
			throw new SupervisorError(`preview: ${repo.id}: ${path} does not match pack ${entry.id} version ${entry.version}`, 1);
		}
		const assetRoot = safeRelative(manifest.pack.assets?.root ?? "assets");
		if (!assetRoot) throw new SupervisorError(`preview: ${repo.id}: pack ${entry.id} declares an unsafe asset root`, 1);
		return { id: entry.id, version: entry.version, manifestPath, assetRoot, assets: join(dirname(manifestPath), ...assetRoot.split("/")) };
	});
	return { file, repository: catalogue.repository, packs };
}

/**
 * What the preview of `train` mounts, read from the checkouts; writes nothing.
 * `vaults` are the Obsidian vaults that receive the coordinator's build and
 * the train's schema sources.
 */
export function planPreview(root, topology, train, { vaults = [], configDir = ".obsidian" } = {}) {
	const concerned = concernedRepos(topology, train);
	const providers = concerned.filter((repo) => repo.role === "provider" && train.items.some((item) => item.repo === repo.id));
	const coordinator = coordinatorOf(topology);
	const notes = [];

	const packages = providers.map((repo) => {
		const dir = repoDir(root, repo);
		const manifest = packageJson(dir);
		const name = manifest?.name ?? repo.package;
		return {
			repo: repo.id,
			dir,
			name,
			aliases: exportAliases(name, dir, manifest?.exports),
			build: manifest?.scripts?.build ? [packageManager(dir), "run", "build"] : null,
			catalogue: readCatalogue(repo, dir),
			revision: revParse(dir, "HEAD"),
		};
	});
	for (const provider of packages.filter((entry) => !entry.catalogue)) {
		notes.push(`${provider.repo}: publishes no ${CATALOGUE}, so no schema source is installed in a vault`);
	}

	const coordinatorDir = repoDir(root, coordinator);
	const coordinatorPackage = packageJson(coordinatorDir) ?? {};
	const pluginId = readJson(join(coordinatorDir, "manifest.json")).id;
	const declares = (manifest, name) => Boolean(manifest?.dependencies?.[name] ?? manifest?.devDependencies?.[name]);
	const handbook = {
		repo: coordinator.id,
		dir: coordinatorDir,
		pluginId,
		build: coordinatorPackage.scripts?.build ? [packageManager(coordinatorDir), "run", "build"] : null,
		aliases: packages.filter((provider) => declares(coordinatorPackage, provider.name)).flatMap((provider) => provider.aliases),
		vaults: vaults.map((vault) => ({ vault: resolve(vault), configDir: join(resolve(vault), configDir), pluginDir: join(resolve(vault), configDir, "plugins", pluginId), sourcesDir: join(resolve(vault), configDir, "handbook", "sources") })),
	};

	const consumers = [];
	for (const repo of concerned.filter((entry) => entry.role === "consumer")) {
		const dir = repoDir(root, repo);
		const manifest = packageJson(dir);
		const used = packages.filter((provider) => declares(manifest, provider.name));
		const configFile = VITE_CONFIGS.map((name) => join(dir, name)).find((file) => existsSync(file)) ?? null;
		if (!configFile) {
			notes.push(`${repo.id}: no vite config, no dev server to start`);
			continue;
		}
		if (used.length === 0) notes.push(`${repo.id}: declares no package of the train, served on its published pins`);
		consumers.push({
			repo: repo.id,
			dir,
			configFile,
			packages: used.map((provider) => provider.name),
			aliases: used.flatMap((provider) => provider.aliases),
			allow: [dir, ...used.map((provider) => provider.dir)],
		});
	}

	const used = new Set([...handbook.aliases, ...consumers.flatMap((consumer) => consumer.aliases)].map((alias) => alias.find));
	const builds = packages.filter((provider) => provider.build && provider.aliases.some((alias) => used.has(alias.find)));
	return { train: train.id, packages, builds, handbook, consumers, notes };
}

/**
 * Install each catalogue of the plan in each vault, as Handbook's installer
 * lays it out: `handbook.json`, `packs/<id>/pack.json`, the pack's assets and
 * `source.json` at the checkout's HEAD. The reference the vault registered is
 * kept; files are overwritten, none is removed, and `data.json` is only read.
 */
export function installSources(plan, now = new Date()) {
	const lines = [];
	for (const target of plan.handbook.vaults) {
		let registered = [];
		try {
			registered = readJson(join(target.pluginDir, "data.json")).schemaSources ?? [];
		} catch {
			registered = [];
		}
		for (const provider of plan.packages.filter((entry) => entry.catalogue)) {
			const id = schemaSourceId(provider.catalogue.repository);
			const dir = join(target.sourcesDir, id);
			let reference = null;
			try {
				reference = readJson(join(dir, "source.json")).reference ?? null;
			} catch {
				reference = registered.find((source) => source?.id === id)?.reference ?? null;
			}
			mkdirSync(dir, { recursive: true });
			copyFileSync(provider.catalogue.file, join(dir, CATALOGUE));
			for (const pack of provider.catalogue.packs) {
				const packDir = join(dir, "packs", pack.id);
				mkdirSync(packDir, { recursive: true });
				copyFileSync(pack.manifestPath, join(packDir, "pack.json"));
				if (existsSync(pack.assets)) cpSync(pack.assets, join(packDir, ...pack.assetRoot.split("/")), { recursive: true, force: true });
			}
			const source = { id, repository: provider.catalogue.repository, reference: reference ?? { kind: "branch", value: "main" }, revision: provider.revision, checkedAt: now.toISOString() };
			writeFileSync(join(dir, "source.json"), JSON.stringify(source, null, "\t"));
			const packs = provider.catalogue.packs.map((pack) => `${pack.id} ${pack.version}`).join(", ");
			lines.push(`${target.vault}: source ${id} at ${provider.revision.slice(0, 10)} (${packs})${registered.some((source) => source?.id === id) ? "" : "; not registered in this vault's settings, loaded from disk all the same"}`);
		}
	}
	return lines;
}

/** Copy the coordinator's build into each vault's plugin folder; `data.json` is never among the files. */
export function deployHandbook(plan) {
	const dist = join(plan.handbook.dir, "dist");
	const lines = [];
	for (const target of plan.handbook.vaults) {
		for (const file of ["main.js", "styles.css", "manifest.json"]) copyFileSync(join(dist, file), join(target.pluginDir, file));
		if (existsSync(join(dist, "assets"))) cpSync(join(dist, "assets"), join(target.pluginDir, "assets"), { recursive: true, force: true });
		lines.push(`${target.vault}: ${plan.handbook.pluginId} deployed from ${plan.handbook.repo} dist/`);
	}
	return lines;
}

function checkVaults(plan) {
	for (const target of plan.handbook.vaults) {
		if (!existsSync(target.configDir)) {
			throw new SupervisorError(`preview: ${target.vault} is not an Obsidian vault`, 1);
		}
		if (!existsSync(join(target.pluginDir, "manifest.json"))) {
			throw new SupervisorError(`preview: ${plan.handbook.pluginId} is not installed in ${target.vault}; install it once from Obsidian, then preview`, 1);
		}
	}
}

function runStep(dir, command, env, label) {
	process.stderr.write(`preview: ${command.join(" ")} in ${dir}\n`);
	const result = spawnCommand(command[0], command.slice(1), { cwd: dir, env, exclude: [GUARD_DIR], stdio: "inherit" });
	if (result.error || result.status !== 0) {
		throw new SupervisorError(`preview: ${label}: ${command.join(" ")} ${result.error ? `failed: ${result.error.message}` : `exited ${result.status}`}`, 1);
	}
}

function openExternal(url) {
	const [command, args] = process.platform === "win32" ? ["explorer.exe", [url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
	try {
		spawn(command, args, { detached: true, stdio: "ignore" }).unref();
	} catch {
		process.stderr.write(`preview: open ${url} yourself\n`);
	}
}

/** Build, install, deploy, then serve each consumer until interrupted. */
export async function runPreview(plan, { serve = true, open = true, port } = {}) {
	checkVaults(plan);
	const env = guardedEnv();
	for (const provider of plan.builds) runStep(provider.dir, provider.build, env, provider.repo);
	if (plan.handbook.vaults.length > 0) {
		if (!plan.handbook.build) throw new SupervisorError(`preview: ${plan.handbook.repo} has no build script`, 1);
		runStep(plan.handbook.dir, plan.handbook.build, { ...env, [PREVIEW_ALIASES_ENV]: JSON.stringify(plan.handbook.aliases) }, plan.handbook.repo);
	}
	const lines = [...installSources(plan), ...deployHandbook(plan)];
	for (const line of lines) console.log(`preview: ${line}`);
	for (const note of plan.notes) console.log(`preview: note: ${note}`);
	if (plan.handbook.vaults.length > 0) {
		console.log(`preview: reload Obsidian in each vault (Ctrl+P, "Reload app without saving") to load ${plan.handbook.pluginId} and its sources`);
		if (open) for (const target of plan.handbook.vaults) openExternal(`obsidian://open?path=${encodeURIComponent(target.vault)}`);
	}
	if (!serve || plan.consumers.length === 0) return 0;
	const children = plan.consumers.map((consumer, index) => {
		const settings = { ...consumer, open, port: port === undefined ? undefined : port + index };
		process.stderr.write(`preview: vite dev server of ${consumer.repo} on ${consumer.packages.join(", ") || "its published pins"}\n`);
		return spawn(process.execPath, [PREVIEW_SERVER], { cwd: consumer.dir, env: { ...env, SUPERVISOR_PREVIEW_SERVER: JSON.stringify(settings) }, stdio: "inherit" });
	});
	const stop = () => {
		for (const child of children) child.kill();
	};
	process.once("SIGINT", stop);
	process.once("SIGTERM", stop);
	const codes = await Promise.all(children.map((child) => new Promise((done) => child.once("exit", (code) => done(code ?? 0)))));
	return codes.every((code) => code === 0) ? 0 : 1;
}

/** Say whether the preview shows what the last presentation showed. */
export function comparePresentation(train, heads) {
	const shown = train.presentation?.repos ?? [];
	if (shown.length === 0) return ["the train was never presented; present it before approving"];
	return shown.filter((entry) => heads[entry.repo] && heads[entry.repo] !== entry.sha)
		.map((entry) => `${entry.repo} is at ${heads[entry.repo].slice(0, 10)}, the presentation showed ${entry.sha.slice(0, 10)}; present again before approving`);
}
