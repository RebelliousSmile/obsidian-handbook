/**
 * The writes of a presented train: a consumer adopting an archive, a
 * release-train file landed on a provider, a final tag pushed.
 *
 * Each write starts from a checkout on main, clean and at origin/main (fast
 * forwarded when it is only behind), and commits only the files it names: the
 * presentation, which admits train files and known archives only, still holds
 * after it. A write that would change nothing is refused, so a step whose
 * observation does not move after it stops instead of looping.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fetchOrigin, git, mainCheckoutProblem, revParse } from "./git.mjs";
import { npmLockPin, parsePinUrl, pnpmLockPins, readPin, trackedLockfiles } from "./pins.mjs";
import { runGuarded } from "./guarded.mjs";
import { TRAINS_PATH } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

function run(dir, args, label) {
	const result = git(dir, args);
	if (result.status !== 0) throw new SupervisorError(`${label}: git ${args.join(" ")} failed in ${dir}\n${result.stderr.trim()}`, 1);
	return result.stdout.trim();
}

/** On main, clean apart from `ignore`, at origin/main: fast-forwarded when only behind, refused otherwise. */
export function readyCheckout(repo, dir, label, ignore = []) {
	if (!fetchOrigin(dir)) throw new SupervisorError(`${label}: git fetch origin failed in ${dir}`, 1);
	const wrongBranch = mainCheckoutProblem(dir);
	if (wrongBranch) throw new SupervisorError(`${label}: ${repo.id} is ${wrongBranch} (${dir})`, 1);
	const excluded = [...(repo.role === "coordinator" ? [TRAINS_PATH] : []), ...ignore].map((path) => `:(exclude)${path}`);
	const dirty = git(dir, ["status", "--porcelain", "--untracked-files=all", "--", ".", ...excluded]).stdout.replace(/\s+$/, "");
	if (dirty) throw new SupervisorError(`${label}: ${repo.id} has uncommitted changes in ${dir}; commit or stash them first\n  ${dirty.split("\n").join("\n  ")}`, 1);
	if (revParse(dir, "HEAD") === revParse(dir, "origin/main")) return;
	if (git(dir, ["merge-base", "--is-ancestor", "HEAD", "origin/main"]).status !== 0) {
		throw new SupervisorError(`${label}: ${repo.id} has commits origin/main does not have (${dir}); push or drop them first`, 1);
	}
	run(dir, ["merge", "--ff-only", "--quiet", "origin/main"], label);
}

/** Commit exactly `paths` and push main; refused when they hold nothing new. */
function commitAndPush(repo, dir, paths, message, label) {
	run(dir, ["add", "--", ...paths], label);
	if (git(dir, ["diff", "--cached", "--quiet", "--", ...paths]).status === 0) {
		throw new SupervisorError(`${label}: ${paths.join(", ")} of ${repo.id} already hold this content on origin/main; nothing to land`, 1);
	}
	run(dir, ["commit", "--quiet", "-m", message, "--", ...paths], label);
	run(dir, ["push", "--quiet", "origin", "HEAD:main"], label);
	return revParse(dir, "HEAD");
}

/** Write `files` (path → content) on main of `repo`, commit them alone, push. */
export function landFiles(root, topology, step, label) {
	const repo = repoById(topology, step.repo);
	const dir = repoDir(root, repo);
	const paths = Object.keys(step.files);
	readyCheckout(repo, dir, label, paths);
	for (const path of paths) {
		mkdirSync(dirname(resolve(dir, path)), { recursive: true });
		writeFileSync(resolve(dir, path), step.files[path]);
	}
	const sha = commitAndPush(repo, dir, paths, step.message, label);
	console.log(`${repo.id}: ${sha.slice(0, 10)} ${step.message}`);
	return sha;
}

/** Push origin/main of `repo` as the tag `tag`. */
export function pushTag(root, topology, step, label) {
	const repo = repoById(topology, step.repo);
	const dir = repoDir(root, repo);
	if (!fetchOrigin(dir)) throw new SupervisorError(`${label}: git fetch origin failed in ${dir}`, 1);
	run(dir, ["push", "--quiet", "origin", `origin/main:refs/tags/${step.tag}`], label);
	console.log(`${repo.id}: pushed ${step.tag} at ${revParse(dir, "origin/main").slice(0, 10)}`);
}

function setPnpmVersion(text, name, url, version) {
	const lines = text.split("\n");
	for (let index = 0; index < lines.length; index += 1) {
		if (lines[index].replace(/\r$/, "") !== `  ${name}@${url}:`) continue;
		for (let next = index + 1; next < lines.length && lines[next].startsWith("    "); next += 1) {
			lines[next] = lines[next].replace(/^( {4}version: )\S+?(\r?)$/, `$1${version}$2`);
		}
	}
	return lines.join("\n");
}

function setNpmVersion(text, name, version) {
	const start = text.indexOf(`"node_modules/${name}"`);
	if (start < 0) return text;
	const end = text.indexOf("}", start);
	return text.slice(0, start) + text.slice(start, end).replace(/"version":\s*"[^"]*"/, `"version": "${version}"`) + text.slice(end);
}

/**
 * Point every pin of `name` in the working tree of `dir` at `archive`:
 * package.json, then each tracked lockfile, rewritten in place so the rest of
 * each file keeps its bytes. Returns the files it rewrote.
 */
export function rewritePins(dir, name, archive) {
	const version = parsePinUrl(archive.url)?.version;
	if (!version) throw new SupervisorError(`adopt: ${archive.url} is not a release asset URL`, 1);
	const manifestPath = resolve(dir, "package.json");
	const manifestText = readFileSync(manifestPath, "utf8");
	const manifest = JSON.parse(manifestText);
	const old = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
	if (!old) throw new SupervisorError(`adopt: ${dir} does not depend on ${name}`, 1);
	writeFileSync(manifestPath, manifestText.split(JSON.stringify(old)).join(JSON.stringify(archive.url)));
	const files = ["package.json"];
	for (const file of trackedLockfiles(dir)) {
		const path = resolve(dir, file);
		let text = readFileSync(path, "utf8");
		const pins = file === "pnpm-lock.yaml" ? pnpmLockPins(text, name).resolutions : [npmLockPin(text, name)].filter(Boolean);
		for (const pin of pins) {
			if (pin.url) text = text.split(pin.url).join(archive.url);
			if (pin.integrity) text = text.split(pin.integrity).join(archive.integrity);
		}
		text = file === "pnpm-lock.yaml" ? setPnpmVersion(text, name, archive.url, version) : setNpmVersion(text, name, version);
		writeFileSync(path, text);
		files.push(file);
	}
	const pin = readPin(dir, name);
	const stale = pin.lockfiles.filter((lockfile) => lockfile.url !== archive.url || lockfile.integrity !== archive.integrity).map((lockfile) => lockfile.file);
	if (pin.url !== archive.url || stale.length > 0) {
		throw new SupervisorError(`adopt: ${[...(pin.url !== archive.url ? ["package.json"] : []), ...stale].join(", ")} of ${dir} still do not pin ${archive.url}`, 1);
	}
	return files;
}

/** The frozen install of a consumer, from the lockfile it tracks. */
export function installCommand(dir) {
	const lockfiles = trackedLockfiles(dir);
	if (lockfiles.includes("pnpm-lock.yaml")) return ["pnpm", "install", "--frozen-lockfile"];
	if (lockfiles.includes("package-lock.json")) return ["npm", "ci"];
	return null;
}

/**
 * Each consumer of `ids` adopts `archive` of `provider`: pins rewritten, the
 * frozen install, then with `validate` the consumer's validations, all behind
 * the publication guard. A failure restores the pins and names the consumer,
 * the command and its output; nothing of that consumer is committed. The
 * consumers before it keep their adoption, the next run resumes after them.
 */
export function adoptArchive(root, topology, provider, archive, ids, { validate, label }) {
	for (const id of ids) {
		const repo = repoById(topology, id);
		const dir = repoDir(root, repo);
		readyCheckout(repo, dir, label);
		console.log(`${id}: adopt ${provider.package} ${archive.tag}`);
		const files = rewritePins(dir, provider.package, archive);
		const install = installCommand(dir);
		const commands = [...(install ? [install] : []), ...(validate ? repo.validations ?? [] : [])];
		for (const command of commands) {
			const result = runGuarded(dir, command, label);
			if (result.status === 0) continue;
			run(dir, ["checkout", "HEAD", "--", ...files], label);
			if (install) runGuarded(dir, install, label);
			throw new SupervisorError(`${label}: ${id} does not pass with ${provider.package} ${archive.tag}: \`${command.join(" ")}\` exited ${result.status}; its pins are restored and nothing of ${id} was committed\n${result.tail}`, 1);
		}
		const message = `chore(deps): adopt ${provider.package} ${archive.tag}`;
		const sha = commitAndPush(repo, dir, files, message, label);
		console.log(`${id}: ${sha.slice(0, 10)} ${message}`);
	}
}
