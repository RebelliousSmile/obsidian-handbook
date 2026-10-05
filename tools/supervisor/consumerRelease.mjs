/**
 * `supervise release`: publish the release of each consumer of a converged
 * train, the coordinator last.
 *
 * Same shape as the providers: observe a consumer, compute its one next step,
 * then show it, or with `--run` execute it and observe again. The version is
 * the one `package.json` has on origin/main: it was prepared with the change,
 * the supervisor writes neither a version nor a changelog. How a release
 * starts is read in the topology (`release.trigger`, `release.workflow`): a
 * workflow that starts on the push of the tag, or one dispatched on the tag.
 *
 * Nothing moves without a convergence that passed and a presentation that
 * still holds, both checked before every step. A release that exists is
 * recorded in `consumerReleases` and never published again, so the command
 * can be run again at any point. A red run stops before the next consumer.
 */
import { gh, ghJson, releaseExists } from "./gh.mjs";
import { assertBinding } from "./binding.mjs";
import { concernedRepos } from "./digest.mjs";
import { fetchOrigin, gitOut, isAncestor, revParse, showFile } from "./git.mjs";
import { pinGaps, publishedProviders } from "./converge.mjs";
import { pushTag } from "./land.mjs";
import { followRun, quote, sleep } from "./publish.mjs";
import { readTrain, writeTrain } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

const POLL_MS = 2000;
const POLL_ATTEMPTS = 30;
const FOLLOW_COMMAND = "pnpm supervise release --run";

export function versionAt(dir, ref) {
	try {
		return JSON.parse(showFile(dir, ref, "package.json") ?? "").version ?? null;
	} catch {
		return null;
	}
}

/** The commit a remote tag points to, peeled; null when origin has no such tag. */
export function tagCommit(dir, tag) {
	const lines = gitOut(dir, ["ls-remote", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`]).split("\n").filter(Boolean);
	const peeled = lines.find((line) => line.endsWith("^{}")) ?? lines[0];
	return peeled ? peeled.split(/\s+/)[0] : null;
}

/** The repositories a train releases, in order: the consumers as the topology declares them, the coordinator last. */
export function releaseTargets(topology, train) {
	return concernedRepos(topology, train).filter((repo) => repo.role !== "provider");
}

export function releaseUrl(repo, tag) {
	return `https://github.com/${repo.repository}/releases/tag/${tag}`;
}

function releaseRuns(repo, tag) {
	return ghJson(["run", "list", "-R", repo.repository, "--workflow", repo.release.workflow, "--limit", "20", "--json", "databaseId,headBranch,status,conclusion,url"])
		.filter((run) => run.headBranch === tag);
}

/** What origin and GitHub show of the release of `repo` at the version of its origin/main. */
export function observeConsumer(root, repo) {
	const dir = repoDir(root, repo);
	fetchOrigin(dir);
	const version = versionAt(dir, "origin/main");
	const observation = {
		repo: repo.id,
		repository: repo.repository,
		trigger: repo.release?.trigger ?? null,
		workflow: repo.release?.workflow ?? null,
		version,
		tag: version ? `v${version}` : null,
		released: false,
		tagSha: null,
		tagOnMain: false,
		run: null,
	};
	if (!version || !repo.release) return observation;
	const main = revParse(dir, "origin/main");
	observation.released = releaseExists(repo.repository, observation.tag);
	observation.tagSha = tagCommit(dir, observation.tag);
	observation.tagOnMain = Boolean(observation.tagSha && main && isAncestor(dir, observation.tagSha, main));
	if (!observation.released) observation.run = releaseRuns(repo, observation.tag)[0] ?? null;
	return observation;
}

/**
 * The one next step of a consumer release, from its observation alone:
 * `done`, `tag`, `dispatch`, `watch`, or `stop` with what a person must look
 * at. A tag is never pushed twice and never deleted here.
 */
export function nextStep(observation) {
	const { repository, trigger, workflow, version, tag, released, tagSha, tagOnMain, run } = observation;
	const stop = (reason) => ({ kind: "stop", reason });
	if (!workflow) return stop("the topology declares no release for it; add its release block (trigger and workflow) to supervisor/topology.json");
	if (!version) return stop("no readable version in package.json on origin/main");
	if (tagSha && !tagOnMain) return stop(`the tag ${tag} of ${repository} points to ${tagSha.slice(0, 10)}, which is not on main`);
	if (released) return tagSha ? { kind: "done" } : stop(`the release ${tag} of ${repository} exists and origin has no tag ${tag}`);
	if (run && run.status !== "completed") {
		return { kind: "watch", description: `follow the ${workflow} run of ${tag}`, run };
	}
	if (!tagSha) {
		return { kind: "tag", description: `tag origin/main as ${tag}`, command: ["git", "push", "origin", `origin/main:refs/tags/${tag}`] };
	}
	if (run && run.conclusion === "success") return stop(`run ${run.url} succeeded and the release ${tag} of ${repository} does not exist; look at it`);
	if (trigger === "dispatch") {
		return { kind: "dispatch", description: `publish the release ${tag} with ${workflow}`, command: ["gh", "workflow", "run", workflow, "-R", repository, "--ref", tag] };
	}
	if (run) return stop(`run ${run.url} concluded ${run.conclusion || "unknown"}; ${workflow} starts on the push of ${tag} and a tag is not pushed twice: run it again from GitHub, or delete the tag by hand, then run the command again: ${FOLLOW_COMMAND}`);
	return stop(`the tag ${tag} is on origin with no release and no ${workflow} run; ${workflow} starts on the push of the tag and a tag is not pushed twice: delete the tag by hand, then run the command again: ${FOLLOW_COMMAND}`);
}

/** Keep `release` in the train record, in the order of the targets; true when the record changed. */
function recordRelease(file, topology, release) {
	const train = readTrain(file, topology);
	const recorded = train.consumerReleases ?? [];
	if (recorded.some((entry) => JSON.stringify(entry) === JSON.stringify(release))) return false;
	const order = releaseTargets(topology, train).map((repo) => repo.id);
	const releases = [...recorded.filter((entry) => entry.repo !== release.repo), release].sort((left, right) => order.indexOf(left.repo) - order.indexOf(right.repo));
	writeTrain(file, { ...train, consumerReleases: releases }, topology);
	return true;
}

/** Every repository still where the convergence was proved, or after it, and every consumer still on every final. */
function assertConverged(root, topology, train, published) {
	const problems = [];
	for (const { repo: id, sha } of train.convergence.repos) {
		const dir = repoDir(root, repoById(topology, id));
		const main = revParse(dir, "origin/main");
		if (!main || !isAncestor(dir, sha, main)) problems.push(`${id}: origin/main no longer descends from ${sha.slice(0, 10)}, where the convergence was proved`);
	}
	problems.push(...pinGaps(root, topology, published).map((gap) => gap.message));
	if (problems.length > 0) throw new SupervisorError(`release: train "${train.id}" is no longer converged; run supervise converge again; nothing was released\n  ${problems.join("\n  ")}`, 1);
}

function newRun(repo, tag, before) {
	for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
		if (attempt > 0) sleep(POLL_MS);
		const run = releaseRuns(repo, tag).find((candidate) => !before.has(candidate.databaseId));
		if (run) return run;
	}
	return null;
}

function follow(repo, run) {
	console.log(`Watching ${run.url}`);
	const conclusion = followRun(repo, { id: run.databaseId, url: run.url }, FOLLOW_COMMAND);
	if (conclusion !== "success") throw new SupervisorError(`release: ${repo.id}: run ${run.url} concluded ${conclusion}; run supervise release again once it is understood`, 1);
}

function execute(context, repo, observation, step) {
	if (step.kind === "watch") return follow(repo, step.run);
	const before = new Set(releaseRuns(repo, observation.tag).map((run) => run.databaseId));
	if (step.kind === "tag") {
		pushTag(context.root, context.topology, { repo: repo.id, tag: observation.tag }, "release");
		if (observation.trigger !== "tag") return undefined;
	} else {
		const started = gh(step.command.slice(1));
		if (started.status !== 0) throw new SupervisorError(`release: ${step.command.join(" ")} failed: ${started.stderr.trim()}`, 1);
	}
	const run = newRun(repo, observation.tag, before);
	if (!run) throw new SupervisorError(`release: ${repo.id}: ${observation.workflow} was started for ${observation.tag} on ${repo.repository} but no run appeared; look at its Actions page before running supervise release again`, 1);
	return follow(repo, run);
}

export function releaseTrain(context, file, { run = false } = {}) {
	const { root, topology } = context;
	const opened = readTrain(file, topology);
	if (opened.status !== "open") throw new SupervisorError(`release: train "${opened.id}" is closed`);
	const published = publishedProviders(topology, opened, "release");
	if (opened.convergence?.status !== "passed") {
		throw new SupervisorError(`release: the convergence of train "${opened.id}" ${opened.convergence ? "failed" : "was never proved"}; run supervise converge first; nothing was released`, 1);
	}
	const ran = new Set();
	let authenticated = false;
	for (const repo of releaseTargets(topology, opened)) {
		for (;;) {
			const train = readTrain(file, topology);
			assertBinding(root, topology, train);
			assertConverged(root, topology, train, published);
			const observation = observeConsumer(root, repo);
			const step = nextStep(observation);
			if (step.kind === "stop") throw new SupervisorError(`release: ${repo.id}: ${step.reason}`, 1);
			if (step.kind === "done") {
				const { version, tag, tagSha } = observation;
				if (run) recordRelease(file, topology, { repo: repo.id, version, tag, sha: tagSha, url: releaseUrl(repo, tag) });
				console.log(`${repo.id}: ${tag} already released at ${tagSha.slice(0, 10)}: ${releaseUrl(repo, tag)}`);
				break;
			}
			console.log(step.kind === "watch"
				? `Next step for ${repo.id}: ${step.description}\n  ${step.run.url}`
				: `Next step for ${repo.id}: ${step.description}\n  $ ${step.command.map(quote).join(" ")}${step.kind === "tag" ? `   (in ${repoDir(root, repo)})` : ""}`);
			if (!run) {
				console.log(`Nothing was run. Run it with: ${FOLLOW_COMMAND}`);
				return 0;
			}
			const key = `${repo.id} ${step.kind}`;
			if (step.kind !== "watch") {
				if (ran.has(key)) throw new SupervisorError(`release: ${repo.id}: "${step.description}" succeeded, yet it is still the next step; look at ${repo.repository} before running supervise release again`, 1);
				ran.add(key);
			}
			if (!authenticated) {
				const auth = gh(["auth", "status"]);
				if (auth.status !== 0) throw new SupervisorError(`release: gh is not authenticated (gh auth status: ${(auth.stderr || auth.stdout).trim()}); nothing was run`, 1);
				authenticated = true;
			}
			execute(context, repo, observation, step);
		}
	}
	console.log(`Every consumer of train ${opened.id} is released. Next: pnpm supervise close --run`);
	return 0;
}
