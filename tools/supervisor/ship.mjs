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
 */
import { bindingProblems } from "./binding.mjs";
import { closeTrain } from "./close.mjs";
import { executeCommit, planCommit, renderCommitPlan } from "./commit.mjs";
import { releaseTrain } from "./consumerRelease.mjs";
import { convergeTrain } from "./converge.mjs";
import { concernedRepos } from "./digest.mjs";
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

	if (hasWork(plan)) {
		process.stderr.write(renderCommitPlan(`train ${train.id}`, plan));
		for (const line of executeCommit(plan)) console.log(line);
		console.log("");
	}

	const committed = readTrain(file, topology);
	if (bindingProblems(root, topology, committed).length > 0) {
		const presentation = presentTrain(root, topology, committed);
		writeTrain(file, { ...committed, presentation }, topology);
		console.log(renderPresentation(committed, presentation));
		if (!presentation.presentable) throw new SupervisorError(`ship: train "${train.id}" is not presentable; nothing was published`, 1);
		console.log("");
	}

	const { code, published } = publishTrain(context, file, { run: true });
	if (code !== 0) return code;
	if (!published) throw new SupervisorError(`ship: the step above is left to a person; train "${train.id}" is not published and nothing after it was run`, 1);
	for (const link of [convergeTrain, releaseTrain, closeTrain]) {
		console.log("");
		const status = link(context, file, { run: true });
		if (status !== 0) return status;
	}
	return 0;
}
