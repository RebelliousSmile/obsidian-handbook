var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// tools/supervisor.harness.mts
var import_strict = __toESM(require("assert/strict"), 1);
var import_fs3 = require("fs");
var import_path3 = require("path");
var import_ajv = __toESM(require("ajv"), 1);

// tools/fixtures/supervisor/world.mts
var import_child_process2 = require("child_process");
var import_crypto = require("crypto");
var import_fs2 = require("fs");
var import_os = require("os");
var import_path2 = require("path");

// tools/supervisor/spawn.mjs
var import_child_process = require("child_process");
var import_fs = require("fs");
var import_path = require("path");
var WINDOWS = process.platform === "win32";
var META = /([()\][%!^"`<>&|;, *?])/g;
function pathKey(env = process.env) {
  if (!WINDOWS) return "PATH";
  return Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "Path";
}
function sameDir(a, b) {
  const clean = (dir) => (0, import_path.resolve)(dir).replace(/[\\/]+$/, "");
  return WINDOWS ? clean(a).toLowerCase() === clean(b).toLowerCase() : clean(a) === clean(b);
}
function isFile(file) {
  try {
    if (!(0, import_fs.statSync)(file).isFile()) return false;
    if (!WINDOWS) (0, import_fs.accessSync)(file, import_fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
function findExecutable(name, { env = process.env, exclude = [] } = {}) {
  const extensions = WINDOWS ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean) : [""];
  const candidates = (base) => WINDOWS && !/\.[^\\/.]+$/.test(base) ? extensions.map((ext) => base + ext) : [base];
  if ((0, import_path.isAbsolute)(name) || /[\\/]/.test(name)) {
    return candidates((0, import_path.resolve)(name)).find(isFile) ?? null;
  }
  const dirs = (env[pathKey(env)] ?? "").split(import_path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    if (exclude.some((skipped) => sameDir(dir, skipped))) continue;
    const found = candidates((0, import_path.join)(dir, name)).find(isFile);
    if (found) return found;
  }
  return null;
}
function withRequire(nodeOptions, file) {
  const option = `--require "${file.replace(/[\\"]/g, "\\$&")}"`;
  return nodeOptions ? `${nodeOptions} ${option}` : option;
}
function escapeArgument(argument, twice) {
  let escaped = String(argument).replace(/(?=(\\+?)?)\1"/g, '$1$1\\"').replace(/(?=(\\+?)?)\1$/, "$1$1");
  escaped = `"${escaped}"`.replace(META, "^$1");
  return twice ? escaped.replace(META, "^$1") : escaped;
}
function batchInvocation(file, args) {
  const twice = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(file);
  const line = [file.replace(META, "^$1"), ...args.map((argument) => escapeArgument(argument, twice))].join(" ");
  return ["/d", "/s", "/c", `"${line}"`];
}
function spawnCommand(command, args = [], options = {}) {
  const { exclude = [], ...spawnOptions } = options;
  const env = spawnOptions.env ?? process.env;
  const file = findExecutable(command, { env, exclude });
  if (!file) {
    const message = `supervisor: command not found: ${command}
`;
    const inherit = spawnOptions.stdio === "inherit";
    if (inherit) process.stderr.write(message);
    const text = spawnOptions.encoding && spawnOptions.encoding !== "buffer";
    const stderr = inherit ? null : text ? message : Buffer.from(message);
    const stdout = inherit ? null : text ? "" : Buffer.alloc(0);
    return { pid: 0, status: 127, signal: null, stdout, stderr, output: [null, stdout, stderr] };
  }
  if (WINDOWS && /\.(cmd|bat)$/i.test(file)) {
    return (0, import_child_process.spawnSync)(env.ComSpec ?? process.env.ComSpec ?? "cmd.exe", batchInvocation(file, args), {
      ...spawnOptions,
      windowsVerbatimArguments: true
    });
  }
  return (0, import_child_process.spawnSync)(file, args, spawnOptions);
}

// tools/fixtures/supervisor/world.mts
var HANDBOOK = process.cwd();
var SUPERVISE = (0, import_path2.resolve)(HANDBOOK, "tools/supervise.mjs");
var FAKE_GH = (0, import_path2.resolve)(HANDBOOK, "tools/fixtures/supervisor/fake-gh.mjs");
var APPLY_TAG_EFFECT = (0, import_path2.resolve)(HANDBOOK, "tools/fixtures/supervisor/apply-tag-effect.mjs");
var FAKE_GIT = (0, import_path2.resolve)(HANDBOOK, "tools/fixtures/supervisor/fake-git.mjs");
var FAKE_NPM = (0, import_path2.resolve)(HANDBOOK, "tools/fixtures/supervisor/fake-npm.mjs");
var TOPOLOGY = JSON.parse((0, import_fs2.readFileSync)((0, import_path2.resolve)(HANDBOOK, "supervisor/topology.json"), "utf8"));
var PROVIDERS = TOPOLOGY.repos.filter((repo) => repo.role === "provider");
function sh(cwd, command, args, env = process.env, input) {
  const result = (0, import_child_process2.spawnSync)(command, args, { cwd, env, encoding: "utf8", input });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
function git(cwd, ...args) {
  const result = sh(cwd, "git", args);
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} in ${cwd}: ${result.stderr}`);
  return result.stdout.trim();
}
function releaseUrl(provider, tag) {
  const version = tag.replace(/^v/, "").replace(/-rc\.\d+$/, "");
  return `https://github.com/RebelliousSmile/${provider}/releases/download/${tag}/${provider}-${version}.tgz`;
}
var World = class {
  constructor() {
    this.realGit = "";
    this.archives = /* @__PURE__ */ new Map();
    /** What the `supervise` calls of this world cost: how many, how long, and how many git calls they made. */
    this.spent = { calls: 0, ms: 0, gitCalls: 0 };
    this.tmp = (0, import_fs2.mkdtempSync)((0, import_path2.join)((0, import_os.tmpdir)(), "handbook-supervisor-"));
    this.root = (0, import_path2.join)(this.tmp, "root");
    this.statePath = (0, import_path2.join)(this.tmp, "gh-state.json");
    this.bin = (0, import_path2.join)(this.tmp, "bin");
    this.gitLog = (0, import_path2.join)(this.tmp, "git-calls.log");
    (0, import_fs2.mkdirSync)(this.root);
    (0, import_fs2.mkdirSync)((0, import_path2.join)(this.tmp, "remotes"));
    (0, import_fs2.mkdirSync)((0, import_path2.join)(this.tmp, "archives"));
    (0, import_fs2.mkdirSync)(this.bin);
    const config = (0, import_path2.join)(this.tmp, "gitconfig");
    (0, import_fs2.writeFileSync)(config, "[user]\n	name = Harness\n	email = harness@example.invalid\n[init]\n	defaultBranch = main\n[commit]\n	gpgsign = false\n[tag]\n	gpgsign = false\n[advice]\n	detachedHead = false\n");
    process.env.GIT_CONFIG_GLOBAL = config;
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    const realGit = findExecutable("git", { exclude: [this.bin] });
    if (!realGit) throw new Error("the supervisor harness needs git on the PATH");
    this.realGit = realGit;
    this.shim("git", FAKE_GIT);
    this.shim("npm", FAKE_NPM);
    this.shim("pnpm", FAKE_NPM);
    this.writeState({ calls: [], releases: {}, issues: {}, prs: {}, events: {}, secrets: {}, runs: {}, workflowEffects: {}, tagEffects: {} });
  }
  /** `bin/<name>` runs `node <script>`: a sh shim for POSIX shells, a `.cmd` one for Windows. */
  shim(name, script) {
    (0, import_fs2.writeFileSync)((0, import_path2.join)(this.bin, name), `#!/bin/sh
exec "${process.execPath}" "${script}" "$@"
`);
    (0, import_fs2.chmodSync)((0, import_path2.join)(this.bin, name), 493);
    (0, import_fs2.writeFileSync)((0, import_path2.join)(this.bin, `${name}.cmd`), `@"${process.execPath}" "${script}" %*\r
@exit /b %ERRORLEVEL%\r
`);
  }
  dir(id) {
    return (0, import_path2.join)(this.root, id);
  }
  /** A deterministic archive whose bytes name the provider and tag. */
  archive(provider, tag, bytes = `archive ${provider} ${tag}
`) {
    const key = `${provider}@${tag}`;
    if (!this.archives.has(key)) {
      const version = tag.replace(/^v/, "").replace(/-rc\.\d+$/, "");
      const file = (0, import_path2.join)(this.tmp, "archives", tag, `${provider}-${version}.tgz`);
      (0, import_fs2.mkdirSync)((0, import_path2.dirname)(file), { recursive: true });
      (0, import_fs2.writeFileSync)(file, bytes);
      this.archives.set(key, {
        provider,
        tag,
        url: releaseUrl(provider, tag),
        file,
        sha256: (0, import_crypto.createHash)("sha256").update(bytes).digest("hex"),
        integrity: `sha512-${(0, import_crypto.createHash)("sha512").update(bytes).digest("base64")}`
      });
    }
    return this.archives.get(key);
  }
  release(provider, tag, publishedAt, bytes) {
    const archive = this.archive(provider, tag, bytes);
    return {
      tagName: tag,
      isPrerelease: tag.includes("-rc."),
      isDraft: false,
      publishedAt,
      assets: [{ name: (0, import_path2.basename)(archive.file), url: archive.url, file: archive.file }]
    };
  }
  readState() {
    return JSON.parse((0, import_fs2.readFileSync)(this.statePath, "utf8"));
  }
  writeState(state) {
    (0, import_fs2.writeFileSync)(this.statePath, JSON.stringify(state, null, "	"));
  }
  updateState(change) {
    const state = this.readState();
    change(state);
    this.writeState(state);
  }
  /** The PATH is set on the key the platform uses (`Path` on Windows), never on a second one. */
  env(extra = {}) {
    const key = pathKey(process.env);
    const env = {};
    for (const [name, value] of Object.entries(process.env)) {
      if (name.toUpperCase() !== "PATH" || name === key) env[name] = value;
    }
    return {
      ...env,
      SUPERVISOR_GH: FAKE_GH,
      FAKE_GH_STATE: this.statePath,
      // The supervisor runs the real git; git itself records each command it runs.
      GIT_TRACE: this.gitLog,
      FAKE_GIT_REAL: this.realGit,
      [key]: [this.bin, process.env[key]].filter(Boolean).join(import_path2.delimiter),
      ...extra
    };
  }
  supervise(args, options = {}) {
    const topology = options.topology ? ["--topology", options.topology] : [];
    const [command, ...rest] = args;
    const started = Date.now();
    const before = this.gitCallCount();
    const result = sh(HANDBOOK, process.execPath, [SUPERVISE, command, "--root", this.root, ...topology, ...rest], this.env(options.env), options.input);
    this.spent.calls += 1;
    this.spent.ms += Date.now() - started;
    this.spent.gitCalls += this.gitCallCount() - before;
    return result;
  }
  /** Every git command the supervisor ran, as the arguments git was given: read from `GIT_TRACE`. */
  gitCalls() {
    if (!(0, import_fs2.existsSync)(this.gitLog)) return [];
    const calls = [];
    for (const line of (0, import_fs2.readFileSync)(this.gitLog, "utf8").split("\n")) {
      const call = /trace: built-in: git (.+)$/.exec(line);
      if (call) calls.push(call[1]);
    }
    return calls;
  }
  gitCallCount() {
    return this.gitCalls().length;
  }
  /** Create a repository with its bare remote, commit `files`, push `main`. */
  createRepo(id, files) {
    const remote = (0, import_path2.join)(this.tmp, "remotes", `${id}.git`);
    git(this.tmp, "init", "--quiet", "--bare", "-b", "main", remote);
    const hook = (0, import_path2.join)(remote, "hooks", "post-receive");
    const portable = (path) => path.replace(/\\/g, "/");
    (0, import_fs2.writeFileSync)(hook, `#!/bin/sh
while read old new ref; do
	case "$ref" in
		refs/tags/*) "${portable(process.execPath)}" "${portable(APPLY_TAG_EFFECT)}" "${id}" "\${ref#refs/tags/}" ;;
	esac
done
`);
    (0, import_fs2.chmodSync)(hook, 493);
    git(this.root, "clone", "--quiet", remote, id);
    this.commit(id, files, `init ${id}`);
    git(this.dir(id), "push", "--quiet", "-u", "origin", "main");
  }
  write(id, files) {
    for (const [path, content] of Object.entries(files)) {
      const file = (0, import_path2.join)(this.dir(id), path);
      (0, import_fs2.mkdirSync)((0, import_path2.dirname)(file), { recursive: true });
      (0, import_fs2.writeFileSync)(file, content);
    }
  }
  commit(id, files, message) {
    this.write(id, files);
    git(this.dir(id), "add", "-A");
    git(this.dir(id), "commit", "--quiet", "--allow-empty", "-m", message);
    return git(this.dir(id), "rev-parse", "HEAD");
  }
  /** Commit only `files` on `main` and push: what a person lands, whatever else lies in the checkout. */
  landFiles(id, files, message) {
    this.write(id, files);
    git(this.dir(id), "add", "--", ...Object.keys(files));
    git(this.dir(id), "commit", "--quiet", "-m", message);
    git(this.dir(id), "push", "--quiet", "origin", "HEAD:main");
    return git(this.dir(id), "rev-parse", "HEAD");
  }
  /** Commit on `main` and push: what a merged pull request leaves on origin/main. */
  land(id, files, message) {
    const sha = this.commit(id, files, message);
    git(this.dir(id), "push", "--quiet", "origin", "HEAD:main");
    return sha;
  }
  snapshot() {
    const result = {};
    for (const repo of TOPOLOGY.repos) {
      const dir = this.dir(repo.path);
      result[repo.id] = `${git(dir, "rev-parse", "HEAD")}
${git(dir, "status", "--porcelain")}`;
    }
    return result;
  }
  dispose() {
    (0, import_fs2.rmSync)(this.tmp, { recursive: true, force: true });
  }
};
function consumerFiles(pins, withNpmLock) {
  const names = Object.keys(pins).sort();
  const dependencies = {};
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
    ...names.flatMap((name) => [`  ${name}@${pins[name].url}: {}`, ""])
  ].join("\n");
  const files = {
    "package.json": `${JSON.stringify({ name: "consumer", version: "1.0.0", dependencies }, null, "	")}
`,
    "pnpm-lock.yaml": pnpm
  };
  if (withNpmLock) {
    const packages = { "": { name: "consumer", dependencies } };
    for (const name of names) packages[`node_modules/${name}`] = { version: "1.0.0", resolved: pins[name].url, integrity: pins[name].integrity };
    files["package-lock.json"] = `${JSON.stringify({ name: "consumer", lockfileVersion: 3, packages }, null, "	")}
`;
  }
  return files;
}
function workflow(name, triggers, inputs, secret) {
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
    ...secret ? ["        env:", "          GH_TOKEN: ${{ secrets." + secret + " }}"] : [],
    ""
  ].join("\n");
}
var WORKFLOWS = {
  pbta: {
    ".github/workflows/release.yml": workflow("Release", [], { mode: true, provider_commit: true, config: false }, "RELEASE_TOKEN"),
    ".github/workflows/release-train.yml": workflow("Release train", [], { provider_commit: true, config: true }),
    ".github/workflows/publish-candidate.yml": workflow("Publish candidate", [], { tag: true, commit: true })
  },
  adrenaline: {
    ".github/workflows/publish-candidate.yml": workflow("Publish candidate", [], { tag: true }),
    ".github/workflows/release-train.yml": workflow("Release train", [], { manifest: true }),
    ".github/workflows/release.yml": workflow("Release", ["  push:", "    tags:", "      - 'v*.*.*'"], { tag: true }),
    ".github/workflows/final-convergence.yml": workflow("Final convergence", [], { record: true })
  },
  mist: {
    ".github/workflows/release-candidate.yml": workflow("Release candidate", [], { tag: true })
  }
};
function matrixFile() {
  const handbook = TOPOLOGY.repos.find((repo) => repo.id === "obsidian-handbook");
  const providers = PROVIDERS.map((provider) => ({
    provider: provider.id,
    repository: provider.repository,
    ref: "0".repeat(40),
    manifests: [{ path: `${provider.trainFiles[0]}earlier.json`, validatorRef: "0".repeat(40) }]
  }));
  return `${JSON.stringify({ protocol: 1, handbook: { repository: handbook.repository, ref: "0".repeat(40) }, providers }, null, 4)}
`;
}
function createWorld() {
  const world = new World();
  const finals = {};
  world.updateState((state) => {
    for (const provider of PROVIDERS) {
      state.releases[provider.repository] = [
        world.release(provider.package, "v1.0.1-rc.1", "2026-09-20T10:00:00Z"),
        world.release(provider.package, "v1.0.0", "2026-09-10T10:00:00Z"),
        world.release(provider.package, "v1.0.0-rc.1", "2026-09-09T10:00:00Z")
      ];
      finals[provider.package] = world.archive(provider.package, "v1.0.0");
    }
  });
  world.createRepo("obsidian-handbook", {
    ...consumerFiles(finals, false),
    "manifest.json": '{"version": "1.0.0"}\n',
    "CHANGELOG.md": "# Changelog\n",
    "src/main.ts": "export {};\n",
    "supervisor/trains/.gitkeep": ""
  });
  world.createRepo("lantern", {
    ...consumerFiles(finals, true),
    "release-train.matrix.json": matrixFile(),
    "CHANGELOG.md": "# Changelog\n",
    "src/index.ts": "export {};\n"
  });
  for (const provider of PROVIDERS) {
    const trainDir = provider.trainFiles[0];
    world.createRepo(provider.path, {
      "package.json": `${JSON.stringify({ name: provider.package, version: "1.0.0" }, null, "	")}
`,
      [`${trainDir}.gitkeep`]: "",
      "src/index.ts": "export {};\n",
      ...WORKFLOWS[provider.adapter]
    });
  }
  return world;
}

// tools/supervisor.harness.mts
var GUARD_DIR = (0, import_path3.resolve)(HANDBOOK, "tools/supervisor/guard");
var statusSchema = JSON.parse((0, import_fs3.readFileSync)((0, import_path3.resolve)(HANDBOOK, "supervisor/status.schema.json"), "utf8"));
var validateStatus = new import_ajv.default({ allErrors: true }).compile(statusSchema);
var scenarios = [];
function scenario(name, run) {
  scenarios.push({ name, run });
}
function ok(result, what) {
  import_strict.default.equal(result.status, 0, `${what} exited ${result.status}
${result.stdout}
${result.stderr}`);
  return result.stdout;
}
scenario("status lists every repository and leaves each one untouched", (world) => {
  const before = world.snapshot();
  const text = ok(world.supervise(["status"]), "status");
  for (const id of ["obsidian-handbook", "lantern", "schema-pbta", "schema-adrenaline", "schema-in-the-mist"]) {
    import_strict.default.match(text, new RegExp(`^${id} \\[`, "m"), `status names ${id}`);
  }
  import_strict.default.match(text, /branch main @ [0-9a-f]{10}, clean, ahead 0, behind 0/);
  import_strict.default.match(text, /No gaps/);
  import_strict.default.deepEqual(world.snapshot(), before, "status changed a HEAD or a working tree");
});
scenario("status --json matches status.schema.json with a pin per consumer and provider", (world) => {
  const status = JSON.parse(ok(world.supervise(["status", "--json"]), "status --json"));
  import_strict.default.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
  import_strict.default.equal(status.pins.length, 6);
  const lantern = status.pins.find((pin) => pin.consumer === "lantern" && pin.provider === "schema-pbta");
  import_strict.default.deepEqual(lantern.lockfiles.map((lock) => lock.file), ["pnpm-lock.yaml", "package-lock.json"]);
  import_strict.default.equal(lantern.lockfiles[1].integrity, world.archive("schema-pbta", "v1.0.0").integrity);
  import_strict.default.equal(status.providers.find((provider) => provider.id === "schema-pbta").latestRc.tag, "v1.0.1-rc.1");
});
scenario("a branch behind origin/main is named and --strict fails", (world) => {
  for (let index = 0; index < 24; index += 1) world.land("obsidian-handbook", { [`notes/${index}.md`]: `${index}
` }, `landed ${index}`);
  sh(world.dir("obsidian-handbook"), "git", ["switch", "--quiet", "-c", "feat/old", "HEAD~24"]);
  const text = ok(world.supervise(["status"]), "status");
  import_strict.default.match(text, /obsidian-handbook: feat\/old is 24 commit\(s\) behind origin\/main/);
  const strict = world.supervise(["status", "--strict"]);
  import_strict.default.notEqual(strict.status, 0, "--strict must fail on a gap");
  const status = JSON.parse(world.supervise(["status", "--json"]).stdout);
  import_strict.default.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
  import_strict.default.equal(status.repos.find((repo) => repo.id === "obsidian-handbook").behind, 24);
});
scenario("a release candidate pin is reported with its URL and lockfile SRI, and divergence names both URLs", (world) => {
  const rc = world.archive("schema-pbta", "v1.0.1-rc.1");
  const handbook = JSON.parse((0, import_fs3.readFileSync)((0, import_path3.resolve)(world.dir("obsidian-handbook"), "package.json"), "utf8"));
  const final = handbook.dependencies["schema-pbta"];
  const lock = (0, import_fs3.readFileSync)((0, import_path3.resolve)(world.dir("obsidian-handbook"), "pnpm-lock.yaml"), "utf8").split(final).join(rc.url).replace(world.archive("schema-pbta", "v1.0.0").integrity, rc.integrity);
  handbook.dependencies["schema-pbta"] = rc.url;
  world.write("obsidian-handbook", { "package.json": JSON.stringify(handbook), "pnpm-lock.yaml": lock });
  const text = ok(world.supervise(["status"]), "status");
  import_strict.default.ok(text.includes(`obsidian-handbook: schema-pbta is pinned to release candidate v1.0.1-rc.1: ${rc.url} (${rc.integrity})`), text);
  import_strict.default.ok(text.includes(`obsidian-handbook: ${rc.url}`) && text.includes(`lantern: ${final}`), text);
  import_strict.default.notEqual(world.supervise(["status", "--strict"]).status, 0);
});
scenario("an edge to an undeclared repository is refused before any git command", (world) => {
  const result = world.supervise(["status"], { topology: (0, import_path3.resolve)(HANDBOOK, "tools/fixtures/supervisor/topology-unknown-edge.json") });
  import_strict.default.equal(result.status, 2, result.stderr);
  import_strict.default.match(result.stderr, /edge schema-pbta -> ghost points to an undeclared repository/);
  import_strict.default.deepEqual(world.gitCalls(), [], "git ran before the topology was accepted");
  import_strict.default.equal(world.readState().calls.length, 0, "gh ran before the topology was accepted");
});
scenario("the shipped topology lists exactly the five repositories", () => {
  const topology = JSON.parse((0, import_fs3.readFileSync)((0, import_path3.resolve)(HANDBOOK, "supervisor/topology.json"), "utf8"));
  import_strict.default.deepEqual(
    topology.repos.map((repo) => repo.id).sort(),
    ["lantern", "obsidian-handbook", "schema-adrenaline", "schema-in-the-mist", "schema-pbta"]
  );
});
var REPOSITORY = Object.fromEntries(TOPOLOGY.repos.map((repo) => [repo.id, repo.repository]));
var TRAIN_ID = "couleur-otherscape";
function trainPath(world, id = TRAIN_ID) {
  return (0, import_path3.resolve)(world.dir("obsidian-handbook"), "supervisor/trains", `${id}.json`);
}
function readRecord(world, id = TRAIN_ID) {
  return JSON.parse((0, import_fs3.readFileSync)(trainPath(world, id), "utf8"));
}
function seedIssues(world) {
  world.updateState((state) => {
    state.issues[REPOSITORY["schema-in-the-mist"]] = {
      31: { number: 31, title: "Otherscape colour tokens", state: "OPEN" },
      32: { number: 32, title: "Another Mist change", state: "OPEN" }
    };
    state.issues[REPOSITORY["obsidian-handbook"]] = { 12: { number: 12, title: "Render the new colours", state: "OPEN" } };
    state.issues[REPOSITORY.lantern] = { 40: { number: 40, title: "Offer the new colours", state: "OPEN" } };
  });
}
function creates(world, repository) {
  return world.readState().calls.filter((call) => call.args[0] === "issue" && call.args[1] === "create" && (!repository || call.args.includes(repository)));
}
function openTrain(world, id = TRAIN_ID, title = "Otherscape colours") {
  ok(world.supervise(["open", id, "--title", title]), `open ${id}`);
}
function next(world) {
  const evaluation = JSON.parse(ok(world.supervise(["next", "--json"]), "next --json"));
  return Object.fromEntries(evaluation.items.map((item) => [item.repo, item]));
}
scenario("open writes a stable record and a coordination issue with the supervisor block", (world) => {
  openTrain(world);
  const text = (0, import_fs3.readFileSync)(trainPath(world), "utf8");
  const record = JSON.parse(text);
  import_strict.default.equal(`${JSON.stringify(record, null, "	")}
`, text, "the record is not byte-stable");
  import_strict.default.deepEqual(record.coordinationIssue, { repo: "obsidian-handbook", number: 1, url: `https://github.com/${REPOSITORY["obsidian-handbook"]}/issues/1` });
  import_strict.default.ok(!("approval" in record), "open wrote an approval");
  const created = creates(world);
  import_strict.default.equal(created.length, 1);
  import_strict.default.ok(created[0].args.includes(REPOSITORY["obsidian-handbook"]));
  const issue = world.readState().issues[REPOSITORY["obsidian-handbook"]][1];
  import_strict.default.equal(issue.title, `Train ${TRAIN_ID}: Otherscape colours`);
  import_strict.default.match(issue.body, /<!-- supervisor:begin -->[\s\S]*<!-- supervisor:end -->/);
  const again = world.supervise(["open", TRAIN_ID, "--title", "twice"]);
  import_strict.default.equal(again.status, 2);
  import_strict.default.match(again.stderr, /already exists/);
  import_strict.default.equal(creates(world).length, 1, "a refused open created an issue");
});
scenario("link reuses issues, next follows the topology, and a merged provider unblocks its consumers", (world) => {
  seedIssues(world);
  openTrain(world);
  ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
  ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
  ok(world.supervise(["link", "lantern#40"]), "link lantern");
  import_strict.default.equal(creates(world).length, 1, "link created an issue");
  const record = readRecord(world);
  const items = Object.fromEntries(record.items.map((item) => [item.repo, item]));
  import_strict.default.deepEqual(items["schema-in-the-mist"].dependsOn, []);
  import_strict.default.deepEqual(items["obsidian-handbook"].dependsOn, ["schema-in-the-mist"]);
  import_strict.default.deepEqual(items.lantern.dependsOn, ["schema-in-the-mist"]);
  import_strict.default.equal(items["schema-in-the-mist"].baseSha, git(world.dir("schema-in-the-mist"), "rev-parse", "origin/main"));
  import_strict.default.equal(items["obsidian-handbook"].title, "Render the new colours");
  let state = next(world);
  import_strict.default.equal(state["schema-in-the-mist"].state, "ready");
  import_strict.default.equal(state["obsidian-handbook"].state, "blocked");
  import_strict.default.deepEqual(state.lantern.blockedBy.map((dependency) => dependency.label), ["schema-in-the-mist#31"]);
  import_strict.default.match(ok(world.supervise(["next"]), "next"), /Blocked:\n.*obsidian-handbook#12.*blocked by schema-in-the-mist#31 \(open\)/);
  const status = JSON.parse(ok(world.supervise(["status", "--json"]), "status --json"));
  import_strict.default.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
  import_strict.default.equal(status.train.id, TRAIN_ID);
  import_strict.default.equal(status.train.items.length, 3);
  const mist = world.dir("schema-in-the-mist");
  const before = git(mist, "rev-parse", "HEAD");
  const merged = world.land("schema-in-the-mist", { "src/colours.ts": "export const colours = [];\n" }, "Add colours (fixes #31)");
  git(mist, "reset", "--quiet", "--hard", before);
  git(mist, "update-ref", "refs/remotes/origin/main", before);
  world.updateState((state2) => {
    state2.issues[REPOSITORY["schema-in-the-mist"]][31].state = "CLOSED";
    state2.events[`repos/${REPOSITORY["schema-in-the-mist"]}/issues/31/events`] = [{ event: "closed", commit_id: merged }];
  });
  const recordBefore = (0, import_fs3.readFileSync)(trainPath(world), "utf8");
  state = next(world);
  import_strict.default.equal(state["schema-in-the-mist"].state, "done");
  import_strict.default.equal(state["schema-in-the-mist"].commit, merged);
  import_strict.default.equal(state["obsidian-handbook"].state, "ready");
  import_strict.default.equal(state.lantern.state, "ready");
  import_strict.default.equal(git(mist, "rev-parse", "HEAD"), before, "next moved the Mist checkout");
  import_strict.default.equal((0, import_fs3.readFileSync)(trainPath(world), "utf8"), recordBefore, "next changed the record");
  const handbookMerge = world.land("obsidian-handbook", { "src/colours.ts": "export {};\n" }, "Merge pull request #5");
  world.updateState((state2) => {
    state2.prs[REPOSITORY["obsidian-handbook"]] = { 5: { mergeCommit: handbookMerge } };
    Object.assign(state2.issues[REPOSITORY["obsidian-handbook"]][12], { state: "CLOSED", closedByPullRequests: [5] });
    state2.issues[REPOSITORY.lantern][40].state = "CLOSED";
  });
  state = next(world);
  import_strict.default.equal(state["obsidian-handbook"].state, "done");
  import_strict.default.equal(state["obsidian-handbook"].via, "pull request #5");
  import_strict.default.equal(state.lantern.state, "closed-unproven");
});
scenario("sync rewrites only the supervisor block of the coordination issue", (world) => {
  seedIssues(world);
  openTrain(world);
  ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
  const coordination = readRecord(world).coordinationIssue.number;
  world.updateState((state) => {
    const issue = state.issues[REPOSITORY["obsidian-handbook"]][coordination];
    issue.body = `Written by hand above.

${issue.body}
Written by hand below.
`;
  });
  ok(world.supervise(["sync"]), "sync");
  const body = world.readState().issues[REPOSITORY["obsidian-handbook"]][coordination].body;
  import_strict.default.match(body, /^Written by hand above\./);
  import_strict.default.match(body, /Written by hand below\.\n$/);
  import_strict.default.match(body, /\[schema-in-the-mist#31\]\(https:\/\/github\.com\/RebelliousSmile\/schema-in-the-mist\/issues\/31\) Otherscape colour tokens \| ready \|/);
  import_strict.default.equal(body.split("<!-- supervisor:begin -->").length, 2, "the block was duplicated");
  const edits = () => world.readState().calls.filter((call) => call.args[0] === "issue" && call.args[1] === "edit").length;
  const count = edits();
  import_strict.default.match(ok(world.supervise(["sync"]), "sync again"), /already up to date/);
  import_strict.default.equal(edits(), count, "an unchanged block was written again");
});
scenario("a repository engaged by another open train is refused, from the checkout or from origin/main", (world) => {
  seedIssues(world);
  openTrain(world);
  ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
  openTrain(world, "autre-train", "Another change");
  const calls = world.readState().calls.length;
  let refused = world.supervise(["link", "schema-in-the-mist#32", "--train", "autre-train"]);
  import_strict.default.equal(refused.status, 2, refused.stderr);
  import_strict.default.match(refused.stderr, new RegExp(`already engaged by the open train "${TRAIN_ID}"`));
  import_strict.default.equal(world.readState().calls.length, calls, "a refused link called gh");
  const handbook = world.dir("obsidian-handbook");
  git(handbook, "add", "supervisor/trains");
  git(handbook, "commit", "--quiet", "-m", "record trains");
  git(handbook, "push", "--quiet", "origin", "HEAD:main");
  (0, import_fs3.rmSync)(trainPath(world));
  refused = world.supervise(["link", "schema-in-the-mist#32", "--train", "autre-train"]);
  import_strict.default.equal(refused.status, 2, refused.stderr);
  import_strict.default.match(refused.stderr, new RegExp(`already engaged by the open train "${TRAIN_ID}"`));
});
scenario("a record with a dependency cycle or without coordination issue is refused by name", (world) => {
  seedIssues(world);
  openTrain(world);
  ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
  ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
  const record = readRecord(world);
  record.items.find((item) => item.repo === "schema-in-the-mist").dependsOn = ["obsidian-handbook"];
  (0, import_fs3.writeFileSync)(trainPath(world), JSON.stringify(record, null, "	"));
  let result = world.supervise(["next"]);
  import_strict.default.equal(result.status, 2);
  import_strict.default.match(result.stderr, /dependency cycle (schema-in-the-mist -> obsidian-handbook -> schema-in-the-mist|obsidian-handbook -> schema-in-the-mist -> obsidian-handbook)/);
  delete record.coordinationIssue;
  (0, import_fs3.writeFileSync)(trainPath(world), JSON.stringify(record, null, "	"));
  result = world.supervise(["next"]);
  import_strict.default.equal(result.status, 2);
  import_strict.default.match(result.stderr, /coordinationIssue/);
});
scenario("link --create asks first: nothing is created without a terminal or --yes", (world) => {
  openTrain(world);
  const refused = world.supervise(["link", "lantern", "--create", "--title", "Offer the new colours"]);
  import_strict.default.equal(refused.status, 2, refused.stderr);
  import_strict.default.match(refused.stderr, /pass --yes/);
  import_strict.default.equal(creates(world, REPOSITORY.lantern).length, 0, "an issue was created without confirmation");
  import_strict.default.ok(!readRecord(world).items.length, "a refused link wrote an item");
  ok(world.supervise(["link", "lantern", "--create", "--title", "Offer the new colours", "--yes"]), "link --create --yes");
  import_strict.default.equal(creates(world, REPOSITORY.lantern).length, 1);
  const item = readRecord(world).items[0];
  import_strict.default.equal(item.issue, 1);
  import_strict.default.equal(item.title, "Offer the new colours");
  import_strict.default.ok((0, import_fs3.existsSync)(trainPath(world)));
});
function nodeCommand(code) {
  return [process.execPath, "-e", code];
}
var PASS = nodeCommand("console.log('validation passed')");
function testTopology(world, validations = {}, convergence = {}, name = "topology.json") {
  const file = (0, import_path3.resolve)(world.tmp, name);
  const topology = JSON.parse(JSON.stringify(TOPOLOGY));
  for (const repo of topology.repos) {
    repo.validations = validations[repo.id] ?? [PASS];
    if (repo.role === "provider") continue;
    if (convergence[repo.id] === null) delete repo.convergence;
    else repo.convergence = convergence[repo.id] ?? [PASS];
  }
  (0, import_fs3.writeFileSync)(file, JSON.stringify(topology));
  return file;
}
function doneTrain(world) {
  seedIssues(world);
  openTrain(world);
  ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
  ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
  ok(world.supervise(["link", "lantern#40"]), "link lantern");
  const closing = [["schema-in-the-mist", 31, "src/colours.ts"], ["obsidian-handbook", 12, "src/colours.ts"], ["lantern", 40, "src/colours.ts"]];
  for (const [repo, issue, path] of closing) {
    const commit2 = world.land(repo, { [path]: `export const ${repo.replace(/-/g, "")} = [];
` }, `Colours (fixes #${issue})`);
    world.updateState((state) => {
      state.issues[REPOSITORY[repo]][issue].state = "CLOSED";
      state.events[`repos/${REPOSITORY[repo]}/issues/${issue}/events`] = [{ event: "closed", commit_id: commit2 }];
    });
  }
}
function presentTrain(world, topology) {
  ok(world.supervise(["present"], { topology }), "present");
}
function bindingMessages(world, topology) {
  const probe = [
    "const [root, topologyFile, trainFile] = process.argv.slice(1);",
    "const { loadTopology } = await import('./tools/supervisor/topology.mjs');",
    "const { readTrain } = await import('./tools/supervisor/train.mjs');",
    "const { bindingProblems } = await import('./tools/supervisor/binding.mjs');",
    "const topology = loadTopology(topologyFile);",
    "console.log(JSON.stringify(bindingProblems(root, topology, readTrain(trainFile, topology)).map((problem) => problem.message)));"
  ].join("\n");
  return JSON.parse(ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, world.root, topology, trainPath(world)]), "binding probe"));
}
scenario("present reports each concerned repository with its SHA, commits and validations", (world) => {
  const topology = testTopology(world);
  doneTrain(world);
  const report = ok(world.supervise(["present"], { topology }), "present");
  for (const repo of ["schema-in-the-mist", "obsidian-handbook", "lantern"]) {
    const sha = git(world.dir(repo), "rev-parse", "origin/main");
    import_strict.default.ok(report.includes(`## ${repo} (`) && report.includes(sha.slice(0, 10)), `${repo} at ${sha} missing
${report}`);
  }
  import_strict.default.match(report, /\*\*Presentable\.\*\*/);
  import_strict.default.match(report, /Colours \(fixes #31\)/);
  import_strict.default.ok(report.includes(`passed: \`${PASS.join(" ")}\``), report);
  import_strict.default.match(report, /schema-in-the-mist: release candidate of schema-in-the-mist/);
  import_strict.default.match(report, /schema-in-the-mist: final release of schema-in-the-mist, same bytes as the candidate/);
  import_strict.default.match(report, /lantern: release/);
  import_strict.default.ok(report.includes("## Try it before publishing\n\n`pnpm supervise preview --vault <vault>`"), report);
  import_strict.default.ok(report.includes("`pnpm supervise publish --run` publishes exactly these commits"), report);
  const record = readRecord(world);
  import_strict.default.equal(record.presentation.presentable, true);
  import_strict.default.ok(!("approval" in record), "present wrote an approval");
  import_strict.default.ok(!report.includes("schema-pbta ("), "an unconcerned provider was presented");
});
scenario("present refuses an unfinished train and a checkout that is not origin/main", (world) => {
  const topology = testTopology(world);
  seedIssues(world);
  openTrain(world);
  ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
  let result = world.supervise(["present"], { topology });
  import_strict.default.equal(result.status, 1, result.stderr);
  import_strict.default.match(result.stderr, /not every item is done: schema-in-the-mist#31 \(ready\)/);
  world.updateState((state) => {
    state.issues[REPOSITORY["schema-in-the-mist"]][31].state = "CLOSED";
  });
  const commit2 = world.land("schema-in-the-mist", { "src/colours.ts": "export {};\n" }, "Colours");
  world.updateState((state) => {
    state.events[`repos/${REPOSITORY["schema-in-the-mist"]}/issues/31/events`] = [{ event: "closed", commit_id: commit2 }];
  });
  world.write("lantern", { "src/index.ts": "dirty\n" });
  sh(world.dir("obsidian-handbook"), "git", ["switch", "--quiet", "-c", "feat/elsewhere"]);
  world.commit("obsidian-handbook", { "src/other.ts": "export {};\n" }, "not landed");
  result = world.supervise(["present"], { topology });
  import_strict.default.equal(result.status, 1, result.stderr);
  import_strict.default.match(result.stderr, /lantern: uncommitted changes/);
  import_strict.default.match(result.stderr, /obsidian-handbook: HEAD [0-9a-f]{10} is not origin\/main .*switch main && git -C .* pull --ff-only/);
});
scenario("present binds the SHAs without a terminal", (world) => {
  const topology = testTopology(world);
  doneTrain(world);
  const report = ok(world.supervise(["present"], { topology }), "present");
  const record = readRecord(world);
  import_strict.default.ok(!("approval" in record), "present wrote an approval");
  import_strict.default.match(record.presentation.digest, /^sha256:[0-9a-f]{64}$/);
  import_strict.default.ok(report.includes(record.presentation.digest), report);
  import_strict.default.deepEqual(record.presentation.repos.map((entry) => entry.repo).sort(), ["lantern", "obsidian-handbook", "schema-in-the-mist"]);
  import_strict.default.equal(record.presentation.repos.find((entry) => entry.repo === "lantern").sha, git(world.dir("lantern"), "rev-parse", "origin/main"));
  import_strict.default.ok(record.presentation.publications.includes("schema-in-the-mist: release candidate of schema-in-the-mist"));
  import_strict.default.ok(record.presentation.presentedAt);
  import_strict.default.deepEqual(bindingMessages(world, topology), []);
});
scenario("approve is no longer a command, and the help does not name it", (world) => {
  const result = world.supervise(["approve"]);
  import_strict.default.equal(result.status, 2, result.stderr);
  import_strict.default.match(result.stderr, /unknown command "approve"/);
  import_strict.default.match(result.stderr, /usage: pnpm supervise <command>/);
  import_strict.default.ok(!/\bapprove\b/.test(result.stderr.replace('unknown command "approve"', "")), result.stderr);
  import_strict.default.ok(!/\bapprove\b/.test(ok(world.supervise(["--help"]), "help")));
});
scenario("a record written by the former approve still reads, and its approval binds nothing", (world) => {
  const topology = testTopology(world);
  doneTrain(world);
  presentTrain(world, topology);
  const record = readRecord(world);
  const { digest, repos, trainFiles, publications } = record.presentation;
  record.approval = { approvedAt: "2026-10-02T14:43:41.944Z", digest, repos: repos.map(({ repo, sha }) => ({ repo, sha: "0".repeat(sha.length) })), trainFiles, publications };
  (0, import_fs3.writeFileSync)(trainPath(world), `${JSON.stringify(record, null, "	")}
`);
  ok(world.supervise(["next", "--json"]), "next");
  import_strict.default.equal(JSON.parse(ok(world.supervise(["status", "--json"]), "status --json")).train.id, TRAIN_ID);
  import_strict.default.deepEqual(bindingMessages(world, topology), [], "the obsolete approval was read");
  const validate = new import_ajv.default({ allErrors: true }).compile(JSON.parse((0, import_fs3.readFileSync)((0, import_path3.resolve)(HANDBOOK, "supervisor/train.schema.json"), "utf8")));
  const shipped2 = (0, import_path3.resolve)(HANDBOOK, "supervisor/trains");
  for (const name of (0, import_fs3.readdirSync)(shipped2).filter((entry) => entry.endsWith(".json"))) {
    import_strict.default.ok(validate(JSON.parse((0, import_fs3.readFileSync)((0, import_path3.resolve)(shipped2, name), "utf8"))), `${name}: ${JSON.stringify(validate.errors)}`);
  }
});
scenario("publish refuses a commit outside the train pushed after present", (world) => {
  const topology = testTopology(world);
  doneTrain(world);
  presentTrain(world, topology);
  const late = world.land("lantern", { "src/late.ts": "export {};\n" }, "late change");
  const result = world.supervise(["publish"], { topology });
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.ok(result.stderr.includes(`lantern: commit ${late.slice(0, 10)} changes src/late.ts, outside the train files`), result.stderr);
  import_strict.default.match(result.stderr, /Present the train again: supervise present/);
});
scenario("publish refuses a presentation edited by hand", (world) => {
  const topology = testTopology(world);
  doneTrain(world);
  presentTrain(world, topology);
  const record = readRecord(world);
  record.presentation.repos.find((entry) => entry.repo === "lantern").sha = "f".repeat(40);
  (0, import_fs3.writeFileSync)(trainPath(world), `${JSON.stringify(record, null, "	")}
`);
  const result = world.supervise(["publish", "--run"], { topology });
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stderr, /the presentation was edited after present/);
  import_strict.default.deepEqual(dispatches(world), []);
});
scenario("an adoption commit of the observed candidate keeps the presentation; any other change voids it", (world) => {
  const topology = testTopology(world);
  doneTrain(world);
  presentTrain(world, topology);
  const candidate = world.archive("schema-in-the-mist", "v1.0.1-rc.1");
  const final = world.archive("schema-in-the-mist", "v1.0.0");
  const record = readRecord(world);
  record.publication = { "schema-in-the-mist": { candidate: { tag: candidate.tag, url: candidate.url, sha256: candidate.sha256, integrity: candidate.integrity } } };
  (0, import_fs3.writeFileSync)(trainPath(world), `${JSON.stringify(record, null, "	")}
`);
  const lantern = world.dir("lantern");
  const adopt2 = {};
  for (const file of ["package.json", "pnpm-lock.yaml", "package-lock.json"]) {
    adopt2[file] = (0, import_fs3.readFileSync)((0, import_path3.resolve)(lantern, file), "utf8").split(final.url).join(candidate.url).split(final.integrity).join(candidate.integrity);
  }
  world.land("lantern", adopt2, "Adopt schema-in-the-mist v1.0.1-rc.1");
  import_strict.default.deepEqual(bindingMessages(world, topology), [], "the adoption voided the presentation");
  const unknown = world.archive("schema-in-the-mist", "v9.9.9");
  world.land("lantern", { "pnpm-lock.yaml": `${adopt2["pnpm-lock.yaml"]}# ${unknown.url}
` }, "Pin an archive nobody observed");
  let result = world.supervise(["publish"], { topology });
  import_strict.default.equal(result.status, 1, result.stderr);
  import_strict.default.ok(result.stderr.includes(`introduces ${unknown.url} in pnpm-lock.yaml`), result.stderr);
  const outside = world.land("obsidian-handbook", { "src/main.ts": "export const late = 1;\n" }, "late fix");
  result = world.supervise(["publish"], { topology });
  import_strict.default.equal(result.status, 1);
  import_strict.default.ok(result.stderr.includes(`obsidian-handbook: commit ${outside.slice(0, 10)} changes src/main.ts, outside the train files`), result.stderr);
  import_strict.default.match(result.stderr, /supervise present/);
});
scenario("a failing validation makes the train not presentable and publish --run refuses it, running nothing", (world) => {
  const broken = nodeCommand("console.error('contract broken'); process.exit(3)");
  const topology = testTopology(world, { "schema-in-the-mist": [broken] });
  doneTrain(world);
  const result = world.supervise(["present"], { topology });
  import_strict.default.equal(result.status, 1, result.stderr);
  import_strict.default.match(result.stdout, /\*\*Not presentable\*\*/);
  import_strict.default.ok(result.stdout.includes(`schema-in-the-mist: ${broken.join(" ")} exited 3`), result.stdout);
  import_strict.default.match(result.stdout, /contract broken/);
  const refused = world.supervise(["publish", "--run"], { topology });
  import_strict.default.equal(refused.status, 1, refused.stdout);
  import_strict.default.match(refused.stderr, /the last presentation of train "couleur-otherscape" is not presentable/);
  import_strict.default.ok(refused.stderr.includes(`schema-in-the-mist: ${broken.join(" ")} exited 3`), refused.stderr);
  import_strict.default.deepEqual(dispatches(world), []);
  import_strict.default.equal(world.readState().localCalls, void 0);
});
function shellCommand(lines) {
  return process.platform === "win32" ? ["cmd", "/d", "/s", "/c", lines.join(" & ")] : ["sh", "-c", lines.join("; ")];
}
function nodeValidation(world) {
  const file = (0, import_path3.resolve)(world.tmp, "publishing-tool.cjs");
  (0, import_fs3.writeFileSync)(file, `const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const BIN = ${JSON.stringify(world.bin)};
function run(name, args) {
	const file = join(BIN, name);
	const result = process.platform === "win32"
		? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", \`""\${file}.cmd" \${args.join(" ")}"\`], { windowsVerbatimArguments: true, stdio: "inherit" })
		: spawnSync(file, args, { stdio: "inherit" });
	return result.status;
}
if (run("gh", ["workflow", "run", "release.yml"]) === 0) process.exit(21);
if (process.argv[2] === "leak") process.exit(0);
if (run("gh", ["release", "create", "v9.9.8"]) === 0) process.exit(22);
if (run("git", ["push", "origin", "HEAD:main"]) === 0) process.exit(23);
if (run("git", ["tag", "v9.9.8"]) === 0) process.exit(24);
if (run("gh", ["issue", "list"]) !== 0) process.exit(25);
if (run("git", ["status", "--short"]) !== 0) process.exit(26);
console.log("guarded");
`);
  return file;
}
scenario("a validation cannot release, push or tag: the guard refuses on both paths, ordinary calls go through", (world) => {
  const ghLog = (0, import_path3.resolve)(world.tmp, "real-gh.log");
  const realGh = (0, import_path3.resolve)(world.tmp, "real-gh.mjs");
  (0, import_fs3.writeFileSync)(realGh, `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(ghLog)}, process.argv.slice(2).join(" ") + "\\n");
`);
  world.shim("gh", realGh);
  const shell = shellCommand([
    "gh release create v9.9.9 dist.tgz && exit 11",
    "gh api -X POST repos/o/r/dispatches && exit 12",
    "gh workflow run release.yml && exit 13",
    "git push origin HEAD:main && exit 14",
    "git tag v9.9.9 && exit 15",
    "gh issue list || exit 16",
    "git status --short || exit 17",
    "git tag -l || exit 18",
    "echo guarded"
  ]);
  const tool = nodeValidation(world);
  const topology = testTopology(world, { "schema-in-the-mist": [shell, [process.execPath, tool]] });
  doneTrain(world);
  const mist = world.dir("schema-in-the-mist");
  const remote = git(mist, "ls-remote", "origin", "refs/heads/main", "refs/tags/*");
  const report = ok(world.supervise(["present"], { topology }), "present");
  import_strict.default.ok(report.includes(`passed: \`${shell.join(" ")}\``), report);
  import_strict.default.ok(report.includes(`passed: \`${process.execPath} ${tool}\``), report);
  const calls = (0, import_fs3.readFileSync)(ghLog, "utf8");
  import_strict.default.equal(calls, "issue list\nissue list\n", `the real gh saw: ${calls}`);
  import_strict.default.equal(git(mist, "ls-remote", "origin", "refs/heads/main", "refs/tags/*"), remote, "a validation moved the remote");
  const gitCalls = world.gitCalls().join("\n");
  import_strict.default.doesNotMatch(gitCalls, /^push/m, "a push reached git");
  import_strict.default.doesNotMatch(gitCalls, /^tag v9/m, "a tag reached git");
  const env = world.env();
  const key = pathKey(env);
  const unshimmed = { ...env, NODE_OPTIONS: withRequire(env.NODE_OPTIONS, (0, import_path3.join)(GUARD_DIR, "hook.cjs")) };
  const [command, ...args] = shellCommand(["gh release create v9.9.9 dist.tgz"]);
  spawnCommand(command, args, { cwd: mist, env: unshimmed, encoding: "utf8" });
  import_strict.default.match((0, import_fs3.readFileSync)(ghLog, "utf8"), /^release create v9\.9\.9/m, "without its shims the shell path did not leak: the scenario proves nothing");
  const unhooked = { ...env, [key]: [GUARD_DIR, env[key]].join(import_path3.delimiter) };
  spawnCommand(process.execPath, [tool, "leak"], { cwd: mist, env: unhooked, encoding: "utf8" });
  import_strict.default.match((0, import_fs3.readFileSync)(ghLog, "utf8"), /^workflow run release\.yml/m, "without its hook the Node path did not leak: the scenario proves nothing");
});
var NEXT = "1.1.0";
function bytesOf(provider, variant = "") {
  return `package ${provider} ${NEXT}${variant}
`;
}
function presentedTrain(world, providers, options = {}) {
  const topology = testTopology(world);
  const items = [...providers.map((id, index) => [id, 50 + index]), ["obsidian-handbook", 12], ["lantern", 40]];
  world.updateState((state) => {
    for (const [repo, number] of items) state.issues[REPOSITORY[repo]] = { [number]: { number, title: `Change ${repo}`, state: "OPEN" } };
    if (options.secrets !== false) state.secrets[REPOSITORY["schema-pbta"]] = ["RELEASE_TOKEN"];
  });
  openTrain(world);
  for (const [repo, number] of items) ok(world.supervise(["link", `${repo}#${number}`]), `link ${repo}`);
  for (const [repo, number] of items) {
    const files = { "src/change.ts": `export const change = ${number};
` };
    if (providers.includes(repo)) files["package.json"] = `${JSON.stringify({ name: repo, version: NEXT }, null, "	")}
`;
    const commit2 = world.land(repo, files, `Change (fixes #${number})`);
    world.updateState((state) => {
      state.issues[REPOSITORY[repo]][number].state = "CLOSED";
      state.events[`repos/${REPOSITORY[repo]}/issues/${number}/events`] = [{ event: "closed", commit_id: commit2 }];
    });
  }
  options.before?.();
  if (options.present !== false) presentTrain(world, topology);
  return topology;
}
function publish(world, run, topology) {
  return world.supervise(run ? ["publish", "--run"] : ["publish"], { topology });
}
function dispatches(world, workflow2) {
  return world.readState().calls.filter((call) => call.args[0] === "workflow" && call.args[1] === "run" && (!workflow2 || call.args[2] === workflow2)).map((call) => call.args);
}
function adopt(world, provider, candidate, from = world.archive(provider, "v1.0.0")) {
  const consumers = [["obsidian-handbook", ["package.json", "pnpm-lock.yaml"]], ["lantern", ["package.json", "pnpm-lock.yaml", "package-lock.json"]]];
  for (const [id, files] of consumers) {
    const changed = {};
    for (const file of files) {
      changed[file] = (0, import_fs3.readFileSync)((0, import_path3.resolve)(world.dir(id), file), "utf8").split(from.url).join(candidate.url).split(from.integrity).join(candidate.integrity);
    }
    world.landFiles(id, changed, `Adopt ${provider} ${candidate.tag}`);
  }
}
function originFile(world, id, path) {
  return git(world.dir(id), "show", `origin/main:${path}`);
}
function firstVersion(world, id, path) {
  const added = git(world.dir(id), "log", "--format=%H", "--diff-filter=A", "origin/main", "--", path).split("\n").pop();
  return git(world.dir(id), "show", `${added}:${path}`);
}
function lastSubject(world, id) {
  return git(world.dir(id), "log", "-1", "--format=%s", "origin/main");
}
function installs(world) {
  return (world.readState().localCalls ?? []).filter((call) => call.args[0] === "install" || call.args[0] === "ci").map((call) => `${(0, import_path3.basename)(call.cwd)} ${call.args.join(" ")}`);
}
function driveMist(world, finalBytes, topology) {
  const mist = REPOSITORY["schema-in-the-mist"];
  world.updateState((state) => {
    state.workflowEffects[`${mist} release-candidate.yml`] = [{ createRelease: world.release("schema-in-the-mist", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-in-the-mist")) }];
    state.localEffects = {
      ...state.localEffects,
      "schema-in-the-mist release-train:promote": [{ repository: mist, createRelease: world.release("schema-in-the-mist", `v${NEXT}`, "2026-09-29T11:00:00Z", finalBytes) }],
      "schema-in-the-mist release-train:converge": [{ write: { path: `release-trains/v${NEXT}.convergence.json`, content: '{"converged": true}\n' } }]
    };
  });
  const candidate = world.archive("schema-in-the-mist", `v${NEXT}-rc.1`);
  return { candidate, result: publish(world, true, topology) };
}
scenario("publish shows the next step and its exact command, runs nothing, and says the same twice", (world) => {
  presentedTrain(world, ["schema-pbta", "schema-in-the-mist"], { secrets: false });
  const sha = readRecord(world).presentation.repos.find((entry) => entry.repo === "schema-pbta").sha;
  const first = ok(publish(world, false), "publish");
  import_strict.default.ok(first.includes(`$ gh workflow run release.yml -R RebelliousSmile/schema-pbta --ref main -f mode=digest -f provider_commit=${sha}`), first);
  import_strict.default.match(first, /Nothing was run/);
  import_strict.default.equal(ok(publish(world, false), "publish again"), first, "a same observation gave another step");
  import_strict.default.deepEqual(dispatches(world), []);
  import_strict.default.equal(world.readState().calls.filter((call) => call.args[0] === "secret").length, 0, "publish without --run read secrets");
  import_strict.default.equal(readRecord(world).publication["schema-pbta"]?.runs, void 0);
});
scenario("a same observation always gives the same step, for each adapter", () => {
  const repo = (id) => TOPOLOGY.repos.find((entry) => entry.id === id);
  const candidate = { tag: "v1.1.0-rc.1", url: "https://github.com/o/r/releases/download/v1.1.0-rc.1/p-1.1.0.tgz", sha256: "a".repeat(64), integrity: "sha512-x" };
  const run = (conclusion) => ({ step: "s", url: "https://github.com/o/r/actions/runs/1", conclusion, at: "t" });
  const common = { sha: "b".repeat(40), version: NEXT, finalTag: `v${NEXT}`, final: null, candidate, published: true, adopted: true, trainProblem: null, trainPath: "release-train/x.json" };
  const adoption = [{ repo: "obsidian-handbook", sha: "c".repeat(40), adopted: true }, { repo: "lantern", sha: "d".repeat(40), adopted: false }];
  const consumers = [{ role: "handbook", repository: "o/h", ref: "c".repeat(40) }];
  const observations = [
    ["pbta", { ...common, repo: repo("schema-pbta"), provider: "schema-pbta", candidate: null, runs: { digest: run(null) }, inputs: { digest: {} } }],
    ["pbta", { ...common, repo: repo("schema-pbta"), provider: "schema-pbta", candidateProblem: null, adoption, runs: {}, inputs: {} }],
    ["pbta", { ...common, repo: repo("schema-pbta"), provider: "schema-pbta", candidateProblem: null, adoption: adoption.map((entry) => ({ ...entry, adopted: true })), runs: { train: run("success"), promote: run("failure") }, inputs: { promote: { mode: "promote" } } }],
    ["adrenaline", { ...common, repo: repo("schema-adrenaline"), provider: "schema-adrenaline", candidateTag: "v1.1.0-rc.1", published: false, runs: { candidate: null }, inputs: { candidate: { tag: "v1.1.0-rc.1" } } }],
    ["adrenaline", { ...common, repo: repo("schema-adrenaline"), provider: "schema-adrenaline", adoption: [], consumers, trainProblem: "is not on origin/main", runs: {}, inputs: {} }],
    ["adrenaline", { ...common, repo: repo("schema-adrenaline"), provider: "schema-adrenaline", adoption: [], tagPushed: false, runs: { train: run("success") }, inputs: {} }],
    ["mist", { ...common, repo: repo("schema-in-the-mist"), provider: "schema-in-the-mist", adoption: [], proven: false, provenance: "/p.json", runs: {}, inputs: {} }],
    ["mist", { ...common, repo: repo("schema-in-the-mist"), provider: "schema-in-the-mist", adoption: [{ repo: "obsidian-handbook", adopted: true }], consumers, trainProblem: "is not on origin/main", runs: {}, inputs: {} }]
  ];
  const probe = [
    "const observations = JSON.parse(process.argv[1]);",
    "const results = [];",
    "for (const [name, observation] of observations) {",
    "	const adapter = await import(`./tools/supervisor/adapters/${name}.mjs`);",
    "	const copy = structuredClone(observation);",
    "	results.push({ first: adapter.nextStep(observation), second: adapter.nextStep(copy), untouched: JSON.stringify(observation) === JSON.stringify(copy) });",
    "}",
    "console.log(JSON.stringify(results));"
  ].join("\n");
  const result = sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, JSON.stringify(observations)]);
  const steps = JSON.parse(ok(result, "nextStep probe"));
  for (const [index, entry] of steps.entries()) {
    const provider = observations[index][1].provider;
    import_strict.default.notEqual(entry.first.kind, "done", `${provider}: observation ${index} is not finished`);
    import_strict.default.deepEqual(entry.second, entry.first, `${provider}: a copy of observation ${index} gave another step`);
    import_strict.default.ok(entry.untouched, `${provider}: nextStep changed observation ${index}`);
  }
  import_strict.default.deepEqual(steps.map((entry) => entry.first.type ?? entry.first.kind), ["wait", "adopt", "workflow", "workflow", "land", "tag", "local", "land"]);
  import_strict.default.deepEqual(steps[1].first.consumers, ["lantern"], "an adopted consumer is adopted again");
  import_strict.default.deepEqual(steps[5].first.command, ["git", "push", "origin", `origin/main:refs/tags/v${NEXT}`]);
});
function drivePbta(world, topology) {
  const pbta = REPOSITORY["schema-pbta"];
  const sha = readRecord(world).presentation.repos.find((entry) => entry.repo === "schema-pbta").sha;
  const candidate = world.archive("schema-pbta", `v${NEXT}-rc.1`, bytesOf("schema-pbta"));
  const receipt = (0, import_path3.resolve)(world.tmp, "receipt", "candidate-digest.json");
  (0, import_fs3.mkdirSync)((0, import_path3.resolve)(world.tmp, "receipt"));
  (0, import_fs3.writeFileSync)(receipt, JSON.stringify({ protocol: 1, providerCommit: sha, version: NEXT, filename: `schema-pbta-${NEXT}.tgz`, sha256: candidate.sha256, integrity: candidate.integrity }));
  world.updateState((state) => {
    state.workflowEffects[`${pbta} release.yml`] = [
      { artifacts: [{ name: `schema-pbta-digest-${sha}`, file: receipt }] },
      { createRelease: world.release("schema-pbta", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-pbta")) },
      { createRelease: world.release("schema-pbta", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-pbta")) }
    ];
  });
  const result = publish(world, true, topology);
  return { pbta, sha, candidate, candidatePath: `release-train/candidates/schema-pbta-v${NEXT}-rc.1.json`, trainPath: `release-train/schema-pbta-v${NEXT}.json`, result };
}
scenario("publish --run takes schema-pbta through digest, stage, release-train and promote, landing its manifests and the adoption itself", (world) => {
  const topology = presentedTrain(world, ["schema-pbta"]);
  const { pbta, sha, candidate, candidatePath, trainPath: trainPath2, result } = drivePbta(world, topology);
  const output = ok(result, "publish --run");
  import_strict.default.match(output, /adopt the candidate v1\.1\.0-rc\.1 of schema-pbta in obsidian-handbook and lantern/);
  import_strict.default.match(output, /Every provider of train couleur-otherscape is published/);
  const head = ["-R", pbta, "--ref", "main"];
  import_strict.default.deepEqual(dispatches(world), [
    ["workflow", "run", "release.yml", ...head, "-f", "mode=digest", "-f", `provider_commit=${sha}`],
    ["workflow", "run", "release.yml", ...head, "-f", "mode=stage", "-f", `provider_commit=${sha}`, "-f", `config=${candidatePath}`],
    ["workflow", "run", "release-train.yml", ...head, "-f", `provider_commit=${sha}`, "-f", `config=${trainPath2}`],
    ["workflow", "run", "release.yml", ...head, "-f", "mode=promote", "-f", `provider_commit=${sha}`, "-f", `config=${trainPath2}`]
  ]);
  const candidateManifest = JSON.parse(originFile(world, "schema-pbta", candidatePath));
  import_strict.default.deepEqual(Object.keys(candidateManifest).sort(), ["candidate", "protocol"]);
  import_strict.default.equal(candidateManifest.candidate.sha256, candidate.sha256, "the receipt's candidate is not the one of its manifest");
  const train = JSON.parse(originFile(world, "schema-pbta", trainPath2));
  import_strict.default.deepEqual(train.consumers.map((consumer) => [consumer.role, consumer.path, consumer.proof.manifest]), [
    ["handbook", "handbook", "release-train.manifest.json"],
    ["lantern", "lantern", "release-train.manifest.json"]
  ]);
  for (const id of ["obsidian-handbook", "lantern"]) {
    const adoption = git(world.dir(id), "log", "--format=%s", "origin/main").split("\n");
    import_strict.default.ok(adoption.includes(`chore(deps): adopt schema-pbta v${NEXT}-rc.1`), `${id} did not adopt the candidate:
${adoption.join("\n")}`);
  }
  const record = readRecord(world).publication["schema-pbta"];
  import_strict.default.equal(record.final.tag, `v${NEXT}`);
  import_strict.default.equal(record.final.sha256, record.candidate.sha256);
  import_strict.default.deepEqual(record.runs.map((entry) => `${entry.step} ${entry.conclusion}`), ["digest success", "stage success", "release-train success", "promote success"]);
  import_strict.default.match(ok(publish(world, false), "the presentation still holds after the publication"), /Every provider of train couleur-otherscape is published/);
});
scenario("publish --run promotes schema-in-the-mist locally in its checkout, with the candidate's bytes", (world) => {
  const topology = presentedTrain(world, ["schema-in-the-mist"]);
  const { candidate, result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
  const output = ok(result, "publish --run");
  import_strict.default.match(output, /adopt the candidate v1\.1\.0-rc\.1 of schema-in-the-mist in obsidian-handbook and lantern/);
  import_strict.default.match(output, /Every provider of train couleur-otherscape is published/);
  const mistDir = world.dir("schema-in-the-mist");
  const evidence = (0, import_path3.resolve)(world.dir("obsidian-handbook"), "supervisor/trains", `${TRAIN_ID}.evidence`, `schema-in-the-mist-v${NEXT}.provenance.json`);
  const mistCalls = world.readState().localCalls.filter((call) => call.cwd === mistDir).map((call) => call.args);
  import_strict.default.deepEqual(mistCalls.slice(0, 2), [
    ["run", "release-train:assert", "--", `release-trains/v${NEXT}.json`, "--output", evidence],
    ["run", "release-train:promote", "--", `release-trains/v${NEXT}.json`, "--evidence", evidence]
  ]);
  import_strict.default.ok((0, import_fs3.existsSync)(evidence), "the provenance was not written");
  const record = readRecord(world).publication["schema-in-the-mist"];
  import_strict.default.equal(record.final.sha256, candidate.sha256);
  import_strict.default.deepEqual(record.runs.map((entry) => `${entry.step} ${entry.conclusion}`), ["candidate success", "assert success", "promote success"]);
  import_strict.default.deepEqual(dispatches(world).map((args) => args[2]), ["release-candidate.yml"]);
  const manifest = JSON.parse(firstVersion(world, "schema-in-the-mist", `release-trains/v${NEXT}.json`));
  import_strict.default.deepEqual(Object.keys(manifest).sort(), ["candidate", "consumers", "status"], "the manifest has keys the Mist validator refuses");
  import_strict.default.equal(manifest.status, "pending");
  import_strict.default.deepEqual(Object.keys(manifest.candidate).sort(), ["finalTag", "integrity", "packageName", "providerCommit", "releaseUrl", "sha256", "stagingTag"]);
  import_strict.default.deepEqual(manifest.consumers.map((consumer) => [consumer.role, consumer.repository, Object.keys(consumer).sort()]), [
    ["handbook", REPOSITORY["obsidian-handbook"], ["path", "proof", "ref", "repository", "role"]],
    ["lantern", REPOSITORY.lantern, ["path", "proof", "ref", "repository", "role"]]
  ]);
  for (const consumer of manifest.consumers) import_strict.default.deepEqual(consumer.proof, { interface: "npm-run-release-train-assert", manifest: "release-train/schema-in-the-mist.json" });
});
scenario("without a presentation that holds, publish --run dispatches nothing and runs nothing", (world) => {
  presentedTrain(world, ["schema-in-the-mist"], { present: false });
  let result = publish(world, true);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stderr, /train "couleur-otherscape" was never presented/);
  presentTrain(world, testTopology(world));
  const outside = world.land("schema-in-the-mist", { "src/late.ts": "export {};\n" }, "late change");
  result = publish(world, true);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.ok(result.stderr.includes(`commit ${outside.slice(0, 10)} changes src/late.ts, outside the train files`), result.stderr);
  import_strict.default.deepEqual(dispatches(world), []);
  import_strict.default.equal(world.readState().localCalls, void 0);
});
scenario("a consumer that fails with the candidate stops publish --run by name, its pins restored and nothing of it committed", (world) => {
  const topology = presentedTrain(world, ["schema-in-the-mist"]);
  const before = originMain(world, "lantern");
  world.updateState((state) => {
    state.localEffects = { "lantern install": [{ status: 4 }] };
  });
  const { result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stderr, /lantern does not pass with schema-in-the-mist v1\.1\.0-rc\.1: `pnpm install --frozen-lockfile` exited 4; its pins are restored and nothing of lantern was committed/);
  import_strict.default.equal(originMain(world, "lantern"), before, "lantern was pushed");
  import_strict.default.equal(git(world.dir("lantern"), "status", "--porcelain"), "", "the pins of lantern were not restored");
  import_strict.default.deepEqual(installs(world).filter((entry) => entry.startsWith("lantern ")), ["lantern install --frozen-lockfile", "lantern install --frozen-lockfile"], "the restored pins were not installed again");
  import_strict.default.equal(readRecord(world).publication["schema-in-the-mist"].final, void 0);
  import_strict.default.deepEqual(world.readState().localCalls.filter((call) => call.cwd === world.dir("schema-in-the-mist")), [], "the provider went on without its consumer");
});
scenario("after a failed release-train, publish resumes at the proof, pushes the final tag and follows the release it starts", (world) => {
  const topology = presentedTrain(world, ["schema-adrenaline"]);
  const adrenaline = REPOSITORY["schema-adrenaline"];
  world.updateState((state) => {
    state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
    state.workflowEffects[`${adrenaline} release-train.yml`] = [{ conclusion: "failure" }, {}];
    state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ repository: adrenaline, workflow: "release.yml", createRelease: world.release("schema-adrenaline", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-adrenaline")) }];
  });
  const failed = publish(world, true, topology);
  import_strict.default.equal(failed.status, 1, failed.stdout);
  import_strict.default.match(failed.stderr, /release-train\.yml run https:\/\/github\.com\/RebelliousSmile\/schema-adrenaline\/actions\/runs\/\d+ concluded failure/);
  for (const id of ["obsidian-handbook", "lantern"]) import_strict.default.equal(lastSubject(world, id), `chore(deps): adopt schema-adrenaline v${NEXT}-rc.1`);
  const trainPath2 = `release-train/schema-adrenaline-v${NEXT}.json`;
  const manifest = JSON.parse(originFile(world, "schema-adrenaline", trainPath2));
  import_strict.default.deepEqual(Object.keys(manifest).sort(), ["candidate", "consumers", "protocol"]);
  import_strict.default.deepEqual(Object.keys(manifest.candidate).sort(), ["finalTag", "integrity", "provider", "providerCommit", "releaseUrl", "sha256", "stagingTag", "version"]);
  import_strict.default.deepEqual(manifest.consumers.map((consumer) => Object.keys(consumer).sort().join(" ")), ["ref repository role", "ref repository role"]);
  const shown = ok(publish(world, false, topology), "publish after the failure");
  import_strict.default.ok(shown.includes(`$ gh workflow run release-train.yml -R ${adrenaline} --ref main -f manifest=${trainPath2}`), shown);
  const output = ok(publish(world, true, topology), "publish --run again");
  import_strict.default.ok(output.includes(`$ git push origin origin/main:refs/tags/v${NEXT}`), output);
  import_strict.default.match(output, /Every provider of train couleur-otherscape is published/);
  import_strict.default.notEqual(sh(world.dir("schema-adrenaline"), "git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/v${NEXT}`]).status, 2, "the final tag was not pushed");
  import_strict.default.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml", "release-train.yml"], "release.yml was dispatched on top of the run of the tag");
  const record = readRecord(world).publication["schema-adrenaline"];
  import_strict.default.deepEqual(record.runs.map((entry) => `${entry.step} ${entry.conclusion}`), ["candidate success", "release-train failure", "release-train success"]);
  import_strict.default.equal(record.final.sha256, record.candidate.sha256);
  const final = JSON.parse(originFile(world, "schema-adrenaline", `release-train/schema-adrenaline-v${NEXT}-final.json`));
  import_strict.default.equal(final.protocol, 2);
  import_strict.default.equal(final.artifact.releaseUrl, world.archive("schema-adrenaline", `v${NEXT}`).url);
  import_strict.default.deepEqual(final.consumers.map((consumer) => [consumer.role, consumer.ref]), [["handbook", originMain(world, "obsidian-handbook")], ["lantern", originMain(world, "lantern")]]);
  import_strict.default.deepEqual(world.readState().localCalls.filter((call) => call.cwd === world.dir("schema-adrenaline")).map((call) => call.args), [["run", "release-train:verify-final"]]);
  import_strict.default.equal(readRecord(world).convergence.status, "passed");
});
scenario("a dispatched run held by reviewers stops publish at once; run again, the same run is taken up and nothing is dispatched twice", (world) => {
  const topology = presentedTrain(world, ["schema-adrenaline"]);
  const adrenaline = REPOSITORY["schema-adrenaline"];
  world.updateState((state) => {
    state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ status: "waiting" }];
  });
  const held = publish(world, true, topology);
  import_strict.default.equal(held.status, 1, held.stdout);
  import_strict.default.match(held.stderr, /run https:\/\/github\.com\/RebelliousSmile\/schema-adrenaline\/actions\/runs\/\d+ is waiting: the release environment still has required reviewers; remove them, then run the command again: pnpm supervise publish --run/);
  import_strict.default.deepEqual(readRecord(world).publication["schema-adrenaline"].runs.map((entry) => `${entry.step} ${entry.conclusion}`), ["candidate null"]);
  world.updateState((state) => {
    state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
    state.workflowEffects[`${adrenaline} release-train.yml`] = [{ status: "in_progress" }, { conclusion: "failure" }];
  });
  const failed = publish(world, true, topology);
  import_strict.default.equal(failed.status, 1, failed.stdout);
  import_strict.default.match(failed.stderr, /release-train\.yml run \S+ concluded failure/);
  import_strict.default.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml"], "a run was dispatched a second time");
  import_strict.default.deepEqual(readRecord(world).publication["schema-adrenaline"].runs.map((entry) => `${entry.step} ${entry.conclusion}`), ["candidate success", "release-train failure"]);
});
scenario("the release run of the final tag held by reviewers stops publish at once; once it completes, publish observes the final without dispatching release.yml", (world) => {
  const topology = presentedTrain(world, ["schema-adrenaline"]);
  const adrenaline = REPOSITORY["schema-adrenaline"];
  world.updateState((state) => {
    state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
    state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ repository: adrenaline, workflow: "release.yml", status: "waiting" }];
  });
  const held = publish(world, true, topology);
  import_strict.default.equal(held.status, 1, held.stdout);
  import_strict.default.ok(held.stdout.includes(`$ git push origin origin/main:refs/tags/v${NEXT}`), held.stdout);
  import_strict.default.match(held.stderr, /run \S+ is waiting: the release environment still has required reviewers; remove them/);
  import_strict.default.equal(readRecord(world).publication["schema-adrenaline"].final, void 0);
  world.updateState((state) => {
    state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-adrenaline")) }];
  });
  const output = ok(publish(world, true, topology), "publish --run once the run is released");
  import_strict.default.match(output, /Every provider of train couleur-otherscape is published/);
  import_strict.default.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml"], "release.yml was dispatched on top of the run of the tag");
  import_strict.default.equal(git(world.dir("schema-adrenaline"), "ls-remote", "--tags", "origin", `refs/tags/v${NEXT}`).split("\n").length, 1);
  const record = readRecord(world).publication["schema-adrenaline"];
  import_strict.default.equal(record.final.sha256, record.candidate.sha256);
});
scenario("a run that never completes stops its watch at the limit, naming its last status, its URL and the command that follows it again", (world) => {
  const adrenaline = REPOSITORY["schema-adrenaline"];
  const url = `https://github.com/${adrenaline}/actions/runs/1000`;
  world.updateState((state) => {
    state.runs = { ...state.runs, [adrenaline]: [{ databaseId: 1e3, workflowName: "release.yml", headBranch: `v${NEXT}`, status: "in_progress", conclusion: null, url }] };
  });
  const probe = [
    "const [repository, url] = process.argv.slice(1);",
    "const { followRun } = await import('./tools/supervisor/publish.mjs');",
    "try {",
    "	console.log(`completed ${followRun({ repository }, { id: 1000, url }, 'pnpm supervise publish --run', { watchMs: 10, limitMs: 60 })}`);",
    "} catch (error) {",
    "	console.log(error.message);",
    "}"
  ].join("\n");
  const message = ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, adrenaline, url], world.env()), "watch probe");
  import_strict.default.ok(message.includes(`run ${url} did not complete within`), message);
  import_strict.default.ok(message.includes("its last status was in_progress; nothing was dispatched again, follow it with: pnpm supervise publish --run"), message);
  import_strict.default.deepEqual(dispatches(world), []);
});
scenario("a missing RELEASE_TOKEN on schema-pbta stops publish --run before any dispatch, by name", (world) => {
  presentedTrain(world, ["schema-pbta"], { secrets: false });
  const result = publish(world, true);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stderr, /RebelliousSmile\/schema-pbta lacks the secret RELEASE_TOKEN that release\.yml reads; nothing was run/);
  import_strict.default.deepEqual(dispatches(world), []);
});
scenario("inputs a workflow does not declare stop publish before anything is dispatched", (world) => {
  presentedTrain(world, ["schema-adrenaline"], {
    before: () => {
      world.land("schema-adrenaline", { ".github/workflows/publish-candidate.yml": "on:\n  workflow_dispatch:\n    inputs:\n      version:\n        required: true\n" }, "Rename the input");
    }
  });
  const result = publish(world, true);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stderr, /publish-candidate\.yml: input tag is not declared; required input version is missing/);
  import_strict.default.deepEqual(dispatches(world), []);
});
scenario("a final whose bytes differ from the candidate stops publish, naming both digests", (world) => {
  const topology = presentedTrain(world, ["schema-in-the-mist"]);
  const { candidate, result } = driveMist(world, bytesOf("schema-in-the-mist", " rebuilt"), topology);
  const final = world.archive("schema-in-the-mist", `v${NEXT}`);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.ok(result.stderr.includes(final.sha256) && result.stderr.includes(candidate.sha256), result.stderr);
  import_strict.default.notEqual(final.sha256, candidate.sha256);
  import_strict.default.equal(readRecord(world).publication["schema-in-the-mist"].final, void 0, "a final with other bytes was recorded");
  const again = publish(world, false, topology);
  import_strict.default.equal(again.status, 1, "a second look must stop the same way");
});
scenario("with two providers, publish --run finishes the first one of the train before it starts the second", (world) => {
  const topology = presentedTrain(world, ["schema-in-the-mist", "schema-adrenaline"]);
  world.updateState((state) => {
    state.workflowEffects[`${REPOSITORY["schema-adrenaline"]} publish-candidate.yml`] = [{ conclusion: "failure" }];
  });
  const { result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stderr, /publish-candidate\.yml run \S+ concluded failure/);
  import_strict.default.deepEqual(dispatches(world).map((args) => `${args[4]} ${args[2]}`), [`${REPOSITORY["schema-in-the-mist"]} release-candidate.yml`, `${REPOSITORY["schema-adrenaline"]} publish-candidate.yml`]);
  import_strict.default.equal(readRecord(world).publication["schema-in-the-mist"].final.tag, `v${NEXT}`);
  import_strict.default.equal(readRecord(world).publication["schema-adrenaline"].final, void 0);
});
var FAIL = nodeCommand("console.error('pins do not converge'); process.exit(3)");
function converge(world, topology) {
  return world.supervise(["converge"], { topology });
}
function close(world, topology, run) {
  return world.supervise(run ? ["close", "--run"] : ["close"], { topology });
}
function coordinationIssue(world) {
  const { repo, number } = readRecord(world).coordinationIssue;
  return world.readState().issues[REPOSITORY[repo]][number];
}
function issueCalls(world) {
  return world.readState().calls.filter((call) => call.args[0] === "issue" && (call.args[1] === "close" || call.args[1] === "comment")).map((call) => `${call.args[1]} ${call.args[4]}#${call.args[2]}`);
}
function releaseConsumer(world, id, version) {
  const manifest = JSON.parse((0, import_fs3.readFileSync)((0, import_path3.resolve)(world.dir(id), "package.json"), "utf8"));
  const commit2 = world.landFiles(id, { "package.json": `${JSON.stringify({ ...manifest, version }, null, "	")}
` }, `Release ${version}`);
  git(world.dir(id), "tag", `v${version}`, commit2);
  git(world.dir(id), "push", "--quiet", "origin", `v${version}`);
  world.updateState((state) => {
    state.releases[REPOSITORY[id]] = [{ tagName: `v${version}`, isPrerelease: false, isDraft: false, publishedAt: "2026-09-29T12:00:00Z", assets: [] }, ...state.releases[REPOSITORY[id]] ?? []];
  });
  return commit2;
}
function pbtaOnFinal(world, options = {}) {
  const presented = presentedTrain(world, ["schema-pbta"]);
  const topology = options.convergence ? testTopology(world, {}, options.convergence, "converge-topology.json") : presented;
  const { candidate, result } = drivePbta(world, topology);
  const final = world.archive("schema-pbta", `v${NEXT}`);
  return { topology, candidate, final, result };
}
scenario("converge names each consumer that does not pin the final, with both URLs, and close refuses the unproven train", (world) => {
  const { topology, candidate, final, result } = pbtaOnFinal(world);
  ok(result, "publish --run");
  adopt(world, "schema-pbta", candidate, final);
  const refusedConvergence = converge(world, topology);
  import_strict.default.equal(refusedConvergence.status, 1, refusedConvergence.stdout);
  for (const consumer of ["obsidian-handbook", "lantern"]) {
    import_strict.default.ok(refusedConvergence.stdout.includes(`${consumer}: package.json pins ${candidate.url}`), refusedConvergence.stdout);
  }
  import_strict.default.ok(refusedConvergence.stdout.includes(`the final is ${final.url}`), refusedConvergence.stdout);
  import_strict.default.equal(readRecord(world).convergence.status, "failed");
  import_strict.default.equal(readRecord(world).convergence.checks.length, 0, "a check ran before the pins converged");
  const refused = close(world, topology, true);
  import_strict.default.equal(refused.status, 1, refused.stdout);
  import_strict.default.match(refused.stderr, /convergence of train "couleur-otherscape" failed; run supervise converge first; nothing was closed/);
  import_strict.default.equal(coordinationIssue(world).state, "OPEN");
  import_strict.default.deepEqual(issueCalls(world), []);
  import_strict.default.equal(readRecord(world).status, "open");
});
scenario("publish --run converges by itself: each consumer adopts the final, every check runs behind the guard, and schema-pbta has no tool of its own", (world) => {
  const { final, result } = pbtaOnFinal(world);
  const output = ok(result, "publish --run");
  import_strict.default.match(output, /Every consumer pins every final on origin\/main: schema-pbta v1\.1\.0/);
  import_strict.default.match(output, /Next: pnpm supervise release --run, then pnpm supervise close --run\./);
  for (const id of ["obsidian-handbook", "lantern"]) {
    import_strict.default.ok(originFile(world, id, "package.json").includes(final.url), `${id} does not pin the final`);
  }
  import_strict.default.equal(lastSubject(world, "obsidian-handbook"), `chore(deps): adopt schema-pbta v${NEXT}`);
  import_strict.default.equal(lastSubject(world, "lantern"), `chore(release-train): register schema-pbta v${NEXT}`);
  const matrix = JSON.parse(originFile(world, "lantern", "release-train.matrix.json"));
  const head = originMain(world, "schema-pbta");
  import_strict.default.equal(matrix.handbook.ref, originMain(world, "obsidian-handbook"), "the registry does not read the Handbook that pins the final");
  const pbtaEntry = matrix.providers.find((entry) => entry.provider === "schema-pbta");
  import_strict.default.equal(pbtaEntry.ref, head, "the registry does not read schema-pbta where its manifest is");
  import_strict.default.deepEqual(pbtaEntry.manifests.map((manifest) => `${manifest.path} ${manifest.validatorRef}`), [`release-train/earlier.json ${"0".repeat(40)}`, `release-train/schema-pbta-v${NEXT}.json ${head}`]);
  import_strict.default.ok(matrix.providers.filter((entry) => entry.provider !== "schema-pbta").every((entry) => entry.ref === "0".repeat(40)), "a provider outside the train moved");
  import_strict.default.ok(originFile(world, "lantern", "release-train.matrix.json").startsWith('{\n    "protocol": 1,'), "the registry lost its layout");
  const installed = (id) => `${(0, import_path3.basename)(world.dir(id))} install --frozen-lockfile`;
  import_strict.default.deepEqual(installs(world).sort(), [installed("lantern"), installed("lantern"), installed("obsidian-handbook"), installed("obsidian-handbook")].sort(), "each consumer installs the candidate, then the final");
  const convergence = readRecord(world).convergence;
  import_strict.default.equal(convergence.status, "passed");
  import_strict.default.deepEqual(convergence.checks.map((check) => `${check.repo} ${check.status}`).sort(), ["lantern 0", "obsidian-handbook 0"]);
  import_strict.default.deepEqual(convergence.repos.map((entry) => entry.repo).sort(), ["lantern", "obsidian-handbook", "schema-pbta"]);
  for (const entry of convergence.repos) import_strict.default.equal(entry.sha, git(world.dir(entry.repo), "rev-parse", "origin/main"));
  import_strict.default.ok(convergence.notes.some((note) => note.startsWith("schema-pbta: no convergence tool of its own")), convergence.notes.join("\n"));
  import_strict.default.equal(dispatches(world).length, 4, "converge dispatched a workflow");
  import_strict.default.match(ok(publish(world, false), "adopting the final keeps the presentation"), /Every provider of train couleur-otherscape is published/);
});
scenario("a failing consumer check or a consumer without convergence command fails the convergence, by name", (world) => {
  const { result } = pbtaOnFinal(world, { convergence: { lantern: [FAIL], "obsidian-handbook": null } });
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.ok(result.stdout.includes(`failed (exit 3): lantern: ${FAIL.join(" ")}`), result.stdout);
  import_strict.default.match(result.stdout, /pins do not converge/);
  import_strict.default.match(result.stdout, /note: obsidian-handbook: no convergence command is configured in the topology/);
  import_strict.default.equal(readRecord(world).convergence.status, "failed");
});
scenario("close refuses a consumer that was not released, naming it, and closes nothing", (world) => {
  const { topology, result } = pbtaOnFinal(world);
  ok(result, "publish --run");
  let refused = close(world, topology, true);
  import_strict.default.equal(refused.status, 1, refused.stdout);
  import_strict.default.match(refused.stderr, /lantern: the release v1\.0\.0 of RebelliousSmile\/lantern does not exist on GitHub; run supervise release --run first/);
  releaseConsumer(world, "lantern", "1.1.0");
  world.updateState((state) => {
    state.releases[REPOSITORY.lantern] = state.releases[REPOSITORY.lantern].filter((release2) => release2.tagName !== "v1.1.0");
  });
  refused = close(world, topology, true);
  import_strict.default.equal(refused.status, 1, refused.stdout);
  import_strict.default.match(refused.stderr, /lantern: the release v1\.1\.0 of RebelliousSmile\/lantern does not exist on GitHub/);
  import_strict.default.match(refused.stderr, /obsidian-handbook: the release v1\.0\.0 of RebelliousSmile\/obsidian-handbook does not exist on GitHub/);
  import_strict.default.deepEqual(issueCalls(world), []);
  import_strict.default.equal(coordinationIssue(world).state, "OPEN");
  import_strict.default.equal(readRecord(world).status, "open");
});
scenario("close --run records the consumer releases, comments every item and closes the coordination issue last", (world) => {
  const { topology, final, result } = pbtaOnFinal(world);
  ok(result, "publish --run");
  const lantern = releaseConsumer(world, "lantern", "1.1.0");
  const handbook = releaseConsumer(world, "obsidian-handbook", "1.0.1");
  const dry = ok(close(world, topology, false), "close");
  import_strict.default.match(dry, /Nothing was closed/);
  import_strict.default.deepEqual(issueCalls(world), []);
  ok(close(world, topology, true), "close --run");
  const record = readRecord(world);
  import_strict.default.equal(record.status, "closed");
  import_strict.default.ok(record.closedAt);
  import_strict.default.deepEqual(record.consumerReleases, [
    { repo: "lantern", version: "1.1.0", tag: "v1.1.0", sha: lantern, url: `https://github.com/${REPOSITORY.lantern}/releases/tag/v1.1.0` },
    { repo: "obsidian-handbook", version: "1.0.1", tag: "v1.0.1", sha: handbook, url: `https://github.com/${REPOSITORY["obsidian-handbook"]}/releases/tag/v1.0.1` }
  ]);
  const coordination = `${REPOSITORY[record.coordinationIssue.repo]}#${record.coordinationIssue.number}`;
  const calls = issueCalls(world);
  import_strict.default.equal(calls[calls.length - 1], `close ${coordination}`, calls.join("\n"));
  import_strict.default.deepEqual(calls.slice(0, -1).sort(), [`comment ${REPOSITORY["schema-pbta"]}#50`, `comment ${REPOSITORY["obsidian-handbook"]}#12`, `comment ${REPOSITORY.lantern}#40`].sort());
  const comment = coordinationIssue(world).comments.at(-1);
  for (const expected of [final.url, final.sha256, `https://github.com/${REPOSITORY.lantern}/releases/tag/v1.1.0`, "Convergence passed"]) import_strict.default.ok(comment.includes(expected), comment);
  const again = close(world, topology, true);
  import_strict.default.notEqual(again.status, 0, "a closed train was closed again");
  import_strict.default.match(again.stderr, /no open train/);
});
function release(world, topology, run) {
  return world.supervise(run ? ["release", "--run"] : ["release"], { topology });
}
function published(tag) {
  return { tagName: tag, isPrerelease: false, isDraft: false, publishedAt: "2026-09-29T12:00:00Z", assets: [] };
}
function consumerEffects(world, outcome = {}) {
  world.updateState((state) => {
    state.tagEffects = { ...state.tagEffects ?? {}, [`${(0, import_path3.basename)(world.dir("lantern"))} v1.0.0`]: [{ repository: REPOSITORY.lantern, workflow: "release.yml", createRelease: published("v1.0.0"), ...outcome.lantern }] };
    state.workflowEffects[`${REPOSITORY["obsidian-handbook"]} release.yml`] = (outcome.handbook ?? [{}]).map((effect) => ({ createRelease: published("v1.0.0"), ...effect }));
  });
}
function remoteTag(world, id, tag) {
  return git(world.dir(id), "ls-remote", "origin", `refs/tags/${tag}`).split(/\s+/)[0];
}
function tagPushes(world) {
  return world.gitCalls().filter((line) => line.startsWith("push") && line.includes("origin/main:refs/tags/v1.0.0"));
}
function handbookDispatches(world) {
  return dispatches(world, "release.yml").filter((args) => args.includes(REPOSITORY["obsidian-handbook"]));
}
scenario("release shows the next step and runs nothing; release --run publishes Lantern then Handbook, records both, and releases nothing twice", (world) => {
  const { topology, result } = pbtaOnFinal(world);
  ok(result, "publish --run");
  consumerEffects(world);
  const dry = ok(release(world, topology, false), "release");
  import_strict.default.ok(dry.includes("Next step for lantern: tag origin/main as v1.0.0"), dry);
  import_strict.default.ok(dry.includes("$ git push origin origin/main:refs/tags/v1.0.0"), dry);
  import_strict.default.match(dry, /Nothing was run\. Run it with: pnpm supervise release --run/);
  import_strict.default.deepEqual(tagPushes(world), []);
  import_strict.default.equal(remoteTag(world, "lantern", "v1.0.0"), "");
  import_strict.default.equal(readRecord(world).consumerReleases, void 0);
  const output = ok(release(world, topology, true), "release --run");
  import_strict.default.ok(output.indexOf("lantern: v1.0.0 already released") < output.indexOf("Next step for obsidian-handbook: tag origin/main as v1.0.0"), output);
  import_strict.default.ok(output.indexOf("lantern: v1.0.0 already released") > 0, output);
  import_strict.default.match(output, /Every consumer of train couleur-otherscape is released\. Next: pnpm supervise close --run/);
  const repository = REPOSITORY["obsidian-handbook"];
  import_strict.default.deepEqual(handbookDispatches(world), [["workflow", "run", "release.yml", "-R", repository, "--ref", "v1.0.0"]]);
  import_strict.default.equal(tagPushes(world).length, 2);
  import_strict.default.deepEqual(readRecord(world).consumerReleases, [
    { repo: "lantern", version: "1.0.0", tag: "v1.0.0", sha: originMain(world, "lantern"), url: `https://github.com/${REPOSITORY.lantern}/releases/tag/v1.0.0` },
    { repo: "obsidian-handbook", version: "1.0.0", tag: "v1.0.0", sha: originMain(world, "obsidian-handbook"), url: `https://github.com/${repository}/releases/tag/v1.0.0` }
  ]);
  import_strict.default.equal(remoteTag(world, "lantern", "v1.0.0"), originMain(world, "lantern"));
  const again = ok(release(world, topology, true), "release --run again");
  import_strict.default.match(again, /lantern: v1\.0\.0 already released/);
  import_strict.default.match(again, /obsidian-handbook: v1\.0\.0 already released/);
  import_strict.default.equal(tagPushes(world).length, 2, "a tag was pushed again");
  import_strict.default.equal(handbookDispatches(world).length, 1, "a release was dispatched again");
  ok(close(world, topology, true), "close --run");
  import_strict.default.equal(readRecord(world).status, "closed");
});
scenario("a consumer whose version is already released makes the train not presentable, by repository and version", (world) => {
  const topology = presentedTrain(world, ["schema-pbta"], {
    present: false,
    before: () => world.updateState((state) => {
      state.releases[REPOSITORY.lantern] = [published("v1.0.0")];
    })
  });
  const result = world.supervise(["present"], { topology });
  import_strict.default.equal(result.status, 1, result.stderr);
  import_strict.default.match(result.stdout, /\*\*Not presentable\*\*/);
  import_strict.default.match(result.stdout, /lantern: package\.json is at 1\.0\.0 and the release v1\.0\.0 of RebelliousSmile\/lantern already exists; prepare a new version with the change/);
  import_strict.default.doesNotMatch(result.stdout, /obsidian-handbook: package\.json is at/);
});
scenario("release refuses a train that did not converge and sends back to converge", (world) => {
  const { topology, result } = pbtaOnFinal(world, { convergence: { lantern: [FAIL] } });
  import_strict.default.equal(result.status, 1, result.stdout);
  consumerEffects(world);
  const refused = release(world, topology, true);
  import_strict.default.equal(refused.status, 1, refused.stdout);
  import_strict.default.match(refused.stderr, /release: the convergence of train "couleur-otherscape" failed; run supervise converge first; nothing was released/);
  import_strict.default.deepEqual(tagPushes(world), []);
});
scenario("a red release stops release --run with the URL of its run, before the next consumer, and its tag is never pushed twice", (world) => {
  const { topology, result } = pbtaOnFinal(world);
  ok(result, "publish --run");
  consumerEffects(world, { lantern: { conclusion: "failure" } });
  const red = release(world, topology, true);
  import_strict.default.equal(red.status, 1, red.stdout);
  import_strict.default.match(red.stderr, /release: lantern: run https:\/\/github\.com\/RebelliousSmile\/lantern\/actions\/runs\/\d+ concluded failure/);
  import_strict.default.equal(remoteTag(world, "obsidian-handbook", "v1.0.0"), "", "Handbook was tagged after a red Lantern release");
  import_strict.default.deepEqual(handbookDispatches(world), []);
  import_strict.default.equal(readRecord(world).consumerReleases, void 0);
  const again = release(world, topology, true);
  import_strict.default.equal(again.status, 1, again.stdout);
  import_strict.default.match(again.stderr, /release: lantern: run https:\/\/github\.com\/RebelliousSmile\/lantern\/actions\/runs\/\d+ concluded failure; release\.yml starts on the push of v1\.0\.0 and a tag is not pushed twice/);
  import_strict.default.equal(tagPushes(world).length, 1, "the tag of Lantern was pushed again");
});
scenario("a tag left without release nor run: Lantern is named and not tagged again, Handbook is dispatched on its tag", (world) => {
  const { topology, result } = pbtaOnFinal(world);
  ok(result, "publish --run");
  for (const id of ["lantern", "obsidian-handbook"]) {
    git(world.dir(id), "tag", "v1.0.0", originMain(world, id));
    git(world.dir(id), "push", "--quiet", "origin", "v1.0.0");
  }
  consumerEffects(world);
  const named = release(world, topology, true);
  import_strict.default.equal(named.status, 1, named.stdout);
  import_strict.default.match(named.stderr, /release: lantern: the tag v1\.0\.0 is on origin with no release and no release\.yml run; release\.yml starts on the push of the tag and a tag is not pushed twice: delete the tag by hand/);
  import_strict.default.deepEqual(handbookDispatches(world), []);
  world.updateState((state) => {
    state.releases[REPOSITORY.lantern] = [published("v1.0.0")];
  });
  const output = ok(release(world, topology, true), "release --run");
  import_strict.default.match(output, /lantern: v1\.0\.0 already released/);
  import_strict.default.ok(output.includes(`$ gh workflow run release.yml -R ${REPOSITORY["obsidian-handbook"]} --ref v1.0.0`), output);
  import_strict.default.equal(handbookDispatches(world).length, 1);
  import_strict.default.deepEqual(tagPushes(world), [], "the supervisor pushed a tag that was already on origin");
  import_strict.default.deepEqual(readRecord(world).consumerReleases.map((entry) => entry.repo), ["lantern", "obsidian-handbook"]);
});
scenario("after a partial release the train is presented again: the release it recorded is not a refusal, and the red one is dispatched again", (world) => {
  const { topology, result } = pbtaOnFinal(world);
  ok(result, "publish --run");
  consumerEffects(world, { handbook: [{ conclusion: "failure" }, {}] });
  const red = release(world, topology, true);
  import_strict.default.equal(red.status, 1, red.stdout);
  import_strict.default.match(red.stderr, /release: obsidian-handbook: run https:\/\/github\.com\/RebelliousSmile\/obsidian-handbook\/actions\/runs\/\d+ concluded failure/);
  import_strict.default.deepEqual(readRecord(world).consumerReleases.map((entry) => entry.repo), ["lantern"]);
  const presented = ok(world.supervise(["present"], { topology }), "present after a partial release");
  import_strict.default.match(presented, /\*\*Presentable\.\*\*/);
  ok(release(world, topology, true), "release --run after the red run");
  import_strict.default.equal(handbookDispatches(world).length, 2);
  import_strict.default.equal(tagPushes(world).length, 2, "a tag was pushed again");
  import_strict.default.deepEqual(readRecord(world).consumerReleases.map((entry) => entry.repo), ["lantern", "obsidian-handbook"]);
});
scenario("publish --run completes the schema-in-the-mist manifest, lands its convergence file and validates it", (world) => {
  const topology = presentedTrain(world, ["schema-in-the-mist"]);
  const { result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
  ok(result, "publish --run");
  const mist = world.dir("schema-in-the-mist");
  const path = `release-trains/v${NEXT}.json`;
  const manifest = JSON.parse(originFile(world, "schema-in-the-mist", path));
  import_strict.default.equal(manifest.status, "completed");
  import_strict.default.equal(manifest.final.releaseUrl, world.archive("schema-in-the-mist", `v${NEXT}`).url);
  import_strict.default.deepEqual(manifest.final.consumers.map((consumer) => [consumer.role, consumer.ref]), [["handbook", originMain(world, "obsidian-handbook")], ["lantern", originMain(world, "lantern")]]);
  const evidencePath = `release-trains/v${NEXT}.convergence.json`;
  import_strict.default.equal(originFile(world, "schema-in-the-mist", evidencePath), '{"converged": true}');
  import_strict.default.equal(git(mist, "status", "--porcelain"), "", "the checkout of schema-in-the-mist is left dirty");
  const evidence = (0, import_path3.resolve)(world.dir("obsidian-handbook"), "supervisor/trains", `${TRAIN_ID}.evidence`, `schema-in-the-mist-v${NEXT}.provenance.json`);
  import_strict.default.deepEqual(world.readState().localCalls.filter((call) => call.cwd === mist).slice(2).map((call) => call.args), [
    ["run", "release-train:converge", "--", path, "--candidate-evidence", evidence],
    ["run", "release-train:validate", "--", "--require-complete", `v${NEXT}`]
  ]);
  import_strict.default.equal(readRecord(world).convergence.status, "passed");
  import_strict.default.match(ok(publish(world, false), "the provider's train files keep the presentation"), /Every provider of train couleur-otherscape is published/);
});
scenario("the convergence step of each provider is pure: it lands what is missing and leaves a person only what it cannot know", () => {
  const repo = (id) => TOPOLOGY.repos.find((entry) => entry.id === id);
  const record = { protocol: 2, artifact: { provider: "schema-adrenaline", releaseUrl: "https://github.com/o/r/releases/download/v1.1.0/p.tgz", sha256: "a".repeat(64), integrity: "sha512-x", version: NEXT }, consumers: [{ role: "handbook", repository: "o/h", ref: "c".repeat(40) }] };
  const expectedFinal = { releaseUrl: record.artifact.releaseUrl, sha256: record.artifact.sha256, integrity: "sha512-x", consumers: record.consumers };
  const mist = { repo: repo("schema-in-the-mist"), finalTag: `v${NEXT}`, trainPath: "release-trains/v1.1.0.json", convergencePath: "release-trains/v1.1.0.convergence.json", finalProblem: null, expectedFinal, manifest: null, convergenceCommitted: true, convergenceWritten: null, provenance: "/p.json", provenanceKept: true };
  const pending = { status: "pending", candidate: { packageName: "schema-in-the-mist" }, consumers: [] };
  const observations = [
    ["adrenaline", { repo: repo("schema-adrenaline"), finalTag: `v${NEXT}`, recordPath: "release-train/schema-adrenaline-v1.1.0-final.json", recordProblem: "is not on origin/main", expectedRecord: record }],
    ["adrenaline", { repo: repo("schema-adrenaline"), finalTag: `v${NEXT}`, recordPath: "release-train/schema-adrenaline-v1.1.0-final.json", recordProblem: null, expectedRecord: record }],
    ["mist", { ...mist, finalProblem: "is not on origin/main" }],
    ["mist", { ...mist, finalProblem: "has status pending, not completed", manifest: pending }],
    ["mist", { ...mist, convergenceCommitted: false, convergenceWritten: '{"converged": true}\n' }],
    ["mist", { ...mist, convergenceCommitted: false, provenanceKept: false }],
    ["mist", { ...mist, convergenceCommitted: false }],
    ["mist", mist],
    ["pbta", { repo: repo("schema-pbta"), finalTag: `v${NEXT}` }]
  ];
  const probe = [
    "const observations = JSON.parse(process.argv[1]);",
    "const results = [];",
    "for (const [name, observation] of observations) {",
    "	const adapter = await import(`./tools/supervisor/adapters/${name}.mjs`);",
    "	results.push(adapter.convergence(observation));",
    "}",
    "console.log(JSON.stringify(results));"
  ].join("\n");
  const steps = JSON.parse(ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, JSON.stringify(observations)]), "convergence probe"));
  import_strict.default.deepEqual(steps.map((step) => step.kind), ["automated", "checks", "human", "automated", "automated", "human", "automated", "checks", "checks"]);
  import_strict.default.equal(steps[0].type, "land");
  import_strict.default.deepEqual(JSON.parse(steps[0].files[observations[0][1].recordPath]), record, "the adrenaline record is not landed exactly");
  import_strict.default.deepEqual(steps[1].commands, [["npm", "run", "release-train:verify-final"]]);
  import_strict.default.match(steps[2].instruction, /must be on origin\/main before its final block/);
  const completed = JSON.parse(steps[3].files[mist.trainPath]);
  import_strict.default.equal(completed.status, "completed");
  import_strict.default.deepEqual(completed.final, expectedFinal);
  import_strict.default.deepEqual(completed.candidate, pending.candidate, "completing the manifest changed its candidate");
  import_strict.default.deepEqual(steps[4].files, { [mist.convergencePath]: '{"converged": true}\n' });
  import_strict.default.match(steps[5].instruction, /provenance of the promotion is missing/);
  import_strict.default.deepEqual(steps[6].command, ["npm", "run", "release-train:converge", "--", "release-trains/v1.1.0.json", "--candidate-evidence", "/p.json"]);
  import_strict.default.deepEqual(steps[7].commands, [["npm", "run", "release-train:validate", "--", "--require-complete", "v1.1.0"]]);
  import_strict.default.deepEqual(steps[8].commands, []);
  import_strict.default.match(steps[8].notes[0], /^schema-pbta: no convergence tool of its own/);
});
scenario("preview plans from what the train's providers publish, and installs their packs without touching data.json", (world) => {
  const topology = testTopology(world);
  doneTrain(world);
  const mist = world.dir("schema-in-the-mist");
  world.write("schema-in-the-mist", {
    "package.json": `${JSON.stringify({ name: "schema-in-the-mist", version: "1.0.0", scripts: { build: "tsc" }, exports: { ".": "./dist/index.js", "./presentation": { import: "./dist/presentation.js" }, "./handbook/*": "./handbook/*" } }, null, "	")}
`,
    "handbook.json": JSON.stringify({ repository: REPOSITORY["schema-in-the-mist"], packs: [{ id: "mist", version: "1.1.0", path: "handbook/mist/pack.json" }] }),
    "handbook/mist/pack.json": JSON.stringify({ version: "1.1.0", pack: { id: "mist" } }),
    "handbook/mist/assets/grain.webp": "grain"
  });
  world.write("obsidian-handbook", { "manifest.json": '{"id": "obsidian-handbook", "version": "1.0.0"}\n' });
  world.write("lantern", { "vite.config.ts": "export default {};\n" });
  const vault = (0, import_path3.resolve)(world.tmp, "vault");
  const pluginDir = (0, import_path3.resolve)(vault, ".obsidian/plugins/obsidian-handbook");
  (0, import_fs3.mkdirSync)(pluginDir, { recursive: true });
  const sourceId = REPOSITORY["schema-in-the-mist"].toLowerCase().replace("/", "--");
  const settings = `${JSON.stringify({ schemaSources: [{ id: sourceId, reference: { kind: "tag", value: "v1.0.0" } }] })}
`;
  (0, import_fs3.writeFileSync)((0, import_path3.resolve)(pluginDir, "data.json"), settings);
  (0, import_fs3.writeFileSync)((0, import_path3.resolve)(pluginDir, "manifest.json"), "{}\n");
  const probe = [
    "const [root, topologyFile, trainFile, vault] = process.argv.slice(1);",
    "const { readFileSync } = await import('node:fs');",
    "const { planPreview, installSources } = await import('./tools/supervisor/preview.mjs');",
    "const read = (file) => JSON.parse(readFileSync(file, 'utf8'));",
    "const plan = planPreview(root, read(topologyFile), read(trainFile), { vaults: [vault] });",
    "const lines = installSources(plan, new Date(0));",
    "const resolveAlias = (aliases, spec) => { const alias = aliases.find(({ find }) => new RegExp(find).test(spec)); return alias ? spec.replace(new RegExp(alias.find), alias.replacement) : null; };",
    "const specs = ['schema-in-the-mist', 'schema-in-the-mist/presentation', 'schema-in-the-mist/handbook/mist/assets/grain.webp?url&no-inline', 'schema-in-the-mist-other'];",
    "console.log(JSON.stringify({ plan, lines, resolved: specs.map((spec) => resolveAlias(plan.handbook.aliases, spec)) }));"
  ].join("\n");
  const { plan, lines, resolved } = JSON.parse(ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, world.root, topology, trainPath(world), vault]), "preview probe"));
  const slash = (path) => path.split("\\").join("/");
  import_strict.default.deepEqual(plan.packages.map((entry) => entry.repo), ["schema-in-the-mist"], "only the train's providers are packages");
  import_strict.default.deepEqual(plan.builds.map((entry) => entry.repo), ["schema-in-the-mist"]);
  import_strict.default.deepEqual(plan.consumers.map((entry) => [entry.repo, entry.packages]), [["lantern", ["schema-in-the-mist"]]]);
  import_strict.default.equal(slash(resolved[0]), `${slash(mist)}/dist/index.js`);
  import_strict.default.equal(slash(resolved[1]), `${slash(mist)}/dist/presentation.js`);
  import_strict.default.equal(slash(resolved[2]), `${slash(mist)}/handbook/mist/assets/grain.webp?url&no-inline`, "the query is lost");
  import_strict.default.equal(resolved[3], null, "a longer package name was captured");
  const sourceDir = (0, import_path3.resolve)(vault, ".obsidian/handbook/sources", sourceId);
  const source = JSON.parse((0, import_fs3.readFileSync)((0, import_path3.resolve)(sourceDir, "source.json"), "utf8"));
  import_strict.default.deepEqual(source.reference, { kind: "tag", value: "v1.0.0" }, "the registered reference was replaced");
  import_strict.default.equal(source.revision, git(mist, "rev-parse", "HEAD"));
  import_strict.default.equal((0, import_fs3.readFileSync)((0, import_path3.resolve)(sourceDir, "packs/mist/assets/grain.webp"), "utf8"), "grain");
  import_strict.default.ok((0, import_fs3.existsSync)((0, import_path3.resolve)(sourceDir, "packs/mist/pack.json")) && (0, import_fs3.existsSync)((0, import_path3.resolve)(sourceDir, "handbook.json")));
  import_strict.default.equal((0, import_fs3.readFileSync)((0, import_path3.resolve)(pluginDir, "data.json"), "utf8"), settings, "data.json was written");
  import_strict.default.match(lines[0], /source .* \(mist 1\.1\.0\)$/);
  const refused = world.supervise(["preview", "--no-serve"], { topology });
  import_strict.default.equal(refused.status, 2, refused.stderr);
  import_strict.default.match(refused.stderr, /nothing to show without --vault/);
});
function commitMessage(world, id, message) {
  (0, import_fs3.writeFileSync)((0, import_path3.join)(world.dir(id), ".git", "SUPERVISOR_COMMIT_MSG"), `${message}
`);
}
function originMain(world, id) {
  return git(world.dir(id), "rev-parse", "origin/main");
}
function commit(world, provider, topology) {
  const result = world.supervise(["commit", provider], { topology });
  return { ...result, stdout: `${result.stdout}${result.stderr}` };
}
scenario("commit lands a provider and its consumers in one command, never the train records", (world) => {
  const topology = testTopology(world);
  const repos = ["schema-adrenaline", "obsidian-handbook", "lantern"];
  world.write("schema-adrenaline", { "src/malus.ts": "export {};\n" });
  world.write("lantern", { "src/sheet.tsx": "export {};\n" });
  world.write("obsidian-handbook", { "src/pj.ts": "export {};\n", "supervisor/trains/draft.json": "{}\n" });
  commitMessage(world, "schema-adrenaline", "feat(malus)!: follow the paper sheet");
  commitMessage(world, "lantern", "feat(adrenaline-pj): print the Malus column");
  const before = Object.fromEntries(repos.map((id) => [id, originMain(world, id)]));
  const untouched = originMain(world, "schema-pbta");
  let result = commit(world, "schema-adrenaline", topology);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stdout, /obsidian-handbook: uncommitted changes but no message/);
  import_strict.default.ok(result.stdout.includes("nothing was committed"), result.stdout);
  for (const id of repos) import_strict.default.equal(git(world.dir(id), "rev-parse", "HEAD"), before[id], `${id} moved on a refused commit`);
  commitMessage(world, "obsidian-handbook", "feat(adrenaline-pj): print the Malus column");
  result = commit(world, "lantern", topology);
  import_strict.default.equal(result.status, 2, result.stdout);
  for (const id of repos) import_strict.default.equal(git(world.dir(id), "rev-parse", "HEAD"), before[id], `${id} moved on a consumer named as provider`);
  const done = ok(commit(world, "schema-adrenaline", topology), "commit");
  for (const id of repos) {
    import_strict.default.notEqual(originMain(world, id), before[id], `${id} was not pushed`);
    import_strict.default.equal(git(world.dir(id), "rev-parse", "HEAD"), originMain(world, id), `${id} HEAD is not origin/main`);
    import_strict.default.ok(!(0, import_fs3.existsSync)((0, import_path3.join)(world.dir(id), ".git", "SUPERVISOR_COMMIT_MSG")), `${id} kept its message`);
  }
  import_strict.default.equal(git(world.dir("schema-adrenaline"), "log", "-1", "--format=%s"), "feat(malus)!: follow the paper sheet");
  import_strict.default.match(done, /lantern: [0-9a-f]+ feat\(adrenaline-pj\): print the Malus column/);
  import_strict.default.equal(git(world.dir("obsidian-handbook"), "status", "--porcelain"), "?? supervisor/trains/draft.json");
  import_strict.default.equal(originMain(world, "schema-pbta"), untouched, "an unconcerned provider moved");
  result = commit(world, "schema-adrenaline", topology);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stdout, /nothing to commit or push/);
});
scenario("commit --only lands one repository alone, whatever its role", (world) => {
  const topology = testTopology(world);
  const repos = ["schema-adrenaline", "obsidian-handbook", "lantern"];
  world.write("schema-adrenaline", { "src/malus.ts": "export {};\n" });
  world.write("lantern", { "src/sheet.tsx": "export {};\n" });
  world.write("obsidian-handbook", { "src/pj.ts": "export {};\n" });
  const before = Object.fromEntries(repos.map((id) => [id, originMain(world, id)]));
  const only = (args) => {
    const result2 = world.supervise(["commit", ...args], { topology });
    return { ...result2, stdout: `${result2.stdout}${result2.stderr}` };
  };
  let result = only(["schema-adrenaline", "--message", "feat(malus): follow the paper sheet"]);
  import_strict.default.equal(result.status, 2, result.stdout);
  import_strict.default.match(result.stdout, /--message names one commit/);
  result = only(["lantern", "--only"]);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stdout, /lantern: uncommitted changes but no message/);
  for (const id of repos) import_strict.default.equal(git(world.dir(id), "rev-parse", "HEAD"), before[id], `${id} moved on a refused commit`);
  ok(only(["lantern", "--only", "--message", "feat(adrenaline-pj): print the Malus column"]), "commit --only");
  import_strict.default.notEqual(originMain(world, "lantern"), before.lantern, "lantern was not pushed");
  import_strict.default.equal(git(world.dir("lantern"), "log", "-1", "--format=%s"), "feat(adrenaline-pj): print the Malus column");
  for (const id of ["schema-adrenaline", "obsidian-handbook"]) {
    import_strict.default.equal(originMain(world, id), before[id], `${id} moved on another repository's commit`);
    import_strict.default.notEqual(git(world.dir(id), "status", "--porcelain"), "", `${id} lost its uncommitted work`);
  }
  commitMessage(world, "schema-adrenaline", "feat(malus)!: follow the paper sheet");
  result = only(["schema-adrenaline", "--only", "--message", "another message"]);
  import_strict.default.equal(result.status, 1, result.stdout);
  import_strict.default.match(result.stdout, /a message already waits/);
  ok(only(["schema-adrenaline", "--only"]), "commit --only");
  import_strict.default.equal(git(world.dir("schema-adrenaline"), "log", "-1", "--format=%s"), "feat(malus)!: follow the paper sheet");
  import_strict.default.ok(!(0, import_fs3.existsSync)((0, import_path3.join)(world.dir("schema-adrenaline"), ".git", "SUPERVISOR_COMMIT_MSG")), "the message was kept");
  import_strict.default.equal(originMain(world, "obsidian-handbook"), before["obsidian-handbook"], "a consumer moved on the provider's commit");
});
scenario("the supervisor neither runs nor lands a change to its own code", (world) => {
  const topology = testTopology(world);
  const before = originMain(world, "obsidian-handbook");
  const refused = (args, what) => {
    const result = world.supervise(args, { topology });
    const text = `${result.stdout}${result.stderr}`;
    import_strict.default.equal(result.status, 1, `${what}: ${text}`);
    import_strict.default.match(text, /the supervisor's own code differs from origin\/main/, what);
    return text;
  };
  world.write("obsidian-handbook", { "tools/supervisor/commit.mjs": "export {};\n" });
  import_strict.default.match(refused(["commit", "obsidian-handbook", "--only", "--message", "chore: widen the supervisor"], "commit --only"), /tools\/supervisor\/commit\.mjs \(not committed\)/);
  refused(["open", "self-change", "--title", "Self change"], "open");
  import_strict.default.equal(originMain(world, "obsidian-handbook"), before, "the supervisor pushed its own change");
  ok(world.supervise(["status"], { topology }), "status");
  world.commit("obsidian-handbook", {}, "chore: widen the supervisor");
  import_strict.default.match(refused(["commit", "obsidian-handbook", "--only"], "commit --only, unpublished"), /tools\/supervisor\/commit\.mjs \(committed, not on origin\/main\)/);
  import_strict.default.equal(originMain(world, "obsidian-handbook"), before, "the supervisor pushed its own commit");
  git(world.dir("obsidian-handbook"), "push", "--quiet", "origin", "HEAD:main");
  world.write("obsidian-handbook", { "supervisor/trains/draft.json": "{}\n", "src/pj.ts": "export {};\n" });
  ok(world.supervise(["commit", "obsidian-handbook", "--only", "--message", "feat(adrenaline-pj): print the Malus column"], { topology }), "commit --only");
  world.write("obsidian-handbook", { "tools/supervisor.harness.mts": "export {};\n" });
  import_strict.default.match(refused(["commit", "obsidian-handbook", "--only", "--message", "test: relax the scenarios"], "commit --only, harness"), /tools\/supervisor\.harness\.mts \(not committed\)/);
  world.write("obsidian-handbook", { "package.json": `${JSON.stringify({ scripts: { supervise: "node elsewhere.mjs" } })}
` });
  import_strict.default.match(refused(["commit", "obsidian-handbook", "--only", "--message", "chore: move the entry point"], "commit --only, script"), /package\.json: the "supervise" script/);
});
var SHIP_REPOS = ["schema-adrenaline", "obsidian-handbook", "lantern"];
var SHIP_MESSAGE = "feat(colours): follow the paper sheet";
var SHIP = ["--message", SHIP_MESSAGE, "--run"];
function shippable(world, validations = {}) {
  presentedTrain(world, ["schema-adrenaline"], { present: false });
  for (const id of SHIP_REPOS) world.write(id, { "src/late.ts": "export const late = true;\n" });
  return testTopology(world, validations, {}, "ship-topology.json");
}
function shipEffects(world, trainRuns = [{}]) {
  const adrenaline = REPOSITORY["schema-adrenaline"];
  world.updateState((state) => {
    state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
    state.workflowEffects[`${adrenaline} release-train.yml`] = trainRuns;
    state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ repository: adrenaline, workflow: "release.yml", createRelease: world.release("schema-adrenaline", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-adrenaline")) }];
  });
  consumerEffects(world);
}
function ship(world, topology, args) {
  const result = world.supervise(["ship", ...args], { topology });
  return { ...result, text: `${result.stdout}${result.stderr}` };
}
function shipHeads(world) {
  return Object.fromEntries(SHIP_REPOS.map((id) => [id, originMain(world, id)]));
}
function shipped(world, id) {
  return git(world.dir(id), "log", "--format=%s", "origin/main").split("\n").filter((subject) => subject === SHIP_MESSAGE).length;
}
scenario("ship --run takes an uncommitted change to a closed train in one command, without reading a line", (world) => {
  const topology = shippable(world);
  shipEffects(world);
  const result = ship(world, topology, SHIP);
  ok(result, "ship --run");
  for (const id of SHIP_REPOS) import_strict.default.equal(shipped(world, id), 1, `${id} was not committed and pushed:
${result.text}`);
  for (const id of ["schema-adrenaline", "lantern"]) import_strict.default.equal(git(world.dir(id), "status", "--porcelain"), "", `${id} is left dirty`);
  const record = readRecord(world);
  import_strict.default.equal(record.status, "closed");
  import_strict.default.equal(record.presentation.presentable, true);
  import_strict.default.equal(record.approval, void 0);
  import_strict.default.equal(record.publication["schema-adrenaline"].final.tag, `v${NEXT}`);
  import_strict.default.equal(record.convergence.status, "passed");
  import_strict.default.deepEqual(record.consumerReleases.map((entry) => entry.repo), ["lantern", "obsidian-handbook"]);
  import_strict.default.equal(coordinationIssue(world).state, "CLOSED");
  const order = ["Commit and push for train couleur-otherscape", "**Presentable.**", "Every provider of train couleur-otherscape is published", "Every consumer of train couleur-otherscape is released"];
  const positions = order.map((mark) => result.text.indexOf(mark));
  import_strict.default.ok(positions.every((position) => position >= 0), result.text);
  import_strict.default.doesNotMatch((0, import_fs3.readFileSync)((0, import_path3.resolve)(HANDBOOK, "tools/supervisor/ship.mjs"), "utf8"), /stdin|readline/);
});
scenario("ship without --run shows every step of the cycle and commits, presents and dispatches nothing", (world) => {
  const topology = shippable(world);
  shipEffects(world);
  const before = shipHeads(world);
  const dry = ok(ship(world, topology, ["--message", SHIP_MESSAGE]), "ship");
  for (const id of SHIP_REPOS) import_strict.default.ok(dry.includes(`${id}:
  commit "${SHIP_MESSAGE}"`), dry);
  import_strict.default.match(dry, /present: validate every concerned repository on the commits above/);
  import_strict.default.ok(dry.includes("then: publish --run\nthen: converge --run\nthen: release --run\nthen: close --run"), dry);
  import_strict.default.ok(dry.includes(`Nothing was run. Run it with: pnpm supervise ship --message ${JSON.stringify(SHIP_MESSAGE)} --run`), dry);
  import_strict.default.deepEqual(shipHeads(world), before, "ship without --run pushed");
  for (const id of ["schema-adrenaline", "lantern"]) import_strict.default.equal(git(world.dir(id), "status", "--porcelain"), "?? src/late.ts", `${id} was committed`);
  import_strict.default.equal(readRecord(world).presentation, void 0);
  import_strict.default.deepEqual(dispatches(world), []);
  const refused = ship(world, topology, ["--message", " ", "--run"]);
  import_strict.default.equal(refused.status, 2, refused.text);
  import_strict.default.match(refused.stderr, /ship: --message is empty/);
  const silent = ship(world, topology, ["--run"]);
  import_strict.default.equal(silent.status, 1, silent.text);
  import_strict.default.match(silent.stderr, /schema-adrenaline: uncommitted changes but no message/);
  import_strict.default.deepEqual(shipHeads(world), before, "a refused ship pushed");
});
scenario("a red validation stops ship --run after present: the commits are landed, nothing is published", (world) => {
  const broken = nodeCommand("console.error('contract broken'); process.exit(3)");
  const topology = shippable(world, { lantern: [broken] });
  shipEffects(world);
  const result = ship(world, topology, SHIP);
  import_strict.default.equal(result.status, 1, result.text);
  import_strict.default.ok(result.stdout.includes(`lantern: ${broken.join(" ")} exited 3`), result.stdout);
  import_strict.default.match(result.stderr, /ship: train "couleur-otherscape" is not presentable; nothing was published/);
  for (const id of SHIP_REPOS) import_strict.default.equal(shipped(world, id), 1, `${id} was not committed before the presentation`);
  import_strict.default.equal(readRecord(world).presentation.presentable, false);
  import_strict.default.equal(readRecord(world).publication["schema-adrenaline"], void 0);
  import_strict.default.deepEqual(dispatches(world), []);
  import_strict.default.deepEqual(tagPushes(world), []);
});
scenario("ship --run again after an interrupted publication resumes at the missing step, without a second commit or presentation", (world) => {
  const topology = shippable(world);
  shipEffects(world, [{ conclusion: "failure" }, {}]);
  const red = ship(world, topology, SHIP);
  import_strict.default.equal(red.status, 1, red.text);
  import_strict.default.match(red.stderr, /release-train\.yml run \S+ concluded failure/);
  const presentedAt = readRecord(world).presentation.presentedAt;
  import_strict.default.equal(readRecord(world).status, "open");
  const again = ship(world, topology, SHIP);
  ok(again, "ship --run again");
  import_strict.default.doesNotMatch(again.text, /Commit and push/);
  import_strict.default.doesNotMatch(again.text, /Presented at/);
  for (const id of SHIP_REPOS) import_strict.default.equal(shipped(world, id), 1, `${id} was committed again`);
  const record = readRecord(world);
  import_strict.default.equal(record.presentation.presentedAt, presentedAt, "the train was presented again");
  import_strict.default.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml", "release-train.yml", "release.yml"]);
  import_strict.default.equal(record.status, "closed");
});
scenario("ship refuses to run on supervisor code nobody published, before any step", (world) => {
  const topology = shippable(world);
  shipEffects(world);
  world.write("obsidian-handbook", { "tools/supervisor/ship.mjs": "export {};\n" });
  const before = shipHeads(world);
  const result = ship(world, topology, SHIP);
  import_strict.default.equal(result.status, 1, result.text);
  import_strict.default.match(result.stderr, /the supervisor's own code differs from origin\/main/);
  import_strict.default.match(result.stderr, /tools\/supervisor\/ship\.mjs \(not committed\)/);
  import_strict.default.deepEqual(shipHeads(world), before, "ship pushed beside unpublished supervisor code");
  import_strict.default.equal(readRecord(world).presentation, void 0);
  import_strict.default.deepEqual(dispatches(world), []);
});
scenario("ship refuses a repository engaged by another open train, by name, and commits nothing", (world) => {
  const topology = shippable(world);
  shipEffects(world);
  const record = readRecord(world);
  const lantern = record.items.find((item) => item.repo === "lantern");
  (0, import_fs3.writeFileSync)(trainPath(world, "autre-train"), `${JSON.stringify({ ...record, id: "autre-train", title: "Another change", items: [{ ...lantern, dependsOn: [] }] }, null, "	")}
`);
  const before = shipHeads(world);
  const result = ship(world, topology, ["--train", TRAIN_ID, ...SHIP]);
  import_strict.default.equal(result.status, 1, result.text);
  import_strict.default.match(result.stderr, /ship: lantern is already engaged by the open train "autre-train" \(Another change\); finish or close it first; nothing was committed/);
  import_strict.default.deepEqual(shipHeads(world), before, "ship pushed a repository of another train");
  import_strict.default.equal(shipped(world, "schema-adrenaline"), 0);
  import_strict.default.deepEqual(dispatches(world), []);
});
function gitVerbs(world) {
  const counts = {};
  for (const line of world.gitCalls()) {
    const verb = line.split(" ").slice(0, 2).join(" ");
    counts[verb] = (counts[verb] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([verb, count]) => `${count} ${verb}`).join(" | ");
}
function main() {
  const handbookBefore = sh(HANDBOOK, "git", ["status", "--porcelain"]).stdout;
  const only = process.env.SUPERVISOR_SCENARIO;
  let failed = 0;
  for (const { name, run } of scenarios) {
    if (only && !name.includes(only)) continue;
    const started = Date.now();
    const world = createWorld();
    try {
      run(world);
      console.log(`ok   ${name} (${Date.now() - started} ms; ${world.spent.calls} supervise in ${world.spent.ms} ms, ${world.spent.gitCalls} git calls)`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}
${error.stack ?? error}`);
    } finally {
      if (process.env.SUPERVISOR_VERBS) console.log(gitVerbs(world));
      world.dispose();
    }
  }
  import_strict.default.equal(sh(HANDBOOK, "git", ["status", "--porcelain"]).stdout, handbookBefore, "the harness left files in the Handbook checkout");
  if (failed > 0) {
    console.error(`
${failed} supervisor scenario(s) failed.`);
    process.exit(1);
  }
  console.log("\nSupervisor scenarios passed.");
}
main();
