/**
 * The train record: `supervisor/trains/<id>.json` in the coordinator.
 *
 * It is read, checked (schema, repositories of the topology, no dependency
 * cycle) and written atomically: a temporary file renamed over the record, so
 * an interrupted command never leaves half a record behind. Serialisation is
 * stable: a record read and written again is byte-identical.
 */
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchOrigin, listTree, showFile } from "./git.mjs";
import { coordinatorOf, repoDir, schemaErrors, schemaValidator, SupervisorError } from "./topology.mjs";

export const TRAINS_PATH = "supervisor/trains";

export function trainsDir(root, topology) {
	return resolve(repoDir(root, coordinatorOf(topology)), TRAINS_PATH);
}

export function trainFile(root, topology, id) {
	return resolve(trainsDir(root, topology), `${id}.json`);
}

/** The first dependency cycle among the items, as a list of repositories, or null. */
export function findCycle(items) {
	const edges = new Map(items.map((item) => [item.repo, item.dependsOn]));
	const state = new Map();
	const stack = [];
	function visit(repo) {
		state.set(repo, "visiting");
		stack.push(repo);
		for (const dependency of edges.get(repo) ?? []) {
			if (state.get(dependency) === "visiting") return [...stack.slice(stack.indexOf(dependency)), dependency];
			if (!state.has(dependency)) {
				const cycle = visit(dependency);
				if (cycle) return cycle;
			}
		}
		stack.pop();
		state.set(repo, "done");
		return null;
	}
	for (const item of items) {
		if (!state.has(item.repo)) {
			const cycle = visit(item.repo);
			if (cycle) return cycle;
		}
	}
	return null;
}

export function checkTrain(train, topology, source = "train") {
	const validate = schemaValidator("train.schema.json");
	if (!validate(train)) {
		throw new SupervisorError(`${source}: invalid train record\n  ${schemaErrors(validate).join("\n  ")}`);
	}
	const known = new Set(topology.repos.map((repo) => repo.id));
	const repos = new Set();
	for (const item of train.items) {
		if (!known.has(item.repo)) throw new SupervisorError(`${source}: ${item.repo} is not in the topology`);
		if (repos.has(item.repo)) throw new SupervisorError(`${source}: ${item.repo} appears twice`);
		repos.add(item.repo);
	}
	for (const item of train.items) {
		for (const dependency of item.dependsOn) {
			if (!repos.has(dependency)) {
				throw new SupervisorError(`${source}: ${item.repo} depends on ${dependency}, which is not an item of the train`);
			}
		}
	}
	const cycle = findCycle(train.items);
	if (cycle) throw new SupervisorError(`${source}: dependency cycle ${cycle.join(" -> ")}`);
	if (!known.has(train.coordinationIssue.repo)) {
		throw new SupervisorError(`${source}: coordination issue repository ${train.coordinationIssue.repo} is not in the topology`);
	}
	return train;
}

export function serializeTrain(train) {
	return `${JSON.stringify(train, null, "\t")}\n`;
}

export function readTrain(file, topology) {
	let train;
	try {
		train = JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		throw new SupervisorError(`${file}: ${error.message}`);
	}
	return checkTrain(train, topology, file);
}

export function writeTrain(file, train, topology) {
	checkTrain(train, topology, file);
	const temporary = `${file}.tmp-${process.pid}`;
	writeFileSync(temporary, serializeTrain(train));
	renameSync(temporary, file);
}

/** Train records of the checkout, by id. Invalid records are reported, not skipped. */
export function localTrains(root, topology) {
	const dir = trainsDir(root, topology);
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map((name) => readTrain(resolve(dir, name), topology));
}

/** Train records on the coordinator's origin/main, read without touching the checkout. */
export function originTrains(root, topology, { fetch = true } = {}) {
	const dir = repoDir(root, coordinatorOf(topology));
	if (fetch) fetchOrigin(dir);
	return listTree(dir, "origin/main", TRAINS_PATH)
		.filter((name) => name.endsWith(".json"))
		.map((name) => {
			const text = showFile(dir, "origin/main", `${TRAINS_PATH}/${name}`);
			try {
				return JSON.parse(text);
			} catch {
				return null;
			}
		})
		.filter(Boolean);
}

/** The train a command acts on: `--train`, or the only open train of the checkout. */
export function resolveTrain(root, topology, id) {
	if (id) {
		const file = trainFile(root, topology, id);
		if (!existsSync(file)) throw new SupervisorError(`no train "${id}" in ${trainsDir(root, topology)}`);
		return { file, train: readTrain(file, topology) };
	}
	const open = localTrains(root, topology).filter((train) => train.status === "open");
	if (open.length === 0) throw new SupervisorError("no open train: start one with supervise open <id> --title <title>");
	if (open.length > 1) {
		throw new SupervisorError(`several open trains (${open.map((train) => train.id).join(", ")}): pass --train <id>`);
	}
	return { file: trainFile(root, topology, open[0].id), train: open[0] };
}

/** The train `status` shows: `--train`, else the only open one, else none. */
export function activeTrain(root, topology, id) {
	if (id) return resolveTrain(root, topology, id).train;
	const open = localTrains(root, topology).filter((train) => train.status === "open");
	return open.length === 1 ? open[0] : null;
}
