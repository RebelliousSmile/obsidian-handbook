import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
	readFileSync(resolve(root, "package.json"), "utf8"),
);
const externalSchemaAssertions = new Set([
	"assert:adrenaline-source",
	"assert:release-train-schema-adrenaline",
]);
const commands = [
	"build",
	"lint",
	...Object.keys(packageJson.scripts)
		.filter(
			(name) =>
				name.startsWith("assert:") &&
				!externalSchemaAssertions.has(name),
		)
		.sort(),
];
const npmCli = process.env.npm_execpath;

// A green result is reused when the content it was proved on has not changed.
// Two stamps, kept in the git directory (outside the checkout, never committed):
//   - `full`: the whole checkout (minus the train records, which `present` and
//     `publish` rewrite between two checks of the same code);
//   - `supervisor`: only what `assert:supervisor` exercises. That harness takes
//     many minutes, so a change elsewhere does not replay it.
// A stamp is written only after a green run. CI and HANDBOOK_CHECK_FORCE=1 replay everything.
const forced = process.env.CI === "true" || process.env.HANDBOOK_CHECK_FORCE === "1";
const SUPERVISOR_SCRIPT = "assert:supervisor";
const SUPERVISOR_INPUTS = [
	/^tools\/supervisor\//,
	/^tools\/fixtures\/supervisor\//,
	/^tools\/supervise\.mjs$/,
	/^tools\/supervisor[^/]*\.harness\.mts$/,
	/^tools\/assert-supervisor\.mjs$/,
	/^supervisor\/(?!trains\/)/,
];

function gitOut(args) {
	const result = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
	return result.status === 0 ? result.stdout : null;
}

function contentHash(include) {
	const listing = gitOut(["ls-files", "-co", "--exclude-standard", "-z"]);
	if (listing === null) return null;
	const hash = createHash("sha256").update(process.version);
	for (const file of listing.split("\0").filter(Boolean).sort()) {
		if (!include(file) || !existsSync(resolve(root, file))) continue;
		hash.update(`${file}\0${createHash("sha256").update(readFileSync(resolve(root, file))).digest("hex")}\n`);
	}
	return hash.digest("hex");
}

const gitDirectory = gitOut(["rev-parse", "--absolute-git-dir"])?.trim();
const stampFile = gitDirectory ? resolve(gitDirectory, "handbook-check-stamps.json") : null;

function readStamps() {
	if (forced || !stampFile || !existsSync(stampFile)) return {};
	try {
		return JSON.parse(readFileSync(stampFile, "utf8"));
	} catch {
		return {};
	}
}

function writeStamps(stamps) {
	if (stampFile) writeFileSync(stampFile, `${JSON.stringify(stamps, null, "\t")}\n`);
}

const stamps = readStamps();
const fullHash = contentHash((file) => !file.startsWith("supervisor/trains/"));
const supervisorHash = contentHash((file) => SUPERVISOR_INPUTS.some((pattern) => pattern.test(file)));

if (fullHash && stamps.full === fullHash) {
	console.log("\ncheck: this exact content already passed; nothing replayed (HANDBOOK_CHECK_FORCE=1 to replay).");
	process.exit(0);
}

function scriptInvocation(command) {
	if (!npmCli) return { file: "npm", args: ["run", command] };
	const isJavaScriptCli = /\.(?:c?js|mjs)$/i.test(npmCli);
	return isJavaScriptCli
		? { file: process.execPath, args: [npmCli, "run", command] }
		: { file: npmCli, args: ["run", command] };
}

function runPackageScript(command) {
	const { file, args } = scriptInvocation(command);
	return spawnSync(file, args, { cwd: root, env: process.env, stdio: "inherit" });
}

// Gates that only read the checkout (`build` writes `dist/`, nothing else reads it): run them together,
// first, so an evident failure (types, lint, version, lockfile, schema pins) comes back in seconds
// instead of after the long gates. The first failure stops the others.
const QUICK_GATES = ["build", "lint", "assert:release-version", "assert:ci-install", "assert:consumer-schema-pins"];

function runQuickGates(gates) {
	return new Promise((resolveGates) => {
		const running = new Map();
		let failed = null;
		const stopAll = () => {
			for (const child of running.values()) {
				if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
				else child.kill("SIGTERM");
			}
		};
		for (const gate of gates) {
			const { file, args } = scriptInvocation(gate);
			const child = spawn(file, args, { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
			let output = "";
			child.stdout.on("data", (chunk) => { output += chunk; });
			child.stderr.on("data", (chunk) => { output += chunk; });
			running.set(gate, child);
			const finish = (code) => {
				if (!running.delete(gate)) return;
				if (code === 0) {
					if (!failed) console.log(`> check: ${gate} ok`);
				} else if (!failed) {
					failed = gate;
					console.log(`\n> check: ${gate} FAILED (stopping the other quick gates)\n${output}`);
					stopAll();
				}
				if (running.size === 0) resolveGates(failed ? 1 : 0);
			};
			child.on("error", (error) => { output += String(error); finish(1); });
			child.on("close", (code) => finish(code ?? 1));
		}
	});
}

console.log(`\n> check: quick gates in parallel (${QUICK_GATES.join(", ")})`);
const quickStatus = await runQuickGates(QUICK_GATES);
if (quickStatus !== 0) process.exit(quickStatus);

for (const command of commands) {
	if (QUICK_GATES.includes(command)) continue;
	if (command === SUPERVISOR_SCRIPT && supervisorHash && stamps.supervisor === supervisorHash) {
		console.log(`\n> check: ${command} skipped, the supervisor and its harness are unchanged since a green run (HANDBOOK_CHECK_FORCE=1 to replay)`);
		continue;
	}
	console.log(`\n> check: ${command}`);
	const result = runPackageScript(command);
	if (result.error) throw result.error;
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
	if (command === SUPERVISOR_SCRIPT && supervisorHash) {
		stamps.supervisor = supervisorHash;
		writeStamps(stamps);
	}
}

if (fullHash) {
	stamps.full = fullHash;
	writeStamps(stamps);
}

console.log("\nHandbook core check passed.");
