/**
 * Which items of a train are done, ready or blocked, recomputed from GitHub
 * on every call. Nothing of it is stored.
 *
 * An item is done when its issue is closed and its closing commit (the merge
 * commit of the closing pull request, or the commit of the "closed" event) is
 * reachable from the repository's origin/main. The local checkout does not
 * matter: a clone that has not pulled does not hold back a merged item.
 */
import { gh, ghJson } from "./gh.mjs";
import { fetchOrigin, git, isAncestor } from "./git.mjs";
import { repoById, repoDir } from "./topology.mjs";

function closingCommit(repository, number, issue) {
	for (const reference of issue.closedByPullRequestsReferences ?? []) {
		const pr = gh(["pr", "view", String(reference.number), "-R", repository, "--json", "number,state,mergeCommit"]);
		if (pr.status !== 0) continue;
		const oid = JSON.parse(pr.stdout).mergeCommit?.oid;
		if (oid) return { sha: oid, via: `pull request #${reference.number}` };
	}
	const events = gh(["api", `repos/${repository}/issues/${number}/events`]);
	if (events.status === 0) {
		const closed = JSON.parse(events.stdout).filter((event) => event.event === "closed" && event.commit_id);
		if (closed.length > 0) return { sha: closed[closed.length - 1].commit_id, via: "closing commit" };
	}
	return null;
}

/** State of one item, read from GitHub and the repository's origin/main. */
export function observeItem(root, topology, item, fetched) {
	const repo = repoById(topology, item.repo);
	const issue = ghJson(["issue", "view", String(item.issue), "-R", repo.repository, "--json", "number,title,state,url,closedByPullRequestsReferences"]);
	if (issue.state !== "CLOSED") return { state: "open" };
	const dir = repoDir(root, repo);
	if (!fetched.has(repo.id)) {
		fetchOrigin(dir);
		fetched.add(repo.id);
	}
	const commit = closingCommit(repo.repository, item.issue, issue);
	if (!commit) {
		return { state: "closed-unproven", reason: "closed without a closing commit or merged pull request" };
	}
	if (git(dir, ["cat-file", "-e", `${commit.sha}^{commit}`]).status !== 0 || !isAncestor(dir, commit.sha, "origin/main")) {
		return { state: "closed-unproven", commit: commit.sha, reason: `${commit.via} ${commit.sha.slice(0, 10)} is not on origin/main` };
	}
	return { state: "done", commit: commit.sha, via: commit.via };
}

/** Every item with its observed state and, when not done, what blocks it. */
export function evaluateTrain(root, topology, train) {
	const fetched = new Set();
	const observed = new Map(train.items.map((item) => [item.repo, observeItem(root, topology, item, fetched)]));
	const items = train.items.map((item) => {
		const own = observed.get(item.repo);
		const label = `${item.repo}#${item.issue}`;
		if (own.state === "done") return { ...item, label, state: "done", commit: own.commit, via: own.via, blockedBy: [] };
		const blockedBy = item.dependsOn
			.map((dependency) => train.items.find((other) => other.repo === dependency))
			.filter((dependency) => observed.get(dependency.repo).state !== "done")
			.map((dependency) => ({ label: `${dependency.repo}#${dependency.issue}`, state: observed.get(dependency.repo).state }));
		if (own.state === "closed-unproven") {
			return { ...item, label, state: "closed-unproven", reason: own.reason, blockedBy };
		}
		return { ...item, label, state: blockedBy.length ? "blocked" : "ready", blockedBy };
	});
	return { id: train.id, title: train.title, status: train.status, items, allDone: items.every((item) => item.state === "done") };
}

export function renderNext(evaluation) {
	const lines = [`Train ${evaluation.id}: ${evaluation.title}`, ""];
	const groups = [
		["ready", "Ready (can move now)"],
		["blocked", "Blocked"],
		["closed-unproven", "Closed without proof"],
		["done", "Done"],
	];
	for (const [state, heading] of groups) {
		const items = evaluation.items.filter((item) => item.state === state);
		if (items.length === 0) continue;
		lines.push(`${heading}:`);
		for (const item of items) {
			if (state === "done") lines.push(`  - ${item.label} ${item.title}: ${item.via} ${item.commit.slice(0, 10)} on origin/main`);
			else if (state === "blocked") lines.push(`  - ${item.label} ${item.title}: blocked by ${item.blockedBy.map((dependency) => `${dependency.label} (${dependency.state})`).join(", ")}`);
			else if (state === "closed-unproven") lines.push(`  - ${item.label} ${item.title}: ${item.reason}; close it from a merged pull request or a commit on main ("Fixes #${item.issue}")`);
			else lines.push(`  - ${item.label} ${item.title}: expected evidence: ${item.expectedEvidence.join("; ") || "-"}`);
		}
		lines.push("");
	}
	if (evaluation.items.length === 0) lines.push("No item yet: link one with supervise link <repo>#<issue>.");
	else if (evaluation.allDone) lines.push("Every item is done: next is supervise present.");
	return lines.join("\n");
}
