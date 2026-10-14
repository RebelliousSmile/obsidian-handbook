import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLocalSource } from "./devSchema/localSource.mjs";
import { createNodeAdapter } from "./devSchema/nodeAdapter.mjs";
import { syncSchemaSource } from "./devSchema/sync.mjs";
import { classifyChange, runOnce, watchSource } from "./devSchema/watch.mjs";

const REPOSITORY = "owner/repo";
const SOURCE_ID = "owner--repo";

const workspace = await mkdtemp(join(tmpdir(), "handbook-dev-schema-"));
const vault = join(workspace, "vault");
const provider = join(workspace, "provider");
const pluginDir = join(vault, ".obsidian", "plugins", "obsidian-handbook");
const installed = join(vault, ".obsidian", "handbook", "sources", SOURCE_ID);

function fail(message: string): never {
	throw new Error(`dev schema: ${message}`);
}

async function put(root: string, path: string, content: string | Uint8Array): Promise<void> {
	const target = join(root, path);
	await mkdir(join(target, ".."), { recursive: true });
	await writeFile(target, content);
}

async function remove(root: string, path: string): Promise<void> {
	await rm(join(root, path), { force: true });
}

async function snapshot(root: string): Promise<Map<string, Buffer>> {
	const found = new Map<string, Buffer>();
	async function walk(directory: string, prefix: string): Promise<void> {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
			if (entry.isDirectory()) await walk(join(directory, entry.name), path);
			else found.set(path, await readFile(join(directory, entry.name)));
		}
	}
	await walk(root, "");
	return found;
}

function sameSnapshot(left: Map<string, Buffer>, right: Map<string, Buffer>): boolean {
	if (left.size !== right.size) return false;
	for (const [path, bytes] of left) {
		const other = right.get(path);
		if (other === undefined || !bytes.equals(other)) return false;
	}
	return true;
}

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

function packManifest(id: string, assets: unknown): string {
	return JSON.stringify({
		manifestVersion: 1,
		version: "1.0.0",
		minimumHandbookVersion: "2.7.0",
		requires: [],
		pack: { id, label: id, style: {}, assets },
	});
}

function catalogue(ids: string[]): string {
	return JSON.stringify({
		manifestVersion: 1,
		repository: REPOSITORY,
		packs: ids.map((id) => ({ id, version: "1.0.0", path: `handbook/${id}/pack.json` })),
	});
}

async function expectRefusal(label: string, mentions: string): Promise<void> {
	const before = await snapshot(installed);
	const dataBefore = await readFile(join(pluginDir, "data.json"));
	let message: string | undefined;
	try {
		await syncSchemaSource({ sourceRoot: provider, vaultRoot: vault });
	} catch (error) {
		message = error instanceof Error ? error.message : String(error);
	}
	if (message === undefined) fail(`${label}: the synchronisation was not refused`);
	if (!message.includes(mentions)) fail(`${label}: the error does not name "${mentions}": ${message}`);
	if (!sameSnapshot(before, await snapshot(installed))) fail(`${label}: the previous folder changed`);
	if (!dataBefore.equals(await readFile(join(pluginDir, "data.json")))) fail(`${label}: data.json changed`);
	for (const leftover of ["packs", "source.json"]) {
		if (!(await exists(join(installed, leftover)))) fail(`${label}: ${leftover} is missing after the refusal`);
	}
	if (await exists(`${installed}.staging`)) fail(`${label}: a staging folder was left behind`);
}

try {
	await mkdir(pluginDir, { recursive: true });
	await writeFile(join(pluginDir, "manifest.json"), JSON.stringify({ id: "obsidian-handbook", version: "2.7.0" }));
	const dataJson = JSON.stringify({ features: { storyThemeParser: true }, sentinel: "keep" });
	await writeFile(join(pluginDir, "data.json"), dataJson);

	await mkdir(provider, { recursive: true });
	await put(provider, "handbook.json", catalogue(["test"]));
	await put(provider, "handbook/test/pack.json", packManifest("test", { images: { paper: "paper.png" }, stylesheets: ["styles/base.css", "styles/extra.css"] }));
	await put(provider, "handbook/test/assets/paper.png", new Uint8Array([1, 2, 3, 4]));
	await put(provider, "handbook/test/assets/styles/base.css", "body.brumes--test { color: red; }\n");
	await put(provider, "handbook/test/assets/styles/extra.css", "body.brumes--test { color: blue; }\n");
	const git = (...args: string[]): string => execFileSync("git", ["-C", provider, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], { encoding: "utf8" }).trim();
	git("init", "-q");
	git("add", "-A");
	git("commit", "-q", "-m", "init");
	const head = git("rev-parse", "HEAD");

	// 1. installation
	const result = await syncSchemaSource({ sourceRoot: provider, vaultRoot: vault });
	if (result.sourceId !== SOURCE_ID || result.revision !== head) fail("installation did not report the source id and the HEAD revision");
	if (result.packs.length !== 1 || result.packs[0].id !== "test" || result.packs[0].version !== "1.0.0") fail("installation did not report its packs");
	for (const path of ["packs/test/pack.json", "packs/test/assets/paper.png", "packs/test/assets/styles/base.css", "packs/test/assets/styles/extra.css", "source.json"]) {
		if (!(await exists(join(installed, path)))) fail(`installation did not write ${path}`);
	}
	const record = JSON.parse(await readFile(join(installed, "source.json"), "utf8")) as { repository?: string; revision?: string; reference?: { kind?: string; value?: string } };
	if (record.repository !== REPOSITORY || record.revision !== head) fail("source.json does not carry the repository and the local revision");
	if (record.reference?.kind !== "branch" || record.reference.value !== "local") fail("source.json does not carry the local reference");
	if ((await readFile(join(pluginDir, "data.json"), "utf8")) !== dataJson) fail("installation changed data.json");
	if (!(await readFile(join(installed, "packs/test/assets/paper.png"))).equals(Buffer.from([1, 2, 3, 4]))) fail("installed asset bytes differ");

	// 2. an asset removed from the provider leaves the vault
	await remove(provider, "handbook/test/assets/styles/extra.css");
	await put(provider, "handbook/test/pack.json", packManifest("test", { images: { paper: "paper.png" }, stylesheets: ["styles/base.css"] }));
	await syncSchemaSource({ sourceRoot: provider, vaultRoot: vault });
	if (await exists(join(installed, "packs/test/assets/styles/extra.css"))) fail("a removed asset stayed in the vault");
	if (!(await exists(join(installed, "packs/test/assets/styles/base.css")))) fail("a kept asset left the vault");
	if (await exists(`${installed}.previous`)) fail("a backup folder was left behind");

	const valid = await readFile(join(provider, "handbook/test/pack.json"), "utf8");

	// 3. invalid manifest
	await put(provider, "handbook/test/pack.json", "{ not json");
	await expectRefusal("invalid manifest", "pack.json");
	await put(provider, "handbook/test/pack.json", valid);

	// 4. declared asset missing from the checkout
	await put(provider, "handbook/test/pack.json", packManifest("test", { images: { paper: "paper.png", banner: "banner.png" }, stylesheets: ["styles/base.css"] }));
	await expectRefusal("missing asset", "banner.png");
	await put(provider, "handbook/test/pack.json", valid);

	// 5. path leaving the pack
	await put(provider, "handbook/test/pack.json", packManifest("test", { stylesheets: ["../outside.css"] }));
	await expectRefusal("path outside the pack", "handbook/test/pack.json");
	await put(provider, "handbook/test/pack.json", valid);

	// the repaired provider installs again
	await syncSchemaSource({ sourceRoot: provider, vaultRoot: vault });

	// 6. vault without Handbook: refused before any write
	const bare = join(workspace, "bare-vault");
	await mkdir(bare, { recursive: true });
	let bareMessage: string | undefined;
	try {
		await syncSchemaSource({ sourceRoot: provider, vaultRoot: bare });
	} catch (error) {
		bareMessage = error instanceof Error ? error.message : String(error);
	}
	if (bareMessage === undefined || !bareMessage.includes("not installed")) fail("a vault without Handbook was not refused");
	if ((await readdir(bare)).length !== 0) fail("a vault without Handbook received files");

	// 7. confinement of the adapter and of the local source
	const adapter = createNodeAdapter(vault);
	let escaped = false;
	await adapter.write("../escaped.txt", "x").catch(() => { escaped = true; });
	if (!escaped || (await exists(join(workspace, "escaped.txt")))) fail("the adapter wrote outside the vault");
	const local = await readLocalSource(provider);
	let read = false;
	await local.readText("../vault/.obsidian/plugins/obsidian-handbook/data.json").then(() => { read = true; }, () => undefined);
	if (read) fail("the local source read outside the checkout");
	const folder = join(workspace, "no-git");
	await mkdir(folder, { recursive: true });
	let noGit: string | undefined;
	await readLocalSource(folder).catch((error: unknown) => { noGit = error instanceof Error ? error.message : String(error); });
	if (noGit === undefined || !noGit.includes("git")) fail("a folder without git was not refused clearly");

	// 8. watcher: what triggers, what is reported, what keeps running
	const expectations: Array<[string, string]> = [
		["handbook.json", "install"],
		["handbook/test/pack.json", "install"],
		["handbook/test/assets/styles/base.css", "install"],
		["handbook/test/custom-root/paper.png", "install"],
		["handbook/test/preview/index.html", "preview"],
		["handbook/test/styles/base.css", "preview"],
		["README.md", "ignore"],
		[".git/index", "ignore"],
		["node_modules/x/handbook.json", "ignore"],
	];
	for (const [path, kind] of expectations) {
		if (classifyChange(path) !== kind) fail(`${path} was classified ${classifyChange(path)}, not ${kind}`);
	}
	const lines: string[] = [];
	const errors: string[] = [];
	const sink = { log: (line: string) => { lines.push(line); }, error: (line: string) => { errors.push(line); } };
	const mainJs = join(pluginDir, "main.js");
	await writeFile(mainJs, "");
	if (!(await runOnce({ sourceRoot: provider, vaultRoot: vault, ...sink }))) fail("a valid provider was not reported as installed");
	if (!(await exists(join(pluginDir, ".hotreload")))) fail("the hot reload marker was not requested");
	if (!lines.some((line) => line.includes(head.slice(0, 7)) && line.includes("test@1.0.0"))) fail("the success line does not carry the revision and the packs");
	await put(provider, "handbook/test/pack.json", "{ truncated");
	if (await runOnce({ sourceRoot: provider, vaultRoot: vault, ...sink })) fail("an invalid provider was reported as installed");
	if (!errors.some((line) => line.includes("handbook/test/pack.json"))) fail("the error line does not name the file");
	await put(provider, "handbook/test/pack.json", valid);

	const reported: string[] = [];
	const stopWatching = await watchSource({
		sourceRoot: provider,
		vaultRoot: vault,
		debounceMs: 50,
		log: (line) => { reported.push(line); },
		error: (line) => { reported.push(`ERROR ${line}`); },
	});
	try {
		const initial = reported.filter((line) => line.includes("installed")).length;
		await put(provider, "handbook/test/pack.json", valid.replace('"label":"test"', '"label":"changed"'));
		for (let waited = 0; waited < 5000 && reported.filter((line) => line.includes("installed")).length === initial; waited += 100) {
			await new Promise((done) => setTimeout(done, 100));
		}
		if (reported.filter((line) => line.includes("installed")).length === initial) fail("a change in the provider did not trigger a synchronisation");
		const installedManifest = await readFile(join(installed, "packs/test/pack.json"), "utf8");
		if (!installedManifest.includes('"label":"changed"')) fail("the watcher did not install the change");
	} finally {
		stopWatching();
	}

	console.log("dev schema: green");
} finally {
	await rm(workspace, { recursive: true, force: true });
}
