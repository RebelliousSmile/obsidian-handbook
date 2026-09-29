/**
 * A throwaway copy of the five repositories, for the supervisor harness.
 *
 * Each repository is a clone of a bare remote under the same temporary
 * directory, so `origin/main` can move without a network. GitHub is the fake
 * of `fake-gh.mjs`, its state a JSON file next to the repositories. Git runs
 * with an isolated configuration: nothing of the user's global config (hooks,
 * signing, templates) reaches the test repositories.
 */
import { spawnSync } from "child_process";
import { createHash } from "crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";

export const HANDBOOK = process.cwd();
export const SUPERVISE = resolve(HANDBOOK, "tools/supervise.mjs");
export const FAKE_GH = resolve(HANDBOOK, "tools/fixtures/supervisor/fake-gh.mjs");
export const TOPOLOGY = JSON.parse(readFileSync(resolve(HANDBOOK, "supervisor/topology.json"), "utf8"));
export const PROVIDERS = TOPOLOGY.repos.filter((repo: any) => repo.role === "provider");

export type Result = { status: number; stdout: string; stderr: string };

export function sh(cwd: string, command: string, args: string[], env: NodeJS.ProcessEnv = process.env, input?: string): Result {
	const result = spawnSync(command, args, { cwd, env, encoding: "utf8", input });
	if (result.error) throw result.error;
	return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export function git(cwd: string, ...args: string[]): string {
	const result = sh(cwd, "git", args);
	if (result.status !== 0) throw new Error(`git ${args.join(" ")} in ${cwd}: ${result.stderr}`);
	return result.stdout.trim();
}

export function releaseUrl(provider: string, tag: string): string {
	const version = tag.replace(/^v/, "").replace(/-rc\.\d+$/, "");
	return `https://github.com/RebelliousSmile/${provider}/releases/download/${tag}/${provider}-${version}.tgz`;
}

export type Archive = { provider: string; tag: string; url: string; file: string; sha256: string; integrity: string };

export class World {
	tmp: string;
	root: string;
	statePath: string;
	bin: string;
	gitLog: string;
	archives = new Map<string, Archive>();

	constructor() {
		this.tmp = mkdtempSync(join(tmpdir(), "handbook-supervisor-"));
		this.root = join(this.tmp, "root");
		this.statePath = join(this.tmp, "gh-state.json");
		this.bin = join(this.tmp, "bin");
		this.gitLog = join(this.tmp, "git-calls.log");
		mkdirSync(this.root);
		mkdirSync(join(this.tmp, "remotes"));
		mkdirSync(join(this.tmp, "archives"));
		mkdirSync(this.bin);
		const config = join(this.tmp, "gitconfig");
		writeFileSync(config, "[user]\n\tname = Harness\n\temail = harness@example.invalid\n[init]\n\tdefaultBranch = main\n[commit]\n\tgpgsign = false\n[tag]\n\tgpgsign = false\n[advice]\n\tdetachedHead = false\n");
		process.env.GIT_CONFIG_GLOBAL = config;
		process.env.GIT_CONFIG_NOSYSTEM = "1";
		// A git that logs every call before delegating: proves which commands ran.
		const realGit = sh(this.tmp, "sh", ["-c", "command -v git"]).stdout.trim();
		writeFileSync(join(this.bin, "git"), `#!/bin/sh\necho "$*" >> "${this.gitLog}"\nexec "${realGit}" "$@"\n`);
		chmodSync(join(this.bin, "git"), 0o755);
		this.writeState({ calls: [], releases: {}, issues: {}, prs: {}, events: {}, secrets: {}, runs: {}, workflowEffects: {} });
	}

	dir(id: string): string {
		return join(this.root, id);
	}

	/** A deterministic archive whose bytes name the provider and tag. */
	archive(provider: string, tag: string, bytes = `archive ${provider} ${tag}\n`): Archive {
		const key = `${provider}@${tag}`;
		if (!this.archives.has(key)) {
			const version = tag.replace(/^v/, "").replace(/-rc\.\d+$/, "");
			const file = join(this.tmp, "archives", tag, `${provider}-${version}.tgz`);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, bytes);
			this.archives.set(key, {
				provider,
				tag,
				url: releaseUrl(provider, tag),
				file,
				sha256: createHash("sha256").update(bytes).digest("hex"),
				integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
			});
		}
		return this.archives.get(key)!;
	}

	release(provider: string, tag: string, publishedAt: string, bytes?: string): any {
		const archive = this.archive(provider, tag, bytes);
		return {
			tagName: tag,
			isPrerelease: tag.includes("-rc."),
			isDraft: false,
			publishedAt,
			assets: [{ name: archive.file.split("/").pop(), url: archive.url, file: archive.file }],
		};
	}

	readState(): any {
		return JSON.parse(readFileSync(this.statePath, "utf8"));
	}

	writeState(state: any): void {
		writeFileSync(this.statePath, JSON.stringify(state, null, "\t"));
	}

	updateState(change: (state: any) => void): void {
		const state = this.readState();
		change(state);
		this.writeState(state);
	}

	env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
		return {
			...process.env,
			SUPERVISOR_GH: FAKE_GH,
			FAKE_GH_STATE: this.statePath,
			PATH: `${this.bin}:${process.env.PATH}`,
			...extra,
		};
	}

	supervise(args: string[], options: { env?: NodeJS.ProcessEnv; input?: string; topology?: string } = {}): Result {
		const topology = options.topology ? ["--topology", options.topology] : [];
		const [command, ...rest] = args;
		return sh(HANDBOOK, process.execPath, [SUPERVISE, command, "--root", this.root, ...topology, ...rest], this.env(options.env), options.input);
	}

	/** Create a repository with its bare remote, commit `files`, push `main`. */
	createRepo(id: string, files: Record<string, string>): void {
		const remote = join(this.tmp, "remotes", `${id}.git`);
		git(this.tmp, "init", "--quiet", "--bare", "-b", "main", remote);
		git(this.root, "clone", "--quiet", remote, id);
		this.commit(id, files, `init ${id}`);
		git(this.dir(id), "push", "--quiet", "-u", "origin", "main");
	}

	write(id: string, files: Record<string, string>): void {
		for (const [path, content] of Object.entries(files)) {
			const file = join(this.dir(id), path);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, content);
		}
	}

	commit(id: string, files: Record<string, string>, message: string): string {
		this.write(id, files);
		git(this.dir(id), "add", "-A");
		git(this.dir(id), "commit", "--quiet", "--allow-empty", "-m", message);
		return git(this.dir(id), "rev-parse", "HEAD");
	}

	/** Commit on `main` and push: what a merged pull request leaves on origin/main. */
	land(id: string, files: Record<string, string>, message: string): string {
		const sha = this.commit(id, files, message);
		git(this.dir(id), "push", "--quiet", "origin", "HEAD:main");
		return sha;
	}

	snapshot(): Record<string, string> {
		const result: Record<string, string> = {};
		for (const repo of TOPOLOGY.repos) {
			const dir = this.dir(repo.path);
			result[repo.id] = `${git(dir, "rev-parse", "HEAD")}\n${git(dir, "status", "--porcelain")}`;
		}
		return result;
	}

	dispose(): void {
		rmSync(this.tmp, { recursive: true, force: true });
	}
}

export function consumerFiles(pins: Record<string, Archive>, withNpmLock: boolean): Record<string, string> {
	const names = Object.keys(pins).sort();
	const dependencies: Record<string, string> = {};
	for (const name of names) dependencies[name] = pins[name].url;
	const pnpm = [
		"lockfileVersion: '9.0'",
		"",
		"importers:",
		"",
		"  .:",
		"    dependencies:",
		...names.flatMap((name) => [`      ${name}:`, `        specifier: ${pins[name].url}`, `        version: ${pins[name].url}`]),
		"",
		"packages:",
		"",
		...names.flatMap((name) => [`  ${name}@${pins[name].url}:`, `    resolution: {integrity: ${pins[name].integrity}, tarball: ${pins[name].url}}`, `    version: 1.0.0`, ""]),
		"snapshots:",
		"",
		...names.flatMap((name) => [`  ${name}@${pins[name].url}: {}`, ""]),
	].join("\n");
	const files: Record<string, string> = {
		"package.json": `${JSON.stringify({ name: "consumer", version: "1.0.0", dependencies }, null, "\t")}\n`,
		"pnpm-lock.yaml": pnpm,
	};
	if (withNpmLock) {
		const packages: Record<string, any> = { "": { name: "consumer", dependencies } };
		for (const name of names) packages[`node_modules/${name}`] = { version: "1.0.0", resolved: pins[name].url, integrity: pins[name].integrity };
		files["package-lock.json"] = `${JSON.stringify({ name: "consumer", lockfileVersion: 3, packages }, null, "\t")}\n`;
	}
	return files;
}

/** The five repositories, every consumer on the latest final of every provider. */
export function createWorld(): World {
	const world = new World();
	const finals: Record<string, Archive> = {};
	world.updateState((state) => {
		for (const provider of PROVIDERS) {
			state.releases[provider.repository] = [
				world.release(provider.package, "v1.0.1-rc.1", "2026-09-20T10:00:00Z"),
				world.release(provider.package, "v1.0.0", "2026-09-10T10:00:00Z"),
				world.release(provider.package, "v1.0.0-rc.1", "2026-09-09T10:00:00Z"),
			];
			finals[provider.package] = world.archive(provider.package, "v1.0.0");
		}
	});
	world.createRepo("obsidian-handbook", {
		...consumerFiles(finals, false),
		"manifest.json": "{\"version\": \"1.0.0\"}\n",
		"CHANGELOG.md": "# Changelog\n",
		"src/main.ts": "export {};\n",
		"supervisor/trains/.gitkeep": "",
	});
	world.createRepo("lantern", {
		...consumerFiles(finals, true),
		"release-train.matrix.json": "{}\n",
		"CHANGELOG.md": "# Changelog\n",
		"src/index.ts": "export {};\n",
	});
	for (const provider of PROVIDERS) {
		const trainDir = provider.trainFiles[0];
		world.createRepo(provider.path, {
			"package.json": `${JSON.stringify({ name: provider.package, version: "1.0.0" }, null, "\t")}\n`,
			[`${trainDir}.gitkeep`]: "",
			"src/index.ts": "export {};\n",
		});
	}
	return world;
}
