/**
 * `supervise publish`: observe a provider, compute its one next step, then
 * show it, or with `--run` execute it and observe again: workflows dispatched
 * and watched, runs in progress watched, consumers adopting the candidate,
 * release-train files landed, the final tag pushed. It stops only on a step
 * that needs a person, or on a failure, which it names.
 *
 * Nothing moves without a presentation that holds: it is checked before every
 * step, not once at the start, because a repository can move while a run is
 * watched. One provider at a time, in the dependency order of the train. A
 * step is recomputed from what GitHub and the repositories show; the runs the
 * train records only say which dispatch was already tried, so a failed run is
 * retried while a published candidate is never published again.
 *
 * A step a provider rehearses (`rehearse.mjs`) is run only once its rehearsal
 * is green: a manifest its own workflow would refuse is neither landed nor
 * dispatched.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { gh, ghJson } from "./gh.mjs";
import { showFile } from "./git.mjs";
import { assertBinding, boundSha } from "./binding.mjs";
import { dispatchInputs, listReleases, observeArchive, workflowSecrets } from "./adapters/common.mjs";
import * as pbta from "./adapters/pbta.mjs";
import * as adrenaline from "./adapters/adrenaline.mjs";
import * as mist from "./adapters/mist.mjs";
import { adoptArchive, landFiles, pushTag, readyCheckout } from "./land.mjs";
import { rehearsalCommands, rehearse } from "./rehearse.mjs";
import { readTrain, trainsDir, writeTrain } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";
import { spawnCommand } from "./spawn.mjs";

const ADAPTERS = { pbta, adrenaline, mist };

const POLL_MS = 2000;
const POLL_ATTEMPTS = 30;
const WATCH_MS = 15000;
/** How long one command follows one run: a release takes minutes, so a run still open after this is looked at by a person. */
const WATCH_LIMIT_MS = 30 * 60 * 1000;
const FOLLOW_COMMAND = "pnpm supervise publish --run";

export function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Follow a run until it completes and return its conclusion. One line per
 * status change: `gh run watch` redraws every job each few seconds, which
 * buries the supervisor's own lines in a log.
 *
 * The watch is bounded: past `limitMs` it stops and names the run, its last
 * status and `command`, which follows the same run again. A run `waiting` is
 * held by the required reviewers of an environment and no amount of watching
 * ends it, so it stops at once. The two delays are parameters for the harness alone: no
 * command sets them.
 */
export function followRun(repo, run, command, { watchMs = WATCH_MS, limitMs = WATCH_LIMIT_MS } = {}) {
	const deadline = Date.now() + limitMs;
	let last = null;
	for (;;) {
		const view = ghJson(["run", "view", String(run.id), "-R", repo.repository, "--json", "status,conclusion"]);
		if (view.status === "completed") {
			console.log(`  completed: ${view.conclusion || "unknown"}`);
			return view.conclusion || "unknown";
		}
		if (view.status !== last) console.log(`  ${view.status}`);
		last = view.status;
		if (last === "waiting") {
			throw new SupervisorError(`run ${run.url} is waiting: the release environment still has required reviewers; remove them, then run the command again: ${command}`, 1);
		}
		if (Date.now() >= deadline) {
			throw new SupervisorError(`run ${run.url} did not complete within ${limitMs / 60000} minutes, its last status was ${last}; nothing was dispatched again, follow it with: ${command}`, 1);
		}
		sleep(watchMs);
	}
}

/** Providers of the train in dependency order; items order breaks ties. */
export function providerOrder(topology, train) {
	const placed = [];
	const remaining = [...train.items];
	while (remaining.length > 0) {
		const index = remaining.findIndex((item) => item.dependsOn.every((dependency) => placed.includes(dependency)));
		placed.push(remaining.splice(index < 0 ? 0 : index, 1)[0].repo);
	}
	return placed.map((id) => repoById(topology, id)).filter((repo) => repo.role === "provider");
}

function updateRecord(file, topology, provider, change) {
	const train = readTrain(file, topology);
	const record = { ...(train.publication[provider] ?? {}) };
	change(record);
	writeTrain(file, { ...train, publication: { ...train.publication, [provider]: record } }, topology);
	return record;
}

/** Ask GitHub for the conclusion of the runs the train recorded without one. */
function refreshRuns(file, topology, repo, record) {
	const open = (record.runs ?? []).filter((run) => run.id && run.conclusion === null);
	if (open.length === 0) return record;
	const conclusions = new Map(open.map((run) => {
		const view = ghJson(["run", "view", String(run.id), "-R", repo.repository, "--json", "status,conclusion"]);
		return [run.id, view.status === "completed" ? view.conclusion || "unknown" : null];
	}));
	return updateRecord(file, topology, repo.id, (next) => {
		next.runs = next.runs.map((run) => (conclusions.has(run.id) ? { ...run, conclusion: conclusions.get(run.id) } : run));
	});
}

/** Observe one provider, record what it showed, and return its next step. */
function stepOf(context, train, file, repo) {
	const adapter = ADAPTERS[repo.adapter];
	if (!adapter) throw new SupervisorError(`publish: ${repo.id} has no known adapter (${repo.adapter ?? "none"})`);
	const dir = repoDir(context.root, repo);
	const sha = boundSha(train, repo);
	let manifest;
	try {
		manifest = JSON.parse(showFile(dir, sha, "package.json") ?? "");
	} catch {
		throw new SupervisorError(`publish: ${repo.id} has no readable package.json at the presented commit ${sha.slice(0, 10)}`, 1);
	}
	const record = refreshRuns(file, context.topology, repo, train.publication[repo.id] ?? {});
	const version = manifest.version;
	const finalTag = `v${version}`;
	const tags = listReleases(repo);
	const final = tags.includes(finalTag) ? observeArchive(repo, finalTag, version) : null;
	const ctx = {
		root: context.root,
		topology: context.topology,
		repo,
		dir,
		sha,
		version,
		record,
		evidenceDir: resolve(trainsDir(context.root, context.topology), `${train.id}.evidence`),
	};
	const observation = adapter.observe(ctx, { repo, provider: repo.id, sha, version, tags, finalTag, final });
	const { candidate } = observation;
	if (final) {
		if (!candidate) {
			throw new SupervisorError(`publish: ${repo.id} ${finalTag} is already published and the train never observed its candidate; bump the version of ${repo.id} or close the train`, 1);
		}
		if (final.sha256 !== candidate.sha256) {
			throw new SupervisorError(`publish: ${repo.id} final ${finalTag} has sha256 ${final.sha256}, its candidate ${candidate.tag} has sha256 ${candidate.sha256}: not the same bytes`, 1);
		}
	}
	const changed = (candidate && record.candidate?.sha256 !== candidate.sha256) || (final && record.final?.sha256 !== final.sha256);
	if (changed) {
		updateRecord(file, context.topology, repo.id, (next) => {
			if (candidate) next.candidate = candidate;
			if (final) next.final = final;
		});
	}
	return { repo, dir, evidenceDir: ctx.evidenceDir, step: adapter.nextStep(observation) };
}

export function quote(argument) {
	return /^[A-Za-z0-9_./:=@%+-]+$/.test(argument) ? argument : `'${argument.replace(/'/g, "'\\''")}'`;
}

/** The inputs of a dispatch are exactly those its workflow declares on origin/main. */
function checkInputs(dir, step) {
	const text = showFile(dir, "origin/main", `.github/workflows/${step.workflow}`);
	if (text === null) throw new SupervisorError(`publish: ${step.repo} has no .github/workflows/${step.workflow} on origin/main`, 1);
	const declared = dispatchInputs(text);
	if (!declared) throw new SupervisorError(`publish: ${step.repo} ${step.workflow} has no workflow_dispatch trigger`, 1);
	const problems = [];
	for (const name of Object.keys(step.inputs)) {
		if (!declared[name]) problems.push(`input ${name} is not declared`);
		else if (!step.inputs[name]) problems.push(`input ${name} is empty`);
	}
	for (const name of Object.keys(declared)) {
		if (declared[name].required && !(name in step.inputs)) problems.push(`required input ${name} is missing`);
	}
	if (problems.length > 0) throw new SupervisorError(`publish: ${step.repo} ${step.workflow}: ${problems.join("; ")}`, 1);
	return text;
}

/** What `--run` needs before anything is dispatched or run: a gh session, and every secret the workflow a step starts reads. */
function preflight(repo, step, workflowText) {
	const auth = gh(["auth", "status"]);
	if (auth.status !== 0) throw new SupervisorError(`publish: gh is not authenticated (gh auth status: ${(auth.stderr || auth.stdout).trim()}); nothing was run`, 1);
	if (!workflowText) return;
	const needed = workflowSecrets(workflowText);
	if (needed.length === 0) return;
	const listed = gh(["secret", "list", "-R", repo.repository, "--json", "name"]);
	if (listed.status !== 0) throw new SupervisorError(`publish: cannot list the secrets of ${repo.repository} (${listed.stderr.trim()}); ${step.workflow} needs ${needed.join(", ")}; nothing was run`, 1);
	const present = new Set(JSON.parse(listed.stdout).map((secret) => secret.name));
	const missing = needed.filter((name) => !present.has(name));
	if (missing.length > 0) {
		throw new SupervisorError(`publish: ${repo.repository} lacks the secret ${missing.join(", ")} that ${step.workflow} reads; nothing was run`, 1);
	}
}

function runIds(repo, workflow) {
	return ghJson(["run", "list", "-R", repo.repository, "--workflow", workflow, "--limit", "20", "--json", "databaseId,url"]);
}

function dispatch(file, topology, repo, step) {
	const before = new Set(runIds(repo, step.workflow).map((run) => run.databaseId));
	const started = gh(step.command.slice(1));
	if (started.status !== 0) throw new SupervisorError(`publish: ${step.command.join(" ")} failed: ${started.stderr.trim()}`, 1);
	let run = null;
	for (let attempt = 0; attempt < POLL_ATTEMPTS && !run; attempt++) {
		if (attempt > 0) sleep(POLL_MS);
		run = runIds(repo, step.workflow).find((candidate) => !before.has(candidate.databaseId)) ?? null;
	}
	if (!run) throw new SupervisorError(`publish: ${step.workflow} was dispatched on ${repo.repository} but no new run appeared; look at its Actions page before running publish again`, 1);
	const entry = { step: step.step, workflow: step.workflow, inputs: step.inputs, id: run.databaseId, url: run.url, conclusion: null, at: new Date().toISOString() };
	updateRecord(file, topology, repo.id, (next) => {
		next.runs = [...(next.runs ?? []), entry];
	});
	console.log(`Watching ${run.url}`);
	const conclusion = followRun(repo, { id: run.databaseId, url: run.url }, FOLLOW_COMMAND);
	updateRecord(file, topology, repo.id, (next) => {
		next.runs = next.runs.map((recorded) => (recorded.id === run.databaseId ? { ...recorded, conclusion } : recorded));
	});
	if (conclusion !== "success") throw new SupervisorError(`publish: ${step.workflow} run ${run.url} concluded ${conclusion}; run supervise publish again once it is understood`, 1);
}

/** Watch a run until it concludes; a failure stops here rather than being dispatched again unseen. */
function watch(repo, step) {
	if (!step.id) throw new SupervisorError(`publish: ${step.instruction}; its run id is unknown, so it cannot be watched`, 1);
	console.log(`Watching ${step.run}`);
	const conclusion = followRun(repo, { id: step.id, url: step.run }, FOLLOW_COMMAND);
	if (conclusion !== "success") {
		throw new SupervisorError(`publish: run ${step.run} concluded ${conclusion}; run supervise publish again once it is understood`, 1);
	}
}

/** Push the final tag, then wait for the run of `step.workflow` the push started: the next observation follows it. */
function tag(context, repo, step) {
	pushTag(context.root, context.topology, step, "publish");
	for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
		if (attempt > 0) sleep(POLL_MS);
		const runs = ghJson(["run", "list", "-R", repo.repository, "--workflow", step.workflow, "--limit", "20", "--json", "databaseId,headBranch"]);
		if (runs.some((run) => run.headBranch === step.tag)) return;
	}
	throw new SupervisorError(`publish: ${step.tag} was pushed on ${repo.repository} but no ${step.workflow} run appeared for it; look at its Actions page before running publish again`, 1);
}

function runLocal(file, topology, repo, dir, evidenceDir, step) {
	readyCheckout(repo, dir, "publish");
	mkdirSync(evidenceDir, { recursive: true });
	console.log(`$ ${step.command.map(quote).join(" ")}   (in ${dir})`);
	const result = spawnCommand(step.command[0], step.command.slice(1), { cwd: dir, stdio: "inherit" });
	const conclusion = !result.error && result.status === 0 ? "success" : "failure";
	updateRecord(file, topology, repo.id, (next) => {
		next.runs = [...(next.runs ?? []), { step: step.step, command: step.command, conclusion, at: new Date().toISOString() }];
	});
	if (conclusion !== "success") throw new SupervisorError(`publish: ${step.command.join(" ")} failed in ${dir}`, 1);
}

function render(repo, dir, step) {
	if (step.kind === "human") return `Next step for ${step.repo} (a person):\n  ${step.instruction.split("\n").join("\n  ")}\nThen run supervise publish again.`;
	if (step.kind === "wait") return `Waiting on ${repo.id}: ${step.instruction}`;
	if (step.type === "adopt") return `Next step for ${repo.id}: ${step.description}\n  ${step.archive.url}\n  ${step.archive.integrity}`;
	const where = step.type === "workflow" ? "" : ` (in ${dir})`;
	return `Next step for ${repo.id}: ${step.description}\n  $ ${step.command.map(quote).join(" ")}${where}`;
}

/** The identity of an automated step: the same one coming back after it succeeded means it changed nothing. */
function stepKey(step) {
	return JSON.stringify([step.repo, step.type, step.step, step.command, step.inputs ?? null]);
}

function execute(context, file, next) {
	const { repo, dir, evidenceDir, step } = next;
	const { topology } = context;
	if (step.type === "workflow") dispatch(file, topology, repo, step);
	else if (step.type === "local") runLocal(file, topology, repo, dir, evidenceDir, step);
	else if (step.type === "adopt") adoptArchive(context.root, topology, repo, step.archive, step.consumers, { validate: step.validate, label: "publish", train: readTrain(file, topology).id });
	else if (step.type === "land") landFiles(context.root, topology, step, "publish");
	else if (step.type === "tag") tag(context, repo, step);
	else throw new SupervisorError(`publish: unknown step type ${step.type}`);
}

/** Returns the exit code, and whether every provider of the train has its final. */
export function publishTrain(context, file, { run = false } = {}) {
	const ran = new Set();
	for (;;) {
		const train = readTrain(file, context.topology);
		if (train.status !== "open") throw new SupervisorError(`publish: train "${train.id}" is closed`);
		assertBinding(context.root, context.topology, train);
		let next = null;
		for (const repo of providerOrder(context.topology, train)) {
			const current = readTrain(file, context.topology);
			const found = stepOf(context, current, file, repo);
			if (found.step.kind !== "done") {
				next = found;
				break;
			}
			console.log(`${repo.id}: final ${current.publication[repo.id]?.final?.tag ?? ""} published, same bytes as its candidate.`);
		}
		if (!next) {
			console.log(`Every provider of train ${train.id} is published.`);
			return { code: 0, published: true };
		}
		const { repo, dir, step } = next;
		const workflowText = step.type === "workflow" ? checkInputs(dir, step)
			: step.type === "tag" ? showFile(dir, "origin/main", `.github/workflows/${step.workflow}`) ?? ""
				: null;
		console.log(render(repo, dir, step));
		for (const command of rehearsalCommands(repo, step)) console.log(`  rehearsed first: $ ${command.map(quote).join(" ")} (in ${dir})`);
		if (step.kind === "human") return { code: 0, published: false };
		if (!run) {
			console.log(step.kind === "wait" ? "Watch it with: pnpm supervise publish --run" : "Nothing was run. Run it with: pnpm supervise publish --run");
			return { code: 0, published: false };
		}
		if (step.kind === "wait") {
			watch(repo, step);
			continue;
		}
		const key = stepKey(step);
		if (ran.has(key)) throw new SupervisorError(`publish: ${repo.id}: "${step.description}" succeeded, yet it is still the next step; look at ${repo.id} before running publish again`, 1);
		ran.add(key);
		preflight(repo, step, workflowText);
		assertBinding(context.root, context.topology, readTrain(file, context.topology));
		rehearse(context.root, context.topology, train.id, repo, dir, step);
		execute(context, file, next);
	}
}
