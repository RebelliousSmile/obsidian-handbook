/**
 * What the three provider adapters share: releases and their bytes, consumer
 * adoption read on origin/main, recorded runs, and the shape of a step.
 *
 * An adapter observes, then decides. `observe` reads GitHub and the
 * repositories and returns plain data; `nextStep` is a pure function of that
 * data, so a same observation always gives the same step. Every archive is
 * identified by its bytes: downloaded, then hashed here, never taken from a
 * release page or a manifest on trust.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gh, ghJson } from "../gh.mjs";
import { git, gitOut, revParse, showFile } from "../git.mjs";
import { npmLockPin, pnpmLockPins } from "../pins.mjs";
import { repoById, repoDir, SupervisorError } from "../topology.mjs";

function escape(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function archiveName(repo, version) {
	return `${repo.package}-${version}.tgz`;
}

export function releaseUrl(repo, tag, version) {
	return `https://github.com/${repo.repository}/releases/download/${tag}/${archiveName(repo, version)}`;
}

export function hashBytes(bytes) {
	return {
		sha256: createHash("sha256").update(bytes).digest("hex"),
		integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
	};
}

/** Published (not draft) releases of the provider, newest first. */
export function listReleases(repo) {
	return ghJson(["release", "list", "-R", repo.repository, "--limit", "100", "--json", "tagName,isPrerelease,isDraft,publishedAt"])
		.filter((release) => !release.isDraft)
		.map((release) => release.tagName);
}

/** The first candidate tag of `version` no release uses yet: an existing candidate is never published again. */
export function nextCandidateTag(tags, version) {
	const pattern = new RegExp(`^v${escape(version)}-rc\\.(\\d+)$`);
	const used = tags.map((tag) => pattern.exec(tag)).filter(Boolean).map((match) => Number(match[1]));
	return `v${version}-rc.${Math.max(0, ...used) + 1}`;
}

/** Download the release asset of `tag` and hash it. */
export function observeArchive(repo, tag, version) {
	const name = archiveName(repo, version);
	const directory = mkdtempSync(join(tmpdir(), "supervisor-archive-"));
	try {
		const result = gh(["release", "download", tag, "-R", repo.repository, "-p", name, "-D", directory]);
		if (result.status !== 0 || !existsSync(join(directory, name))) {
			throw new SupervisorError(`${repo.id}: release ${tag} has no downloadable asset ${name} (${result.stderr.trim() || "missing"})`, 1);
		}
		return { tag, url: releaseUrl(repo, tag, version), ...hashBytes(readFileSync(join(directory, name))) };
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

/** A JSON file of a workflow run artifact, or null when the run has no such artifact. */
export function runArtifactJson(repo, runId, artifact, file) {
	const directory = mkdtempSync(join(tmpdir(), "supervisor-artifact-"));
	try {
		const result = gh(["run", "download", String(runId), "-R", repo.repository, "-n", artifact, "-D", directory]);
		if (result.status !== 0) return null;
		const found = readdirSync(directory).find((name) => name === file);
		return found ? JSON.parse(readFileSync(join(directory, found), "utf8")) : null;
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

/** A JSON file of origin/main: null when absent, `{ unreadable: true }` when it is not JSON. */
export function originJson(dir, path) {
	const text = showFile(dir, "origin/main", path);
	if (text === null) return null;
	try {
		return JSON.parse(text);
	} catch {
		return { unreadable: true };
	}
}

export function originFiles(dir, path) {
	const result = git(dir, ["ls-tree", "--name-only", "origin/main", `${path.replace(/\/$/, "")}/`]);
	return result.status === 0 ? result.stdout.split("\n").filter(Boolean) : [];
}

export function consumerPin(dir, name, ref) {
	const manifestText = showFile(dir, ref, "package.json");
	let manifest = {};
	try {
		manifest = manifestText === null ? {} : JSON.parse(manifestText);
	} catch {
		manifest = {};
	}
	const url = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name] ?? null;
	const lockfiles = [];
	const pnpm = showFile(dir, ref, "pnpm-lock.yaml");
	if (pnpm !== null) {
		const resolution = pnpmLockPins(pnpm, name).resolutions.find((entry) => entry.url === url) ?? null;
		lockfiles.push({ file: "pnpm-lock.yaml", url: resolution?.url ?? null, integrity: resolution?.integrity ?? null });
	}
	const npm = showFile(dir, ref, "package-lock.json");
	if (npm !== null) lockfiles.push({ file: "package-lock.json", ...(npmLockPin(npm, name) ?? { url: null, integrity: null }) });
	return { url, lockfiles };
}

/** Whether `ref` of a consumer pins `archive`, in package.json and every lockfile, with its SRI. */
export function pins(dir, name, ref, archive) {
	const pin = consumerPin(dir, name, ref);
	return pin.url === archive.url
		&& pin.lockfiles.every((lockfile) => lockfile.url === archive.url && lockfile.integrity === archive.integrity);
}

/** Whether each consumer's origin/main pins `archive`. */
export function observeAdoption(root, topology, repo, archive) {
	return (repo.consumers ?? []).map((id) => {
		const dir = repoDir(root, repoById(topology, id));
		return { repo: id, sha: revParse(dir, "origin/main"), adopted: pins(dir, repo.package, "origin/main", archive) };
	});
}

/** HEAD against origin/main and a clean tree: what a local promotion command needs. */
export function observeCheckout(dir) {
	return {
		dir,
		head: revParse(dir, "HEAD"),
		originMain: revParse(dir, "origin/main"),
		clean: gitOut(dir, ["status", "--porcelain"]) === "",
	};
}

export function tagExists(dir, tag) {
	return git(dir, ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`]).status === 0;
}

function sameInputs(left = {}, right = {}) {
	const keys = Object.keys(left);
	return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

/** The last recorded run of `step`, optionally with exactly these inputs. */
export function lastRun(record, step, inputs) {
	const runs = (record.runs ?? []).filter((run) => run.step === step && (!inputs || sameInputs(run.inputs, inputs)));
	return runs.length ? runs[runs.length - 1] : null;
}

export function succeeded(run) {
	return run?.conclusion === "success";
}

export const human = (repo, instruction) => ({ kind: "human", repo, instruction });

export const wait = (run) => ({ kind: "wait", run: run.url, instruction: `run ${run.url} is still in progress; run supervise publish again once it finishes` });

export const done = () => ({ kind: "done" });

export function workflowStep(repo, step, workflow, inputs, description) {
	return {
		kind: "automated",
		type: "workflow",
		step,
		repo: repo.id,
		repository: repo.repository,
		workflow,
		inputs,
		description,
		command: ["gh", "workflow", "run", workflow, "-R", repo.repository, "--ref", "main", ...Object.keys(inputs).flatMap((key) => ["-f", `${key}=${inputs[key]}`])],
	};
}

export function localStep(repo, step, command, description, extra = {}) {
	return { kind: "automated", type: "local", step, repo: repo.id, command, description, ...extra };
}

/** Human steps for the consumers that do not pin the candidate yet, or null when all do. */
export function adoptionStep(observation) {
	const missing = observation.adoption.filter((entry) => !entry.adopted);
	if (missing.length === 0) return null;
	const { candidate } = observation;
	return human(missing.map((entry) => entry.repo).join(", "), [
		`adopt the candidate ${candidate.tag} of ${observation.provider} and land it on origin/main of ${missing.map((entry) => entry.repo).join(" and ")}:`,
		`  package.json and every lockfile pin ${candidate.url}`,
		`  with integrity ${candidate.integrity}`,
		"then run the consumer's frozen install and checks before committing",
	].join("\n"));
}

/** The human step that brings a checkout back to origin/main, or null when it is there and clean. */
export function checkoutStep(repoId, checkout) {
	if (checkout.clean && checkout.head && checkout.head === checkout.originMain) return null;
	return human(repoId, `the local promotion runs in ${checkout.dir}, which must be clean and at origin/main: git -C ${checkout.dir} switch main && git -C ${checkout.dir} pull --ff-only`);
}

/**
 * What is wrong with a committed release-train manifest, or null. The three
 * providers share its core: a candidate naming the approved commit, the final
 * tag and the train's archive, and one consumer entry per consumer whose ref
 * pins that archive.
 */
export function manifestProblem(root, topology, repo, manifest, expected) {
	if (!manifest) return "is not on origin/main";
	if (manifest.unreadable) return "is not valid JSON";
	const named = manifest.candidate ?? {};
	const fields = {
		releaseUrl: expected.candidate.url,
		sha256: expected.candidate.sha256,
		integrity: expected.candidate.integrity,
		stagingTag: expected.candidate.tag,
		finalTag: expected.finalTag,
		providerCommit: expected.sha,
	};
	for (const field of Object.keys(fields)) {
		if (named[field] !== fields[field]) return `names candidate.${field} ${named[field] ?? "(none)"}, the train expects ${fields[field]}`;
	}
	if (!expected.consumers) return null;
	for (const id of repo.consumers ?? []) {
		const consumer = repoById(topology, id);
		const entry = (manifest.consumers ?? []).find((candidate) => candidate.repository === consumer.repository);
		if (!entry?.ref) return `has no consumer entry for ${consumer.repository}`;
		const dir = repoDir(root, consumer);
		if (git(dir, ["cat-file", "-e", `${entry.ref}^{commit}`]).status !== 0) return `names ${id} at ${entry.ref}, which is not a commit of ${id}`;
		if (!pins(dir, repo.package, entry.ref, expected.candidate)) return `names ${id} at ${entry.ref.slice(0, 10)}, which does not pin the candidate ${expected.candidate.tag}`;
	}
	return null;
}

/** The role a consumer holds in the providers' release-train records. */
export const CONSUMER_ROLES = { "obsidian-handbook": "handbook", lantern: "lantern" };

/** The steps of a convergence: the commands that prove it, once no person has anything left to do. */
export const checks = (commands, notes = []) => ({ kind: "checks", commands, notes });

/**
 * What is wrong with the consumer refs a final record names, or null: each
 * consumer of the provider named once, at a commit of its own that pins the
 * final archive.
 */
export function finalConsumersProblem(root, topology, repo, entries, final) {
	for (const id of repo.consumers ?? []) {
		const consumer = repoById(topology, id);
		const named = (entries ?? []).filter((entry) => entry.repository === consumer.repository);
		if (named.length !== 1 || !named[0].ref) return `names ${consumer.repository} ${named.length === 0 ? "nowhere" : `${named.length} times`}`;
		const dir = repoDir(root, consumer);
		if (git(dir, ["cat-file", "-e", `${named[0].ref}^{commit}`]).status !== 0) return `names ${id} at ${named[0].ref}, which is not a commit of ${id}`;
		if (!pins(dir, repo.package, named[0].ref, final)) return `names ${id} at ${named[0].ref.slice(0, 10)}, which does not pin the final ${final.tag}`;
	}
	return null;
}

/** The consumer block a manifest needs: each consumer at the origin/main commit that adopted the candidate. */
export function consumerEntries(topology, adoption) {
	return adoption.map((entry) => ({ repository: repoById(topology, entry.repo).repository, ref: entry.sha }));
}

/** The train's candidate: the recorded one, else the one just seen; bytes that differ from the record stop the train. */
export function settleCandidate(known, seen) {
	if (known && seen && known.sha256 !== seen.sha256) {
		throw new SupervisorError(`candidate ${seen.tag} has sha256 ${seen.sha256}, the train recorded ${known.sha256} (${known.tag}): the candidate changed after it was observed`, 1);
	}
	return known ?? seen ?? null;
}

/** Whether a recorded run is still without a conclusion. */
export function pending(run) {
	return Boolean(run) && run.conclusion === null;
}

/** A run that succeeded without producing what it should: nothing to retry, a person must look. */
export function inspect(repoId, run, missing) {
	return human(repoId, `${run.url ? `run ${run.url}` : `\`${run.command.join(" ")}\``} succeeded but ${missing}; inspect it before anything else is published`);
}

/** The instruction to commit a manifest, with the exact values the train expects. */
export function manifestInstruction(path, problem, candidate, extra = {}) {
	return [
		`commit ${path} on main of the provider (${problem}), with this candidate:`,
		...JSON.stringify({ candidate, ...extra }, null, "\t").split("\n").map((line) => `  ${line}`),
		"Keep the other fields the provider's release-train README asks for; the supervisor checks these ones.",
	].join("\n");
}

/** The fields a manifest's candidate must carry, for the instruction. */
export function candidateFields(observation) {
	const { candidate } = observation;
	return {
		releaseUrl: candidate.url,
		sha256: candidate.sha256,
		integrity: candidate.integrity,
		version: observation.version,
		stagingTag: candidate.tag,
		finalTag: observation.finalTag,
		providerCommit: observation.sha,
	};
}

/** Input names of a workflow's `workflow_dispatch`, with whether each is required; null without a dispatch trigger. */
export function dispatchInputs(text) {
	const lines = text.split("\n");
	const start = lines.findIndex((line) => /^\s*workflow_dispatch:\s*$/.test(line));
	if (start < 0) return null;
	const indent = (line) => line.length - line.trimStart().length;
	const base = indent(lines[start]);
	const inputs = {};
	let inputsIndent = null;
	let keyIndent = null;
	let current = null;
	for (const line of lines.slice(start + 1)) {
		if (!line.trim() || line.trim().startsWith("#")) continue;
		const level = indent(line);
		if (level <= base) break;
		if (inputsIndent === null) {
			if (/^\s*inputs:\s*$/.test(line)) inputsIndent = level;
			continue;
		}
		if (level <= inputsIndent) break;
		keyIndent = keyIndent ?? level;
		if (level === keyIndent) {
			current = line.trim().replace(/:.*$/, "");
			inputs[current] = { required: false };
		} else if (current && level > keyIndent && /^\s*required:\s*true\s*$/.test(line)) {
			inputs[current].required = true;
		}
	}
	return inputs;
}

/** Secrets a workflow file references, GITHUB_TOKEN aside. */
export function workflowSecrets(text) {
	const names = new Set();
	for (const match of text.matchAll(/secrets\.([A-Za-z0-9_]+)/g)) {
		if (match[1] !== "GITHUB_TOKEN") names.add(match[1]);
	}
	return [...names].sort();
}

/** The release of `tag`, the train's candidate, and how far the consumers adopted it. */
export function observeCandidate(ctx, base, tag, seen = null) {
	const { root, topology, repo, record, version } = ctx;
	const published = tag && base.tags.includes(tag) ? observeArchive(repo, tag, version) : null;
	const candidate = settleCandidate(record.candidate, published ?? seen);
	const adoption = published ? observeAdoption(root, topology, repo, published) : null;
	return {
		candidate,
		published: Boolean(published),
		adoption,
		adopted: Boolean(adoption) && adoption.every((consumer) => consumer.adopted),
		consumers: adoption ? consumerEntries(topology, adoption) : null,
	};
}

/** The problem of the train manifest at `path`, once every consumer adopted the candidate. */
export function observeTrainManifest(ctx, base, seen, path) {
	if (!seen.adopted) return null;
	return manifestProblem(ctx.root, ctx.topology, ctx.repo, originJson(ctx.dir, path), { candidate: seen.candidate, finalTag: base.finalTag, sha: ctx.sha, consumers: true });
}
