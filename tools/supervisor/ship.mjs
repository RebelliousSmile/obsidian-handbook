/**
 * `ship`: one command from a validated change to a closed train.
 *
 * Running it is the validation. It chains the links that already exist, in
 * order: `commit` of every concerned repository, `present`, `publish`,
 * `converge`, `release`, `close`. Each link keeps its own refusals; the first
 * one stops the chain with its own message and a non-zero exit code. Nothing
 * here waits for a person: a stop is always a named failure.
 *
 * It resumes where the train record stands: nothing to commit skips the
 * commit, a presentation that still holds is not run again, and the four
 * links after it are idempotent. Without `--run` it shows what it would do
 * and writes nothing.
 *
 * With `--run`, each step that runs says when it starts and how long it took,
 * and the durations summary of the train (`logs.mjs`) gets one entry per step
 * and one per cycle, green or red, with its exit code.
 */
import { bindingProblems } from "./binding.mjs";
import { closeTrain } from "./close.mjs";
import { executeCommit, planCommit, renderCommitPlan } from "./commit.mjs";
import { releaseTrain } from "./consumerRelease.mjs";
import { convergeTrain } from "./converge.mjs";
import { concernedRepos } from "./digest.mjs";
import { clock, formatDuration, trainLogs } from "./logs.mjs";
import { presentTrain, renderPresentation } from "./present.mjs";
import { publishTrain } from "./publish.mjs";
import { readTrain, writeTrain } from "./train.mjs";
import { concurrentTrain } from "./trainCommands.mjs";
import { SupervisorError } from "./topology.mjs";

const AFTER_PRESENT = ["publish --run", "converge --run", "release --run", "close --run"];

function assertNotEngaged(root, topology, train, repos) {
	for (const repo of repos) {
		const concurrent = concurrentTrain(root, topology, train, repo.id);
		if (concurrent) {
			throw new SupervisorError(`ship: ${repo.id} is already engaged by the open train "${concurrent.id}" (${concurrent.title}); finish or close it first; nothing was committed`, 1);
		}
	}
}

function hasWork(plan) {
	return plan.some((entry) => entry.changes || entry.ahead > 0);
}

function renderDry(train, plan, problems, message) {
	const work = hasWork(plan);
	const lines = [`Ship of train ${train.id}:`, ""];
	if (work) lines.push(renderCommitPlan(`train ${train.id}`, plan).trimEnd());
	else lines.push("commit: nothing to commit or push, skipped");
	lines.push("");
	if (work) lines.push("present: validate every concerned repository on the commits above");
	else if (problems.length > 0) lines.push("present: validate every concerned repository, because", ...problems.map((problem) => `  ${problem.message}`));
	else lines.push("present: the presentation holds, skipped");
	lines.push(...AFTER_PRESENT.map((step) => `then: ${step}`), "");
	lines.push(`Nothing was run. Run it with: pnpm supervise ship${message ? ` --message ${JSON.stringify(message)}` : ""} --run`);
	return lines.join("\n");
}

/**
 * Run one step of the cycle between its starting time and its duration. `code`
 * reads the exit code out of what the step returns; a step that throws is
 * recorded with the exit code of its error, and still throws.
 */
function timed(logs, step, action, code = () => 0) {
	const started = Date.now();
	console.log(`ship: ${step} started at ${clock()}`);
	let status = 1;
	try {
		const value = action();
		status = code(value);
		return value;
	} catch (error) {
		status = error instanceof SupervisorError ? error.exitCode : 1;
		throw error;
	} finally {
		const durationMs = Date.now() - started;
		console.log(`ship: ${step} ${status === 0 ? "took" : `stopped (exit ${status}) after`} ${formatDuration(durationMs)}`);
		logs.record({ kind: "step", step, status, durationMs });
	}
}

/** Returns the exit code. `message` is the commit message of every repository that has none prepared. */
export function shipTrain(context, file, { message = "", run = false } = {}) {
	const { root, topology } = context;
	const train = readTrain(file, topology);
	if (train.status !== "open") throw new SupervisorError(`ship: train "${train.id}" is closed`);
	const repos = concernedRepos(topology, train);
	assertNotEngaged(root, topology, train, repos);
	const plan = planCommit(root, repos, message, { shared: true });
	if (!run) {
		console.log(renderDry(train, plan, bindingProblems(root, topology, train), message));
		return 0;
	}

	const logs = trainLogs(root, topology, train.id);
	const started = Date.now();
	let status = 1;
	try {
		status = runCycle(context, file, train, plan, logs);
		return status;
	} catch (error) {
		status = error instanceof SupervisorError ? error.exitCode : 1;
		throw error;
	} finally {
		const durationMs = Date.now() - started;
		console.log(`\nship: the cycle ${status === 0 ? "took" : `stopped (exit ${status}) after`} ${formatDuration(durationMs)}`);
		logs.record({ kind: "cycle", status, durationMs });
	}
}

function runCycle(context, file, train, plan, logs) {
	const { root, topology } = context;
	if (hasWork(plan)) {
		timed(logs, "commit", () => {
			process.stderr.write(renderCommitPlan(`train ${train.id}`, plan));
			for (const line of executeCommit(plan)) console.log(line);
		});
		console.log("");
	}

	const committed = readTrain(file, topology);
	if (bindingProblems(root, topology, committed).length > 0) {
		timed(logs, "present", () => {
			const presentation = presentTrain(root, topology, committed, logs);
			writeTrain(file, { ...committed, presentation }, topology);
			console.log(renderPresentation(committed, presentation, logs));
			if (!presentation.presentable) throw new SupervisorError(`ship: train "${train.id}" is not presentable; nothing was published`, 1);
		});
		console.log("");
	}

	const { code, published } = timed(logs, "publish", () => publishTrain(context, file, { run: true }), (result) => result.code);
	if (code !== 0) return code;
	if (!published) throw new SupervisorError(`ship: the step above is left to a person; train "${train.id}" is not published and nothing after it was run`, 1);
	for (const [step, link] of [["converge", convergeTrain], ["release", releaseTrain], ["close", closeTrain]]) {
		console.log("");
		const status = timed(logs, step, () => link(context, file, { run: true }), (result) => result);
		if (status !== 0) return status;
	}
	return 0;
}
