/**
 * The approval: recorded only by an interactive gesture, then checked before
 * every publication.
 *
 * After the approval, a repository may only receive the commits the train
 * itself needs: they touch its train files and nothing else, and every
 * release URL or SRI they introduce belongs to an archive the train observed
 * (its candidate or its final). Anything else is a changed result, which goes
 * back to `present`.
 */
import { createInterface } from "node:readline/promises";
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

/** Every reason the recorded approval no longer holds; an empty list means it holds. */
export function approvalProblems(root, topology, train, { fetch = true } = {}) {
	const approval = train.approval;
	if (!approval) return [{ message: `train "${train.id}" has no approval: run supervise present, then supervise approve` }];
	const problems = [];
	const recomputed = computeDigest({ id: train.id, repos: approval.repos, trainFiles: approval.trainFiles, publications: approval.publications });
	if (recomputed !== approval.digest) {
		problems.push({ message: `the approval block was edited: its digest ${approval.digest} no longer matches its content (${recomputed})` });
		return problems;
	}
	const known = knownArchives(train);
	for (const { repo: id, sha } of approval.repos) {
		const repo = repoById(topology, id);
		if (!repo) {
			problems.push({ repo: id, message: `${id} is no longer in the topology` });
			continue;
		}
		const admitted = { trainFiles: approval.trainFiles[id] ?? [] };
		const dir = repoDir(root, repo);
		if (fetch) fetchOrigin(dir);
		const head = revParse(dir, "origin/main");
		if (!head || git(dir, ["cat-file", "-e", `${sha}^{commit}`]).status !== 0 || !isAncestor(dir, sha, head)) {
			problems.push({ repo: id, message: `${id}: origin/main no longer descends from the approved commit ${sha.slice(0, 10)}` });
			continue;
		}
		const commits = gitOut(dir, ["rev-list", "--reverse", `${sha}..${head}`]).split("\n").filter(Boolean);
		for (const commit of commits) {
			const files = gitOut(dir, ["diff", "--name-only", `${commit}^1`, commit]).split("\n").filter(Boolean);
			for (const file of files.filter((entry) => !isTrainFile(admitted, entry))) {
				problems.push({ repo: id, commit, file, message: `${id}: commit ${commit.slice(0, 10)} changes ${file}, outside the train files admitted by the approval` });
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

/** Throws unless the approval holds; the message sends back to `present`. */
export function assertApproval(root, topology, train, options) {
	const problems = approvalProblems(root, topology, train, options);
	if (problems.length > 0) {
		throw new SupervisorError(`approval of train "${train.id}" does not hold:\n  ${problems.map((problem) => problem.message).join("\n  ")}\nPresent the train again: supervise present`, 1);
	}
}

/** Ask for the train id on a terminal; nothing else counts as an approval. */
export async function askTrainId(id) {
	if (!process.stdin.isTTY) {
		throw new SupervisorError("approve needs an interactive terminal: the approval is the train id typed by you, there is no --yes", 1);
	}
	const prompt = createInterface({ input: process.stdin, output: process.stderr });
	try {
		const answer = (await prompt.question(`Type the train id (${id}) to approve, anything else to refuse: `)).trim();
		return answer === id;
	} finally {
		prompt.close();
	}
}
