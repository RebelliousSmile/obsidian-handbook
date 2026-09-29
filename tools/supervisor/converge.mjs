/**
 * `supervise converge`: prove that every consumer adopted every final.
 *
 * Once each provider of the train has its final, the consumers must pin it,
 * in package.json and in every lockfile, on origin/main. A consumer still on
 * a candidate is a person's adoption step, named with the URL it pins and the
 * one it should. Then the consumers' own convergence commands run, and each
 * provider's convergence tool, behind the same guard as `present`: a check
 * cannot release, push or tag. The result is recorded in the train with the
 * SHAs it was proved on; `close` accepts nothing less.
 */
import { resolve } from "node:path";
import { assertApproval } from "./approval.mjs";
import { concernedRepos } from "./digest.mjs";
import { consumerPin } from "./adapters/common.mjs";
import * as pbta from "./adapters/pbta.mjs";
import * as adrenaline from "./adapters/adrenaline.mjs";
import * as mist from "./adapters/mist.mjs";
import { checkCheckouts, runGuarded } from "./present.mjs";
import { providerOrder, quote } from "./publish.mjs";
import { readTrain, trainsDir, writeTrain } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

const ADAPTERS = { pbta, adrenaline, mist };

/** Providers of the train, each with its recorded final; refuses a train with a provider not published yet. */
export function publishedProviders(topology, train, label) {
	const providers = providerOrder(topology, train);
	const missing = providers.filter((repo) => !train.publication?.[repo.id]?.final);
	if (missing.length > 0) {
		throw new SupervisorError(`${label}: ${missing.map((repo) => repo.id).join(", ")} has no final release recorded by the train; run supervise publish first`, 1);
	}
	return providers.map((repo) => ({ repo, final: train.publication[repo.id].final }));
}

/** Every consumer of a train provider whose `ref` does not pin that provider's final, with what it pins instead. */
export function pinGaps(root, topology, published, ref = "origin/main") {
	const gaps = [];
	for (const { repo, final } of published) {
		for (const id of repo.consumers ?? []) {
			const dir = repoDir(root, repoById(topology, id));
			const pin = consumerPin(dir, repo.package, ref);
			const problems = [];
			if (pin.url !== final.url) problems.push(`package.json pins ${pin.url ?? "nothing"}`);
			for (const lockfile of pin.lockfiles) {
				if (lockfile.url !== final.url || lockfile.integrity !== final.integrity) {
					problems.push(`${lockfile.file} resolves ${lockfile.url ?? "nothing"} (${lockfile.integrity ?? "no SRI"})`);
				}
			}
			if (problems.length > 0) gaps.push({ consumer: id, provider: repo.id, final, message: `${id}: ${problems.join("; ")} for ${repo.package}; the final is ${final.url}` });
		}
	}
	return gaps;
}

function adoptionInstruction(gaps) {
	const lines = ["Next step (a person): adopt the finals, and land them on origin/main of each consumer named:"];
	for (const gap of gaps) lines.push(`  ${gap.message}`);
	const finals = new Map(gaps.map((gap) => [gap.provider, gap.final]));
	for (const [provider, final] of finals) lines.push(`  ${provider} ${final.tag}: package.json and every lockfile pin ${final.url}`, `    with integrity ${final.integrity}`);
	lines.push("  then run the consumer's frozen install and checks before committing, and run supervise converge again.");
	return lines.join("\n");
}

function record(file, topology, convergence) {
	const train = readTrain(file, topology);
	writeTrain(file, { ...train, convergence }, topology);
}

export function convergeTrain(context, file) {
	const { root, topology } = context;
	const train = readTrain(file, topology);
	if (train.status !== "open") throw new SupervisorError(`converge: train "${train.id}" is closed`);
	const published = publishedProviders(topology, train, "converge");
	assertApproval(root, topology, train);
	const repos = concernedRepos(topology, train);
	const heads = checkCheckouts(root, repos, "converge");
	const at = new Date().toISOString();
	const shas = repos.map((repo) => ({ repo: repo.id, sha: heads[repo.id] }));
	const checks = [];
	const notes = [];
	const fail = (note, code = 1) => {
		record(file, topology, { status: "failed", at, repos: shas, checks, notes: [...notes, note] });
		return code;
	};

	const gaps = pinGaps(root, topology, published);
	if (gaps.length > 0) {
		console.log(adoptionInstruction(gaps));
		return fail(`consumers do not pin every final: ${gaps.map((gap) => gap.message).join("; ")}`);
	}
	console.log(`Every consumer pins every final on origin/main: ${published.map(({ repo, final }) => `${repo.id} ${final.tag}`).join(", ")}.`);

	const consumers = repos.filter((repo) => repo.role !== "provider");
	for (const repo of consumers) {
		if (!repo.convergence?.length) notes.push(`${repo.id}: no convergence command is configured in the topology`);
		for (const command of repo.convergence ?? []) {
			const result = runGuarded(repoDir(root, repo), command, "converge");
			checks.push({ repo: repo.id, command, status: result.status });
			if (result.status !== 0 && result.tail) console.log(`${repo.id}: ${command.join(" ")} exited ${result.status}\n${result.tail}`);
		}
	}

	for (const { repo, final } of published) {
		const adapter = ADAPTERS[repo.adapter];
		const dir = repoDir(root, repo);
		const ctx = {
			root,
			topology,
			repo,
			dir,
			final,
			finalTag: final.tag,
			version: final.tag.replace(/^v/, ""),
			consumers: (repo.consumers ?? []).map((id) => ({ repo: id, repository: repoById(topology, id).repository, sha: heads[id] })),
			evidenceDir: resolve(trainsDir(root, topology), `${train.id}.evidence`),
		};
		const ran = new Set();
		for (;;) {
			const step = adapter.convergence(adapter.observeConvergence(ctx));
			if (step.kind === "human") {
				console.log(`Next step for ${step.repo} (a person):\n  ${step.instruction.split("\n").join("\n  ")}\nThen run supervise converge again.`);
				return fail(`${repo.id}: waiting on a person: ${step.instruction.split("\n")[0]}`);
			}
			if (step.kind === "automated") {
				if (ran.has(step.command.join(" "))) return fail(`${repo.id}: ${step.command.join(" ")} succeeded and ${dir} shows nothing new; look at it before running supervise converge again`);
				ran.add(step.command.join(" "));
				console.log(`${repo.id}: ${step.description}\n  $ ${step.command.map(quote).join(" ")}   (in ${dir})`);
				const result = runGuarded(dir, step.command, "converge");
				checks.push({ repo: repo.id, command: step.command, status: result.status });
				if (result.status !== 0) {
					if (result.tail) console.log(result.tail);
					return fail(`${repo.id}: ${step.command.join(" ")} exited ${result.status}`);
				}
				continue;
			}
			notes.push(...step.notes);
			for (const command of step.commands) {
				const result = runGuarded(dir, command, "converge");
				checks.push({ repo: repo.id, command, status: result.status });
				if (result.status !== 0 && result.tail) console.log(`${repo.id}: ${command.join(" ")} exited ${result.status}\n${result.tail}`);
			}
			break;
		}
	}

	const failed = checks.filter((check) => check.status !== 0);
	const missing = notes.filter((note) => note.includes("no convergence command"));
	const passed = failed.length === 0 && missing.length === 0;
	record(file, topology, { status: passed ? "passed" : "failed", at, repos: shas, checks, notes });
	console.log(`\nConvergence of train ${train.id}: ${passed ? "passed" : "failed"}`);
	for (const check of checks) console.log(`- ${check.status === 0 ? "passed" : `failed (exit ${check.status})`}: ${check.repo}: ${check.command.join(" ")}`);
	for (const note of notes) console.log(`- note: ${note}`);
	console.log(passed ? "Next: release Lantern, then Handbook, then run supervise close." : "Fix what failed, then run supervise converge again.");
	return passed ? 0 : 1;
}
