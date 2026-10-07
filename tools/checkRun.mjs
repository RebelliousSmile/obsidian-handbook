/**
 * The scheduling of `pnpm check`, without anything that runs a script.
 *
 * `check.mjs` reads the environment, hashes the content and hands the gates
 * to `runCheck` with a launcher; the harness hands it a fake one. Two modes:
 *   - stop (the default by hand): the first red gate ends the run;
 *   - collect: every quick gate finishes, the `assert:*` go on after a red
 *     one, and a recap names each red gate. The supervisor harness comes last
 *     whatever its rank, and is not started behind a red gate: it takes many
 *     minutes and would teach nothing. It is then reported "not run".
 *
 * A gate ends in one of five states: "passed", "failed", "skipped" (left out
 * by name), "reused" (its own stamp still holds) or "not-run".
 */

export const SUPERVISOR_GATE = "assert:supervisor";

/**
 * @param {object} options
 * @param {string[]} options.gates every gate, in the order of a stop run
 * @param {string[]} options.quickGates the gates run together, first
 * @param {Set<string>} options.skipped gates left out by name
 * @param {{ full?: string, supervisor?: string }} options.stamps what a green run left
 * @param {{ full: string | null, supervisor: string | null }} options.hashes the content of this run
 * @param {boolean} options.collect collect mode
 * @param {{ quick: (gates: string[], options: { stopOnFailure: boolean }) => Promise<Record<string, number | null>>, run: (gate: string) => number }} options.launcher
 *   `quick` gives the exit code of each gate, null for one it stopped; `run` gives the exit code of one gate
 * @param {(line: string) => void} options.log
 * @param {(stamps: object) => void} options.writeStamps
 * @returns {Promise<{ status: number, results: { gate: string, state: string }[], reused: boolean }>}
 */
export async function runCheck({ gates, quickGates, skipped, stamps, hashes, collect, launcher, log, writeStamps }) {
	if (hashes.full && stamps.full === hashes.full) {
		log("\ncheck: this exact content already passed; nothing replayed (HANDBOOK_CHECK_FORCE=1 to replay).");
		return { status: 0, results: [], reused: true };
	}

	const serial = gates.filter((gate) => !quickGates.includes(gate));
	const ordered = collect && serial.includes(SUPERVISOR_GATE)
		? [...serial.filter((gate) => gate !== SUPERVISOR_GATE), SUPERVISOR_GATE]
		: serial;
	const states = new Map([...quickGates, ...ordered].map((gate) => [gate, "not-run"]));
	const finish = (status) => ({
		status,
		results: [...states].map(([gate, state]) => ({ gate, state })),
		reused: false,
	});
	const failed = () => [...states].filter(([, state]) => state === "failed").map(([gate]) => gate);

	log(`\n> check: quick gates in parallel (${quickGates.join(", ")})`);
	const quick = await launcher.quick(quickGates, { stopOnFailure: !collect });
	for (const gate of quickGates) {
		const code = quick[gate];
		if (code !== null && code !== undefined) states.set(gate, code === 0 ? "passed" : "failed");
	}
	if (!collect && failed().length > 0) return finish(1);

	for (const gate of ordered) {
		if (skipped.has(gate)) {
			log(`\n> check: ${gate} skipped by HANDBOOK_CHECK_SKIP`);
			states.set(gate, "skipped");
			continue;
		}
		if (gate === SUPERVISOR_GATE && hashes.supervisor && stamps.supervisor === hashes.supervisor) {
			log(`\n> check: ${gate} skipped, the supervisor and its harness are unchanged since a green run (HANDBOOK_CHECK_FORCE=1 to replay)`);
			states.set(gate, "reused");
			continue;
		}
		if (collect && gate === SUPERVISOR_GATE && failed().length > 0) {
			log(`\n> check: ${gate} not run, a gate before it failed`);
			continue;
		}
		log(`\n> check: ${gate}`);
		const code = launcher.run(gate);
		if (code !== 0) {
			states.set(gate, "failed");
			if (!collect) return finish(code);
			log(`\n> check: ${gate} FAILED (exit ${code}), going on with the next gate`);
			continue;
		}
		states.set(gate, "passed");
		if (gate === SUPERVISOR_GATE && hashes.supervisor) {
			stamps.supervisor = hashes.supervisor;
			writeStamps(stamps);
		}
	}

	const red = failed();
	if (red.length > 0) {
		const notRun = [...states].filter(([, state]) => state === "not-run").map(([gate]) => gate);
		log(`\n> check: ${red.length} gate(s) failed: ${red.join(", ")}`);
		if (notRun.length > 0) log(`> check: not run: ${notRun.join(", ")}`);
		return finish(1);
	}

	// A run that left a gate out proves less than the content: it must not stand for a full green.
	const whole = [...states.values()].every((state) => state === "passed" || state === "reused");
	if (hashes.full && whole) {
		stamps.full = hashes.full;
		writeStamps(stamps);
	}
	return finish(0);
}
