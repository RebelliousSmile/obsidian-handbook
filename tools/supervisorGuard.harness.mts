/**
 * The supervisor's publication guard, proved on the platform it runs on.
 *
 * Rules first, as a table: every call the guard refuses and every call it
 * lets through. Then both interception paths end to end, each against a fake
 * `gh` that logs what reaches it: the PATH shims through a shell, and the
 * child_process hook for a Node process that spawns without one. Each path is
 * also run with the guard removed, to show the fake really is reachable, so a
 * refusal is the guard's doing and not an accident of the environment.
 */
import assert from "assert/strict";
import { spawnSync } from "child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { delimiter, join, resolve } from "path";
import { guardRefusal } from "./supervisor/guard/rules.cjs";
import { pathKey, withRequire } from "./supervisor/spawn.mjs";

const GUARD = resolve("tools/supervisor/guard");
const HOOK = join(GUARD, "hook.cjs");
const RUN = join(GUARD, "run.mjs");

const refused: string[][] = [
	["gh", "release", "create", "v1"],
	["gh", "release", "upload", "v1", "main.js"],
	["gh", "release", "edit", "v1", "--draft=false"],
	["gh", "release", "delete", "v1"],
	["gh", "workflow", "run", "release.yml"],
	["gh", "run", "rerun", "123"],
	["gh", "pr", "merge", "5"],
	["gh", "api", "-X", "POST", "repos/o/r/releases"],
	["gh", "api", "--method", "PATCH", "repos/o/r"],
	["gh", "api", "--method=DELETE", "repos/o/r"],
	["gh", "api", "-XPUT", "repos/o/r"],
	["gh", "api", "repos/o/r", "-f", "a=b"],
	["gh", "api", "repos/o/r", "-F", "a=b"],
	["gh", "api", "repos/o/r", "-fa=b"],
	["gh", "api", "repos/o/r", "--field", "a=b"],
	["gh", "api", "repos/o/r", "--field=a=b"],
	["gh", "api", "repos/o/r", "--raw-field", "a=b"],
	["gh", "api", "repos/o/r", "--input", "body.json"],
	["gh", "api", "repos/o/r", "--input=body.json"],
	["git", "push"],
	["git", "push", "origin", "main"],
	["git", "-C", "repo", "push"],
	["git", "-c", "k=v", "push"],
	["git", "--git-dir", ".git", "push"],
	["git", "tag", "v9"],
	["git", "tag", "-a", "v9", "-m", "release"],
	["git", "tag", "-d", "v9"],
	["git", "tag", "-f", "v9"],
];

const allowed: string[][] = [
	["gh", "issue", "list"],
	["gh", "release", "list"],
	["gh", "release", "view", "v1"],
	["gh", "workflow", "list"],
	["gh", "run", "view", "1"],
	["gh", "pr", "view", "5"],
	["gh", "api", "repos/o/r"],
	["gh", "api", "-X", "GET", "repos/o/r"],
	["gh", "api", "--method", "GET", "repos/o/r"],
	["gh", "api", "--method=GET", "repos/o/r"],
	["gh", "api", "-XGET", "repos/o/r"],
	["git", "status"],
	["git", "log", "--oneline"],
	["git", "-C", "repo", "status"],
	["git", "-c", "push.default=simple", "status"],
	["git", "commit", "-m", "push"],
	["git", "fetch", "origin"],
	["git", "tag"],
	["git", "tag", "-l"],
	["git", "tag", "--list", "v*"],
	["git", "tag", "-n"],
	["git", "tag", "--sort=-v:refname"],
	["git", "tag", "--contains=HEAD"],
	["git", "tag", "-a", "v9", "-l"],
	["npm", "publish"],
];

function rules(): void {
	for (const [tool, ...args] of refused) {
		assert.equal(
			guardRefusal(tool, args),
			`supervisor guard: "${[tool, ...args].join(" ")}" publishes and is refused inside a validation (supervise present)`,
			`guardRefusal must refuse: ${[tool, ...args].join(" ")}`,
		);
	}
	for (const [tool, ...args] of allowed) {
		assert.equal(guardRefusal(tool, args), null, `guardRefusal must let through: ${[tool, ...args].join(" ")}`);
	}
}

type World = { dir: string; bin: string; log: string; env: (guarded: boolean) => NodeJS.ProcessEnv };

function world(): World {
	const dir = mkdtempSync(join(tmpdir(), "supervisor-guard-"));
	const bin = join(dir, "bin");
	mkdirSync(bin);
	const log = join(dir, "gh.log");
	writeFileSync(
		join(bin, "fake-gh.mjs"),
		"import { appendFileSync } from 'fs';\nappendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');\n",
	);
	writeFileSync(join(bin, "gh"), `#!/bin/sh\nexec node "$(dirname -- "$0")/fake-gh.mjs" "$@"\n`);
	chmodSync(join(bin, "gh"), 0o755);
	writeFileSync(join(bin, "gh.cmd"), '@echo off\r\nnode "%~dp0fake-gh.mjs" %*\r\nexit /b %ERRORLEVEL%\r\n');
	const key = pathKey(process.env);
	const base = { ...process.env, FAKE_GH_LOG: log };
	return {
		dir,
		bin,
		log,
		env: (guarded) => ({ ...base, [key]: [...(guarded ? [GUARD] : []), bin, process.env[key] ?? ""].join(delimiter) }),
	};
}

function reached(w: World): string[][] {
	if (!existsSync(w.log)) return [];
	return readFileSync(w.log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function run(command: string, args: string[], options: object) {
	const result = spawnSync(command, args, { encoding: "utf8", ...options });
	return { status: result.status, stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? ""), error: result.error };
}

function shims(): void {
	const w = world();
	try {
		const refusal = run("gh release create v1", [], { shell: true, env: w.env(true) });
		assert.equal(refusal.status, 97, `a shell call to gh release create exits 97\n${refusal.stderr}`);
		assert.match(refusal.stderr, /supervisor guard: "gh release create v1" publishes/);
		const push = run("git push origin main", [], { shell: true, env: w.env(true), cwd: w.dir });
		assert.equal(push.status, 97, `a shell call to git push exits 97\n${push.stderr}`);
		assert.deepEqual(reached(w), [], "a refused call reached the fake gh");

		const read = run("gh issue list", [], { shell: true, env: w.env(true) });
		assert.equal(read.status, 0, `gh issue list passes the shim\n${read.stderr}`);
		assert.deepEqual(reached(w), [["issue", "list"]], "gh issue list reaches the real gh with its arguments");

		// Without the guard on the PATH, the same shell call reaches the fake.
		rmSync(w.log, { force: true });
		run("gh release create v1", [], { shell: true, env: w.env(false) });
		assert.deepEqual(reached(w), [["release", "create", "v1"]], "without the shims the fake gh must be reachable");

		// Fails closed: no real gh outside the guard, no call.
		const empty = join(w.dir, "empty");
		mkdirSync(empty);
		const missing = run(process.execPath, [RUN, "gh", "issue", "list"], {
			env: { ...process.env, [pathKey(process.env)]: [GUARD, empty].join(delimiter) },
		});
		assert.equal(missing.status, 127, `no real gh exits 127\n${missing.stderr}`);
		assert.match(missing.stderr, /no gh outside/);
	} finally {
		rmSync(w.dir, { recursive: true, force: true });
	}
}

// A Node process that spawns gh without the shims on its PATH.
const PROBE = `
const cp = require("child_process");
const out = {};
out.spawnSync = cp.spawnSync("gh", ["workflow", "run", "x"], { encoding: "utf8" }).status;
out.shell = cp.spawnSync("gh pr merge 1", { shell: true, encoding: "utf8" }).status;
try { cp.execSync("gh release create v1", { stdio: "pipe" }); out.execSync = 0; } catch (error) { out.execSync = error.status; }
try { cp.execFileSync("gh", ["run", "rerun", "1"], { stdio: "pipe" }); out.execFileSync = 0; } catch (error) { out.execFileSync = error.status ?? error.code; }
out.git = cp.spawnSync("git", ["--version"], { encoding: "utf8" }).status;
// An absolute path quoted inside an explicit shell line: cmd /s strips the outer quotes.
const fake = require("path").join(require("path").dirname(process.env.FAKE_GH_LOG), "bin", "gh");
out.quoted = process.platform === "win32"
	? cp.spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", '""' + fake + '.cmd" workflow run x"'], { windowsVerbatimArguments: true, encoding: "utf8" }).status
	: cp.spawnSync("sh", ["-c", '"' + fake + '" workflow run x'], { encoding: "utf8" }).status;
let done = false;
const finish = (code) => {
	if (done) return;
	done = true;
	out.spawn = code;
	cp.exec("gh api -X POST repos/o/r", (error) => {
		out.exec = error ? error.code : 0;
		process.stdout.write(JSON.stringify(out));
	});
};
cp.spawn("gh", ["release", "delete", "v1"], { stdio: "ignore" }).on("close", finish).on("error", () => finish("error"));
`;

const ESM_PROBE = `
import { spawnSync } from "child_process";
process.stdout.write(String(spawnSync("gh", ["workflow", "run", "x"], { encoding: "utf8" }).status));
`;

function hook(): void {
	const w = world();
	try {
		// Probes run from files: a `-e` line holding both exec( and spawn( is
		// refused with EPERM by endpoint protection on this Windows machine.
		const probe = join(w.dir, "probe.cjs");
		writeFileSync(probe, PROBE);
		const esmProbe = join(w.dir, "probe.mjs");
		writeFileSync(esmProbe, ESM_PROBE);
		const heapProbe = join(w.dir, "heap.cjs");
		writeFileSync(heapProbe, `${PROBE}\nprocess.stderr.write(String(require("v8").getHeapStatistics().heap_size_limit > 4000 * 1024 * 1024));\n`);

		const guarded = run(process.execPath, ["--require", HOOK, probe], { env: w.env(false) });
		assert.equal(guarded.status, 0, `hook probe failed\n${guarded.stderr}\n${guarded.error ?? ""}`);
		assert.deepEqual(
			JSON.parse(guarded.stdout),
			{ spawnSync: 97, shell: 97, execSync: 97, execFileSync: 97, git: 0, quoted: 97, spawn: 97, exec: 97 },
			`every publishing launcher is refused and git --version passes\n${guarded.stderr}`,
		);
		assert.deepEqual(reached(w), [], "a call refused by the hook reached the fake gh");

		const esm = run(process.execPath, ["--require", HOOK, esmProbe], { env: w.env(false) });
		assert.equal(esm.stdout, "97", `an ESM named import of spawnSync is guarded too\n${esm.stderr}`);

		// NODE_OPTIONS is how runGuarded hands the hook to every Node child,
		// next to whatever options were already there.
		const viaOptions = run(process.execPath, [heapProbe], {
			env: { ...w.env(false), NODE_OPTIONS: withRequire("--max-old-space-size=4096", HOOK) },
		});
		assert.equal(viaOptions.stdout ? JSON.parse(viaOptions.stdout).spawnSync : null, 97, `NODE_OPTIONS loads the hook\n${viaOptions.stderr}`);
		assert.match(viaOptions.stderr, /true$/, "an existing NODE_OPTIONS survives the hook");

		// Without the hook, the shell call reaches the fake: the hook is what refused it.
		const bare = run(process.execPath, [probe], { env: w.env(false) });
		assert.notEqual(JSON.parse(bare.stdout).shell, 97, "without the hook the shell call must not be refused");
		assert.ok(
			reached(w).some((args) => args.join(" ") === "pr merge 1"),
			"without the hook the fake gh must receive the shell call",
		);
	} finally {
		rmSync(w.dir, { recursive: true, force: true });
	}
}

function main(): void {
	let failed = 0;
	for (const [name, check] of [
		["guard rules refuse what publishes and nothing else", rules],
		["PATH shims refuse through a shell and fail closed", shims],
		["child_process hook refuses without a shell", hook],
	] as const) {
		try {
			check();
			console.log(`ok   ${name}`);
		} catch (error) {
			failed += 1;
			console.error(`FAIL ${name}\n${(error as Error).stack ?? error}`);
		}
	}
	if (failed > 0) {
		console.error(`\n${failed} guard check(s) failed.`);
		process.exit(1);
	}
	console.log("\nSupervisor guard passed.");
}

main();
