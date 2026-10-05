/**
 * `supervise close`: end a train on its proofs, the coordination issue last.
 *
 * Closing needs a convergence that passed, a presentation that still holds, and
 * every repository still descending from the SHA the convergence was proved
 * on: after it, the presentation admits only train files, which is what a
 * train record is. Then the consumer releases, the coordinator last, which
 * `supervise release` published and close only observes: each has a GitHub
 * release of `v<version>`, and a tag on main that pins every final. Anything
 * missing is named, and nothing is closed. Without `--run`, only what would
 * be closed is shown.
 */
import { gh, ghJson, releaseExists } from "./gh.mjs";
import { assertBinding } from "./binding.mjs";
import { isAncestor, revParse } from "./git.mjs";
import { pinGaps, publishedProviders } from "./converge.mjs";
import { releaseTargets, releaseUrl, tagCommit, versionAt } from "./consumerRelease.mjs";
import { readTrain, writeTrain } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

/** The release of each consumer, the coordinator last, or the reasons it is not there yet. */
function consumerReleases(root, topology, train, published) {
	const releases = [];
	const problems = [];
	for (const repo of releaseTargets(topology, train)) {
		const dir = repoDir(root, repo);
		const version = versionAt(dir, "origin/main");
		if (!version) {
			problems.push(`${repo.id}: no readable version in package.json on origin/main`);
			continue;
		}
		const tag = `v${version}`;
		if (!releaseExists(repo.repository, tag)) {
			problems.push(`${repo.id}: the release ${tag} of ${repo.repository} does not exist on GitHub; run supervise release --run first`);
			continue;
		}
		const sha = tagCommit(dir, tag);
		const main = revParse(dir, "origin/main");
		if (!sha || !main || !isAncestor(dir, sha, main)) {
			problems.push(`${repo.id}: the tag ${tag} of ${repo.repository} ${sha ? `points to ${sha.slice(0, 10)}, which is not on main` : "is not on origin"}`);
			continue;
		}
		const gaps = pinGaps(root, topology, published, sha).filter((gap) => gap.consumer === repo.id);
		if (gaps.length > 0) {
			problems.push(`${repo.id}: the release ${tag} does not pin every final: ${gaps.map((gap) => gap.message.replace(`${repo.id}: `, "")).join("; ")}`);
			continue;
		}
		releases.push({ repo: repo.id, version, tag, sha, url: releaseUrl(repo, tag) });
	}
	return { releases, problems };
}

function closingComment(train, published, releases) {
	const lines = [`Train \`${train.id}\` closed by the supervisor, on these proofs:`, ""];
	for (const { repo, final } of published) lines.push(`- ${repo.id} ${final.tag}: ${final.url} (sha256 \`${final.sha256}\`)`);
	for (const release of releases) lines.push(`- ${release.repo} ${release.tag} at \`${release.sha.slice(0, 10)}\`: ${release.url}`);
	lines.push("", `Convergence ${train.convergence.status} at ${train.convergence.at}:`);
	for (const check of train.convergence.checks) lines.push(`- ${check.status === 0 ? "passed" : `failed (exit ${check.status})`}: ${check.repo}: \`${check.command.join(" ")}\``);
	for (const note of train.convergence.notes) lines.push(`- note: ${note}`);
	return lines.join("\n");
}

export function closeTrain(context, file, { run = false } = {}) {
	const { root, topology } = context;
	const train = readTrain(file, topology);
	if (train.status !== "open") throw new SupervisorError(`close: train "${train.id}" is already closed`);
	const published = publishedProviders(topology, train, "close");
	if (train.convergence?.status !== "passed") {
		throw new SupervisorError(`close: the convergence of train "${train.id}" ${train.convergence ? "failed" : "was never proved"}; run supervise converge first; nothing was closed`, 1);
	}
	assertBinding(root, topology, train);
	const problems = [];
	for (const { repo: id, sha } of train.convergence.repos) {
		const dir = repoDir(root, repoById(topology, id));
		const main = revParse(dir, "origin/main");
		if (!main || !isAncestor(dir, sha, main)) problems.push(`${id}: origin/main no longer descends from ${sha.slice(0, 10)}, where the convergence was proved; run supervise converge again`);
	}
	problems.push(...pinGaps(root, topology, published).map((gap) => `${gap.message}; run supervise converge again`));
	const { releases, problems: releaseProblems } = consumerReleases(root, topology, train, published);
	problems.push(...releaseProblems);
	if (problems.length > 0) throw new SupervisorError(`close: train "${train.id}" cannot close yet; nothing was closed\n  ${problems.join("\n  ")}`, 1);

	const issues = [...train.items.map((item) => ({ repo: repoById(topology, item.repo), number: item.issue })), { repo: repoById(topology, train.coordinationIssue.repo), number: train.coordinationIssue.number }];
	console.log(`Train ${train.id} can close:`);
	for (const release of releases) console.log(`- ${release.repo} ${release.tag} at ${release.sha.slice(0, 10)}: ${release.url}`);
	for (const issue of issues) console.log(`- close ${issue.repo.repository}#${issue.number} with the closing comment`);
	if (!run) {
		console.log("Nothing was closed. Close it with: pnpm supervise close --run");
		return 0;
	}

	writeTrain(file, { ...readTrain(file, topology), consumerReleases: releases }, topology);
	const comment = closingComment({ ...train, consumerReleases: releases }, published, releases);
	for (const issue of issues) {
		const state = ghJson(["issue", "view", String(issue.number), "-R", issue.repo.repository, "--json", "state"]).state;
		const args = state === "CLOSED"
			? ["issue", "comment", String(issue.number), "-R", issue.repo.repository, "--body", comment]
			: ["issue", "close", String(issue.number), "-R", issue.repo.repository, "--comment", comment];
		const result = gh(args);
		if (result.status !== 0) throw new SupervisorError(`close: gh ${args.slice(0, 3).join(" ")} on ${issue.repo.repository} failed: ${result.stderr.trim()}; run supervise close --run again`, 1);
	}
	writeTrain(file, { ...readTrain(file, topology), status: "closed", closedAt: new Date().toISOString() }, topology);
	console.log(`Train ${train.id} is closed; ${train.coordinationIssue.url} was closed last.`);
	return 0;
}
