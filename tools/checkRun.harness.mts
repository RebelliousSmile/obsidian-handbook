/**
 * The scheduling of `pnpm check` (`checkRun.mjs`), proved on a fake launcher:
 * no script is started, a gate "runs" by giving the exit code the case names.
 */
import assert from "node:assert/strict";
import { runCheck, SUPERVISOR_GATE } from "./checkRun.mjs";

const QUICK = ["build", "lint", "assert:release-version"];
// The supervisor harness sits in the middle, as the alphabetical order of package.json puts it.
const SERIAL = ["assert:alpha", "assert:beta", "assert:gamma", SUPERVISOR_GATE, "assert:tau", "assert:upsilon", "assert:zeta"];
const GATES = [...QUICK, ...SERIAL];
const HASHES = { full: "full-hash", supervisor: "supervisor-hash" };

type Options = {
	collect?: boolean;
	red?: string[];
	skipped?: string[];
	stamps?: Record<string, string>;
	hashes?: { full: string | null; supervisor: string | null };
};

type Outcome = {
	status: number;
	reused: boolean;
	states: Record<string, string>;
	started: string[];
	lines: string[];
	written: Array<Record<string, string>>;
	stopOnFailure: boolean | null;
};

/** One run of `runCheck` on the ten gates, the gates of `red` failing with exit code 3. */
async function check({ collect = false, red = [], skipped = [], stamps = {}, hashes = HASHES }: Options = {}): Promise<Outcome> {
	const started: string[] = [];
	const lines: string[] = [];
	const written: Array<Record<string, string>> = [];
	let stopOnFailure: boolean | null = null;
	const result = await runCheck({
		gates: GATES,
		quickGates: QUICK,
		skipped: new Set(skipped),
		stamps: { ...stamps },
		hashes,
		collect,
		launcher: {
			// As `check.mjs` does: in stop mode the first red gate stops the others, which then have no exit code.
			quick(gates: string[], options: { stopOnFailure: boolean }) {
				stopOnFailure = options.stopOnFailure;
				const codes: Record<string, number | null> = {};
				let stopped = false;
				for (const gate of gates) {
					if (stopped) {
						codes[gate] = null;
						continue;
					}
					started.push(gate);
					codes[gate] = red.includes(gate) ? 3 : 0;
					if (codes[gate] !== 0 && options.stopOnFailure) stopped = true;
				}
				return Promise.resolve(codes);
			},
			run(gate: string) {
				started.push(gate);
				return red.includes(gate) ? 3 : 0;
			},
		},
		log: (line: string) => lines.push(line),
		writeStamps: (next: Record<string, string>) => written.push({ ...next }),
	});
	const states: Record<string, string> = {};
	for (const entry of result.results as Array<{ gate: string; state: string }>) states[entry.gate] = entry.state;
	return { status: result.status, reused: result.reused, states, started, lines, written, stopOnFailure };
}

function gatesIn(outcome: Outcome, state: string): string[] {
	return Object.keys(outcome.states).filter((gate) => outcome.states[gate] === state);
}

const cases: Array<{ name: string; run: () => Promise<void> }> = [];

function prove(name: string, run: () => Promise<void>): void {
	cases.push({ name, run });
}

prove("collect mode names each of three red gates out of ten, exits 1, and never starts the supervisor harness", async () => {
	const red = ["lint", "assert:beta", "assert:tau"];
	const outcome = await check({ collect: true, red });
	assert.equal(outcome.status, 1);
	assert.equal(outcome.stopOnFailure, false, "the quick gates were asked to stop on the first failure");
	assert.deepEqual(gatesIn(outcome, "failed"), red);
	assert.ok(outcome.lines.includes(`\n> check: 3 gate(s) failed: ${red.join(", ")}`), outcome.lines.join("\n"));
	assert.ok(outcome.lines.includes(`> check: not run: ${SUPERVISOR_GATE}`), outcome.lines.join("\n"));
	assert.ok(outcome.lines.includes(`\n> check: ${SUPERVISOR_GATE} not run, a gate before it failed`), outcome.lines.join("\n"));
	assert.equal(outcome.states[SUPERVISOR_GATE], "not-run");
	assert.ok(!outcome.started.includes(SUPERVISOR_GATE), "the supervisor harness was started behind a red gate");
	assert.deepEqual(outcome.started, GATES.filter((gate) => gate !== SUPERVISOR_GATE), "a gate other than the harness was left out");
	assert.deepEqual(outcome.written, [], "a stamp was written on a red run");
});

prove("one red gate is enough to leave the supervisor harness not run, without any stamp", async () => {
	const outcome = await check({ collect: true, red: ["assert:zeta"] });
	assert.equal(outcome.status, 1);
	assert.equal(outcome.states[SUPERVISOR_GATE], "not-run");
	assert.deepEqual(outcome.written, []);
});

prove("stop mode ends at the first red gate and names only that one", async () => {
	const outcome = await check({ red: ["assert:beta", "assert:tau"] });
	assert.equal(outcome.status, 3, "the exit code of the red gate is the exit code of the run");
	assert.equal(outcome.stopOnFailure, true);
	assert.deepEqual(gatesIn(outcome, "failed"), ["assert:beta"]);
	assert.deepEqual(outcome.started, [...QUICK, "assert:alpha", "assert:beta"]);
	assert.ok(!outcome.lines.some((line) => line.includes("gate(s) failed")), "stop mode printed a recap");
	assert.ok(!outcome.lines.some((line) => line.includes("assert:tau")), "stop mode named a gate it never reached");
	assert.deepEqual(outcome.written, []);
});

prove("a red quick gate in stop mode starts nothing after the quick gates", async () => {
	const outcome = await check({ red: ["lint"] });
	assert.equal(outcome.status, 1);
	assert.deepEqual(outcome.started, ["build", "lint"]);
	assert.deepEqual(gatesIn(outcome, "failed"), ["lint"]);
	assert.equal(outcome.states["assert:release-version"], "not-run");
	assert.deepEqual(outcome.written, []);
});

prove("the supervisor harness keeps its rank in stop mode and comes last in collect mode", async () => {
	const stop = await check();
	assert.deepEqual(stop.started, GATES);
	const collect = await check({ collect: true });
	assert.deepEqual(collect.started, [...GATES.filter((gate) => gate !== SUPERVISOR_GATE), SUPERVISOR_GATE]);
	assert.equal(collect.status, 0);
});

prove("a whole green run writes the supervisor stamp, then the full one", async () => {
	for (const collect of [false, true]) {
		const outcome = await check({ collect });
		assert.equal(outcome.status, 0);
		assert.equal(outcome.reused, false);
		assert.deepEqual(gatesIn(outcome, "passed"), Object.keys(outcome.states));
		assert.deepEqual(outcome.written, [{ supervisor: HASHES.supervisor }, { supervisor: HASHES.supervisor, full: HASHES.full }]);
	}
});

prove("a gate left out by name is reported skipped and forbids the full stamp", async () => {
	const outcome = await check({ skipped: ["assert:gamma"] });
	assert.equal(outcome.status, 0);
	assert.equal(outcome.states["assert:gamma"], "skipped");
	assert.ok(!outcome.started.includes("assert:gamma"));
	assert.ok(outcome.lines.includes("\n> check: assert:gamma skipped by HANDBOOK_CHECK_SKIP"));
	assert.ok(outcome.written.every((stamps) => !("full" in stamps)), "a run that left a gate out stands for a full green");
});

prove("a supervisor harness whose own stamp holds is reused, not replayed, and the full stamp is written", async () => {
	const outcome = await check({ stamps: { supervisor: HASHES.supervisor } });
	assert.equal(outcome.status, 0);
	assert.equal(outcome.states[SUPERVISOR_GATE], "reused");
	assert.ok(!outcome.started.includes(SUPERVISOR_GATE));
	assert.deepEqual(outcome.written, [{ supervisor: HASHES.supervisor, full: HASHES.full }]);
});

prove("content that already passed replays nothing", async () => {
	const outcome = await check({ stamps: { full: HASHES.full }, red: ["lint"] });
	assert.equal(outcome.status, 0);
	assert.equal(outcome.reused, true);
	assert.deepEqual(outcome.started, []);
	assert.deepEqual(outcome.written, []);
});

prove("without a content hash (no git directory) every gate runs and no stamp is written", async () => {
	const outcome = await check({ hashes: { full: null, supervisor: null }, stamps: { full: "full-hash" } });
	assert.equal(outcome.status, 0);
	assert.deepEqual(outcome.started, GATES);
	assert.deepEqual(outcome.written, []);
});

async function main(): Promise<void> {
	let failed = 0;
	for (const { name, run } of cases) {
		try {
			await run();
			console.log(`ok   ${name}`);
		} catch (error) {
			failed += 1;
			console.error(`FAIL ${name}\n${(error as Error).stack ?? String(error)}`);
		}
	}
	if (failed > 0) {
		console.error(`\n${failed} check scheduling case(s) failed.`);
		process.exit(1);
	}
	console.log("\nCheck scheduling cases passed.");
}

void main();
