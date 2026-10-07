var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// tools/supervisor/guard/rules.cjs
var require_rules = __commonJS({
  "tools/supervisor/guard/rules.cjs"(exports2, module2) {
    "use strict";
    function refusal(tool, args) {
      return `supervisor guard: "${[tool, ...args].join(" ")}" publishes and is refused inside a validation (supervise present)`;
    }
    function ghRefused(args) {
      const head = `${args[0] ?? ""} ${args[1] ?? ""}`;
      const prefixes = [
        "release create",
        "release upload",
        "release edit",
        "release delete",
        "workflow run",
        "run rerun",
        "pr merge"
      ];
      if (prefixes.some((prefix) => head.startsWith(prefix))) return true;
      if (args[0] !== "api") return false;
      let previous = "";
      for (const argument of args) {
        if ((previous === "-X" || previous === "--method") && argument !== "GET") return true;
        if (["-f", "-F", "--field", "--raw-field", "--input"].includes(argument)) return true;
        if (/^-[fF]./.test(argument) || /^--(field|raw-field|input)=/.test(argument)) return true;
        if (argument !== "--method=GET" && argument !== "-XGET") {
          if (argument.startsWith("--method=") || /^-X./.test(argument)) return true;
        }
        previous = argument;
      }
      return false;
    }
    var GIT_GLOBAL_WITH_VALUE = ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"];
    var TAG_LIST_FILTER = /^(-n.*|--contains.*|--no-contains.*|--points-at.*|--merged.*|--no-merged.*|--sort.*|--format.*|--column.*|--no-column|-i|--ignore-case)$/;
    function gitRefused(args) {
      let subcommand = "";
      let skip = false;
      for (const argument of args) {
        if (skip) {
          skip = false;
          continue;
        }
        if (GIT_GLOBAL_WITH_VALUE.includes(argument)) skip = true;
        else if (argument.startsWith("-")) continue;
        else {
          subcommand = argument;
          break;
        }
      }
      if (subcommand === "push") return true;
      if (subcommand !== "tag") return false;
      let listing = true;
      let seen = false;
      for (const argument of args) {
        if (seen) {
          if (argument === "-l" || argument === "--list") {
            listing = true;
            break;
          }
          if (!TAG_LIST_FILTER.test(argument)) listing = false;
        }
        if (argument === "tag") seen = true;
      }
      return !listing;
    }
    function guardRefusal2(tool, args) {
      const list = args.map(String);
      if (tool === "gh" && ghRefused(list)) return refusal(tool, list);
      if (tool === "git" && gitRefused(list)) return refusal(tool, list);
      return null;
    }
    module2.exports = { guardRefusal: guardRefusal2 };
  }
});

// tools/supervisorGuard.harness.mts
var import_strict = __toESM(require("assert/strict"), 1);
var import_child_process = require("child_process");
var import_fs2 = require("fs");
var import_os = require("os");
var import_path = require("path");
var import_rules = __toESM(require_rules(), 1);

// tools/supervisor/spawn.mjs
var import_fs = require("fs");
var WINDOWS = process.platform === "win32";
function pathKey(env = process.env) {
  if (!WINDOWS) return "PATH";
  return Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "Path";
}
function withRequire(nodeOptions, file) {
  const option = `--require "${file.replace(/[\\"]/g, "\\$&")}"`;
  return nodeOptions ? `${nodeOptions} ${option}` : option;
}

// tools/supervisorGuard.harness.mts
var GUARD = (0, import_path.resolve)("tools/supervisor/guard");
var HOOK = (0, import_path.join)(GUARD, "hook.cjs");
var RUN = (0, import_path.join)(GUARD, "run.mjs");
var refused = [
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
  ["git", "tag", "-f", "v9"]
];
var allowed = [
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
  ["npm", "publish"]
];
function rules() {
  for (const [tool, ...args] of refused) {
    import_strict.default.equal(
      (0, import_rules.guardRefusal)(tool, args),
      `supervisor guard: "${[tool, ...args].join(" ")}" publishes and is refused inside a validation (supervise present)`,
      `guardRefusal must refuse: ${[tool, ...args].join(" ")}`
    );
  }
  for (const [tool, ...args] of allowed) {
    import_strict.default.equal((0, import_rules.guardRefusal)(tool, args), null, `guardRefusal must let through: ${[tool, ...args].join(" ")}`);
  }
}
function world() {
  const dir = (0, import_fs2.mkdtempSync)((0, import_path.join)((0, import_os.tmpdir)(), "supervisor-guard-"));
  const bin = (0, import_path.join)(dir, "bin");
  (0, import_fs2.mkdirSync)(bin);
  const log = (0, import_path.join)(dir, "gh.log");
  (0, import_fs2.writeFileSync)(
    (0, import_path.join)(bin, "fake-gh.mjs"),
    "import { appendFileSync } from 'fs';\nappendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');\n"
  );
  (0, import_fs2.writeFileSync)((0, import_path.join)(bin, "gh"), `#!/bin/sh
exec node "$(dirname -- "$0")/fake-gh.mjs" "$@"
`);
  (0, import_fs2.chmodSync)((0, import_path.join)(bin, "gh"), 493);
  (0, import_fs2.writeFileSync)((0, import_path.join)(bin, "gh.cmd"), '@echo off\r\nnode "%~dp0fake-gh.mjs" %*\r\nexit /b %ERRORLEVEL%\r\n');
  const key = pathKey(process.env);
  const base = { ...process.env, FAKE_GH_LOG: log };
  return {
    dir,
    bin,
    log,
    env: (guarded) => ({ ...base, [key]: [...guarded ? [GUARD] : [], bin, process.env[key] ?? ""].join(import_path.delimiter) })
  };
}
function reached(w) {
  if (!(0, import_fs2.existsSync)(w.log)) return [];
  return (0, import_fs2.readFileSync)(w.log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}
function run(command, args, options) {
  const result = (0, import_child_process.spawnSync)(command, args, { encoding: "utf8", ...options });
  return { status: result.status, stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? ""), error: result.error };
}
function shims() {
  const w = world();
  try {
    const refusal = run("gh release create v1", [], { shell: true, env: w.env(true) });
    import_strict.default.equal(refusal.status, 97, `a shell call to gh release create exits 97
${refusal.stderr}`);
    import_strict.default.match(refusal.stderr, /supervisor guard: "gh release create v1" publishes/);
    const push = run("git push origin main", [], { shell: true, env: w.env(true), cwd: w.dir });
    import_strict.default.equal(push.status, 97, `a shell call to git push exits 97
${push.stderr}`);
    import_strict.default.deepEqual(reached(w), [], "a refused call reached the fake gh");
    const read = run("gh issue list", [], { shell: true, env: w.env(true) });
    import_strict.default.equal(read.status, 0, `gh issue list passes the shim
${read.stderr}`);
    import_strict.default.deepEqual(reached(w), [["issue", "list"]], "gh issue list reaches the real gh with its arguments");
    (0, import_fs2.rmSync)(w.log, { force: true });
    run("gh release create v1", [], { shell: true, env: w.env(false) });
    import_strict.default.deepEqual(reached(w), [["release", "create", "v1"]], "without the shims the fake gh must be reachable");
    const empty = (0, import_path.join)(w.dir, "empty");
    (0, import_fs2.mkdirSync)(empty);
    const missing = run(process.execPath, [RUN, "gh", "issue", "list"], {
      env: { ...process.env, [pathKey(process.env)]: [GUARD, empty].join(import_path.delimiter) }
    });
    import_strict.default.equal(missing.status, 127, `no real gh exits 127
${missing.stderr}`);
    import_strict.default.match(missing.stderr, /no gh outside/);
  } finally {
    (0, import_fs2.rmSync)(w.dir, { recursive: true, force: true });
  }
}
var PROBE = `
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
var ESM_PROBE = `
import { spawnSync } from "child_process";
process.stdout.write(String(spawnSync("gh", ["workflow", "run", "x"], { encoding: "utf8" }).status));
`;
function hook() {
  const w = world();
  try {
    const probe = (0, import_path.join)(w.dir, "probe.cjs");
    (0, import_fs2.writeFileSync)(probe, PROBE);
    const esmProbe = (0, import_path.join)(w.dir, "probe.mjs");
    (0, import_fs2.writeFileSync)(esmProbe, ESM_PROBE);
    const heapProbe = (0, import_path.join)(w.dir, "heap.cjs");
    (0, import_fs2.writeFileSync)(heapProbe, `${PROBE}
process.stderr.write(String(require("v8").getHeapStatistics().heap_size_limit > 4000 * 1024 * 1024));
`);
    const guarded = run(process.execPath, ["--require", HOOK, probe], { env: w.env(false) });
    import_strict.default.equal(guarded.status, 0, `hook probe failed
${guarded.stderr}
${guarded.error ?? ""}`);
    import_strict.default.deepEqual(
      JSON.parse(guarded.stdout),
      { spawnSync: 97, shell: 97, execSync: 97, execFileSync: 97, git: 0, quoted: 97, spawn: 97, exec: 97 },
      `every publishing launcher is refused and git --version passes
${guarded.stderr}`
    );
    import_strict.default.deepEqual(reached(w), [], "a call refused by the hook reached the fake gh");
    const esm = run(process.execPath, ["--require", HOOK, esmProbe], { env: w.env(false) });
    import_strict.default.equal(esm.stdout, "97", `an ESM named import of spawnSync is guarded too
${esm.stderr}`);
    const viaOptions = run(process.execPath, [heapProbe], {
      env: { ...w.env(false), NODE_OPTIONS: withRequire("--max-old-space-size=4096", HOOK) }
    });
    import_strict.default.equal(viaOptions.stdout ? JSON.parse(viaOptions.stdout).spawnSync : null, 97, `NODE_OPTIONS loads the hook
${viaOptions.stderr}`);
    import_strict.default.match(viaOptions.stderr, /true$/, "an existing NODE_OPTIONS survives the hook");
    const bare = run(process.execPath, [probe], { env: w.env(false) });
    import_strict.default.notEqual(JSON.parse(bare.stdout).shell, 97, "without the hook the shell call must not be refused");
    import_strict.default.ok(
      reached(w).some((args) => args.join(" ") === "pr merge 1"),
      "without the hook the fake gh must receive the shell call"
    );
  } finally {
    (0, import_fs2.rmSync)(w.dir, { recursive: true, force: true });
  }
}
function main() {
  let failed = 0;
  for (const [name, check] of [
    ["guard rules refuse what publishes and nothing else", rules],
    ["PATH shims refuse through a shell and fail closed", shims],
    ["child_process hook refuses without a shell", hook]
  ]) {
    try {
      check();
      console.log(`ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}
${error.stack ?? error}`);
    }
  }
  if (failed > 0) {
    console.error(`
${failed} guard check(s) failed.`);
    process.exit(1);
  }
  console.log("\nSupervisor guard passed.");
}
main();
