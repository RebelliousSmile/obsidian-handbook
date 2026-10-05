/**
 * The binding: what `present` showed, checked before every publication.
 *
 * A presentation binds each concerned repository to the commit its
 * validations ran on. After it, a repository may only receive the commits the
 * train itself needs: they touch its train files and nothing else, and every
 * release URL or SRI they introduce belongs to an archive the train observed
 * (its candidate or its final). Anything else is a changed result, which goes
 * back to `present`.
 *
 * The fingerprint guards against an accidental edit of the train record, not
 * against a deliberate one: it is recomputed from the record itself.
 */
import { fetchOrigin, git, gitOut, isAncestor, revParse } from "./git.mjs";
import { computeDigest } from "./digest.mjs";
import { isTrainFile, repoById, repoDir, SupervisorError } from "./topology.mjs";

const RELEASE_URL = /https:\/\/github\.com\/[^\s"'{},]+\/releases\/download\/[^\s"'{},]+/g;
const SRI = /sha512-[A-Za-z0-9+/]+={0,2}/g;

/** URLs and SRIs of every archive the train observed. */
export function knownArchives(train) {
	const known = new Set();
	for (const provider of Object.keys(train.publication ?? {})) {
		const entry = train.publication[provider] ?? {};
		for (const archive of [entry.candidate, entry.final]) {
			if (!archive) continue;
			if (archive.url) known.add(archive.url);
			if (archive.integrity) known.add(archive.integrity);
		}
	}
	return known;
}

function addedLines(dir, commit) {
	const diff = gitOut(dir, ["diff", "--unified=0", "--no-color", "--no-ext-diff", `${commit}^1`, commit]);
	const lines = [];
	let file = null;
	for (const line of diff.split("\n")) {
		if (line.startsWith("+++ ")) file = line.replace(/^\+\+\+ (b\/)?/, "");
		else if (line.startsWith("+")) lines.push({ file, text: line.slice(1) });
	}
	return lines;
}

/** Every reason the recorded presentation no longer binds the train; an empty list means it holds. */
export function bindingProblems(root, topology, train, { fetch = true } = {}) {
	const presentation = train.presentation;
	if (!presentation) return [{ message: `train "${train.id}" was never presented` }];
	if (!presentation.presentable) {
		return [{ message: `the last presentation of train "${train.id}" is not presentable:\n    ${presentation.reasons.join("\n    ")}` }];
	}
	const problems = [];
	const recomputed = computeDigest({ id: train.id, repos: presentation.repos, trainFiles: presentation.trainFiles, publications: presentation.publications });
	if (recomputed !== presentation.digest) {
		problems.push({ message: `the presentation was edited after present: its digest ${presentation.digest} no longer matches its content (${recomputed})` });
		return problems;
	}
	const known = knownArchives(train);
	for (const { repo: id, sha } of presentation.repos) {
		const repo = repoById(topology, id);
		if (!repo) {
			problems.push({ repo: id, message: `${id} is no longer in the topology` });
			continue;
		}
		const admitted = { trainFiles: presentation.trainFiles[id] ?? [] };
		const dir = repoDir(root, repo);
		if (fetch) fetchOrigin(dir);
		const head = revParse(dir, "origin/main");
		if (!head || git(dir, ["cat-file", "-e", `${sha}^{commit}`]).status !== 0 || !isAncestor(dir, sha, head)) {
			problems.push({ repo: id, message: `${id}: origin/main no longer descends from the presented commit ${sha.slice(0, 10)}` });
			continue;
		}
		const commits = gitOut(dir, ["rev-list", "--reverse", `${sha}..${head}`]).split("\n").filter(Boolean);
		for (const commit of commits) {
			const files = gitOut(dir, ["diff", "--name-only", `${commit}^1`, commit]).split("\n").filter(Boolean);
			for (const file of files.filter((entry) => !isTrainFile(admitted, entry))) {
				problems.push({ repo: id, commit, file, message: `${id}: commit ${commit.slice(0, 10)} changes ${file}, outside the train files admitted by the presentation` });
			}
			for (const { file, text } of addedLines(dir, commit)) {
				// A YAML key (`name@url:`) or a sentence leaves punctuation after the URL.
				const urls = (text.match(RELEASE_URL) ?? []).map((url) => url.replace(/[:.,;)]+$/, ""));
				for (const value of new Set([...urls, ...(text.match(SRI) ?? [])])) {
					if (!known.has(value)) {
						problems.push({ repo: id, commit, file, message: `${id}: commit ${commit.slice(0, 10)} introduces ${value} in ${file}, which is not an archive observed by the train` });
					}
				}
			}
		}
	}
	return problems;
}

/** Throws unless the presentation still binds the train; the message sends back to `present`. */
export function assertBinding(root, topology, train, options) {
	const problems = bindingProblems(root, topology, train, options);
	if (problems.length > 0) {
		throw new SupervisorError(`presentation of train "${train.id}" does not hold:\n  ${problems.map((problem) => problem.message).join("\n  ")}\nPresent the train again: supervise present`, 1);
	}
}

/** The commit `present` bound a repository to. */
export function boundSha(train, repo) {
	const entry = (train.presentation?.repos ?? []).find((candidate) => candidate.repo === repo.id);
	if (!entry) throw new SupervisorError(`${repo.id} is not bound by the presentation of train "${train.id}"`, 1);
	return entry.sha;
}
