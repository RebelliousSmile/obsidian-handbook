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
import { basename, delimiter, dirname, join, resolve } from "path";
import { findExecutable, pathKey } from "../../supervisor/spawn.mjs";

export const HANDBOOK = process.cwd();
export const SUPERVISE = resolve(HANDBOOK, "tools/supervise.mjs");
export const FAKE_GH = resolve(HANDBOOK, "tools/fixtures/supervisor/fake-gh.mjs");
export const FAKE_GIT = resolve(HANDBOOK, "tools/fixtures/supervisor/fake-git.mjs");
export const FAKE_NPM = resolve(HANDBOOK, "tools/fixtures/supervisor/fake-npm.mjs");
export const FAKE_TTY = resolve(HANDBOOK, "tools/fixtures/supervisor/fake-tty.cjs");
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
	realGit = "";
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
		const realGit = findExecutable("git", { exclude: [this.bin] });
		if (!realGit) throw new Error("the supervisor harness needs git on the PATH");
		this.realGit = realGit;
		this.shim("git", FAKE_GIT);
		// The local release-train scripts of a provider, and the install of a
		// consumer adopting an archive, run through this npm and this pnpm.
		this.shim("npm", FAKE_NPM);
		this.shim("pnpm", FAKE_NPM);
		this.writeState({ calls: [], releases: {}, issues: {}, prs: {}, events: {}, secrets: {}, runs: {}, workflowEffects: {}, tagEffects: {} });
	}

	/** `bin/<name>` runs `node <script>`: a sh shim for POSIX shells, a `.cmd` one for Windows. */
	shim(name: string, script: string): void {
		writeFileSync(join(this.bin, name), `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`);
		chmodSync(join(this.bin, name), 0o755);
		writeFileSync(join(this.bin, `${name}.cmd`), `@"${process.execPath}" "${script}" %*\r\n@exit /b %ERRORLEVEL%\r\n`);
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
			assets: [{ name: basename(archive.file), url: archive.url, file: archive.file }],
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

	/** The PATH is set on the key the platform uses (`Path` on Windows), never on a second one. */
	env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
		const key = pathKey(process.env);
		const env: NodeJS.ProcessEnv = {};
		for (const [name, value] of Object.entries(process.env)) {
			if (name.toUpperCase() !== "PATH" || name === key) env[name] = value;
		}
		return {
			...env,
			SUPERVISOR_GH: FAKE_GH,
			SUPERVISOR_GIT: FAKE_GIT,
			FAKE_GH_STATE: this.statePath,
			FAKE_GIT_LOG: this.gitLog,
			FAKE_GIT_REAL: this.realGit,
			[key]: [this.bin, process.env[key]].filter(Boolean).join(delimiter),
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

	/** Commit only `files` on `main` and push: what a person lands, whatever else lies in the checkout. */
	landFiles(id: string, files: Record<string, string>, message: string): string {
		this.write(id, files);
		git(this.dir(id), "add", "--", ...Object.keys(files));
		git(this.dir(id), "commit", "--quiet", "-m", message);
		git(this.dir(id), "push", "--quiet", "origin", "HEAD:main");
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

function workflow(name: string, triggers: string[], inputs: Record<string, boolean>, secret?: string): string {
	return [
		`name: ${name}`,
		"on:",
		...triggers,
		"  workflow_dispatch:",
		"    inputs:",
		...Object.keys(inputs).flatMap((input) => [`      ${input}:`, `        description: ${input}`, `        required: ${inputs[input]}`, "        type: string"]),
		"jobs:",
		"  run:",
		"    runs-on: ubuntu-latest",
		"    steps:",
		"      - run: echo ok",
		...(secret ? ["        env:", "          GH_TOKEN: ${{ secrets." + secret + " }}"] : []),
		"",
	].join("\n");
}

/** The dispatch triggers of each provider's workflows, as their repositories declare them. */
export const WORKFLOWS: Record<string, Record<string, string>> = {
	pbta: {
		".github/workflows/release.yml": workflow("Release", [], { mode: true, provider_commit: true, config: false }, "RELEASE_TOKEN"),
		".github/workflows/release-train.yml": workflow("Release train", [], { provider_commit: true, config: true }),
		".github/workflows/publish-candidate.yml": workflow("Publish candidate", [], { tag: true, commit: true }),
	},
	adrenaline: {
		".github/workflows/publish-candidate.yml": workflow("Publish candidate", [], { tag: true }),
		".github/workflows/release-train.yml": workflow("Release train", [], { manifest: true }),
		".github/workflows/release.yml": workflow("Release", ["  push:", "    tags:", "      - 'v*.*.*'"], { tag: true }),
		".github/workflows/final-convergence.yml": workflow("Final convergence", [], { record: true }),
	},
	mist: {
		".github/workflows/release-candidate.yml": workflow("Release candidate", [], { tag: true }),
	},
};

/**
 * Lantern's provider registry, laid out as Lantern lays it out: the Handbook it
 * reads its release inputs at, and each provider with one earlier manifest.
 */
function matrixFile(): string {
	const handbook = TOPOLOGY.repos.find((repo: any) => repo.id === "obsidian-handbook");
	const providers = PROVIDERS.map((provider: any) => ({
		provider: provider.id,
		repository: provider.repository,
		ref: "0".repeat(40),
		manifests: [{ path: `${provider.trainFiles[0]}earlier.json`, validatorRef: "0".repeat(40) }],
	}));
	return `${JSON.stringify({ protocol: 1, handbook: { repository: handbook.repository, ref: "0".repeat(40) }, providers }, null, 4)}\n`;
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
		"release-train.matrix.json": matrixFile(),
		"CHANGELOG.md": "# Changelog\n",
		"src/index.ts": "export {};\n",
	});
	for (const provider of PROVIDERS) {
		const trainDir = provider.trainFiles[0];
		world.createRepo(provider.path, {
			"package.json": `${JSON.stringify({ name: provider.package, version: "1.0.0" }, null, "\t")}\n`,
			[`${trainDir}.gitkeep`]: "",
			"src/index.ts": "export {};\n",
			...WORKFLOWS[provider.adapter],
		});
	}
	return world;
}
