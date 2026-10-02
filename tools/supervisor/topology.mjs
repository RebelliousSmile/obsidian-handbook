/**
 * Read and check `supervisor/topology.json`.
 *
 * The schema says what a repository entry looks like; the cross checks say
 * what the schema cannot: unique ids, edges that land on declared
 * repositories, a single coordinator, and a scope that stays at the five
 * repositories of the train. Nothing here touches git: a topology that fails
 * is reported before any repository is looked at.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

export const HANDBOOK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const SUPERVISOR_DIR = resolve(HANDBOOK_ROOT, "supervisor");
export const DEFAULT_TOPOLOGY = resolve(SUPERVISOR_DIR, "topology.json");

const OUT_OF_SCOPE = ["obsidian-notebook"];

export class SupervisorError extends Error {
	constructor(message, exitCode = 2) {
		super(message);
		this.exitCode = exitCode;
	}
}

const validators = new Map();

/** Compile a schema of `supervisor/` once, and return its validator. */
export function schemaValidator(name) {
	if (!validators.has(name)) {
		const ajv = new Ajv({ allErrors: true, jsonPointers: true });
		const schema = JSON.parse(readFileSync(resolve(SUPERVISOR_DIR, name), "utf8"));
		validators.set(name, ajv.compile(schema));
	}
	return validators.get(name);
}

export function schemaErrors(validate) {
	return (validate.errors ?? []).map(
		(error) => `${error.dataPath || "/"} ${error.message}`,
	);
}

export function checkTopology(topology, source = "topology") {
	const validate = schemaValidator("topology.schema.json");
	if (!validate(topology)) {
		throw new SupervisorError(
			`${source}: invalid topology\n  ${schemaErrors(validate).join("\n  ")}`,
		);
	}

	const ids = new Set();
	for (const repo of topology.repos) {
		if (ids.has(repo.id)) {
			throw new SupervisorError(`${source}: repository id "${repo.id}" is declared twice`);
		}
		if (OUT_OF_SCOPE.includes(repo.id)) {
			throw new SupervisorError(`${source}: "${repo.id}" is outside the supervised train`);
		}
		ids.add(repo.id);
	}

	for (const repo of topology.repos) {
		for (const consumer of repo.consumers ?? []) {
			if (!ids.has(consumer)) {
				throw new SupervisorError(
					`${source}: edge ${repo.id} -> ${consumer} points to an undeclared repository`,
				);
			}
			const target = topology.repos.find((candidate) => candidate.id === consumer);
			if (target.role === "provider") {
				throw new SupervisorError(
					`${source}: edge ${repo.id} -> ${consumer} points to another provider`,
				);
			}
		}
	}

	for (const repo of topology.repos) {
		if (repo.matrix && !isTrainFile(repo, repo.matrix)) {
			throw new SupervisorError(`${source}: ${repo.id} keeps its registry in ${repo.matrix}, which is not one of its train files`);
		}
	}

	const coordinators = topology.repos.filter((repo) => repo.role === "coordinator");
	if (coordinators.length !== 1) {
		throw new SupervisorError(
			`${source}: exactly one coordinator is required, found ${coordinators.length}`,
		);
	}
	return topology;
}

export function loadTopology(file = DEFAULT_TOPOLOGY) {
	let topology;
	try {
		topology = JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		throw new SupervisorError(`${file}: ${error.message}`);
	}
	return checkTopology(topology, file);
}

export function repoById(topology, id) {
	const repo = topology.repos.find((candidate) => candidate.id === id);
	if (!repo) throw new SupervisorError(`unknown repository "${id}"`);
	return repo;
}

export function coordinatorOf(topology) {
	return topology.repos.find((repo) => repo.role === "coordinator");
}

export function providersOf(topology) {
	return topology.repos.filter((repo) => repo.role === "provider");
}

/** Every repository a provider pin is expected in, in declaration order. */
export function consumersOf(topology) {
	const ids = new Set();
	for (const provider of providersOf(topology)) {
		for (const consumer of provider.consumers) ids.add(consumer);
	}
	return topology.repos.filter((repo) => ids.has(repo.id));
}

export function repoDir(root, repo) {
	return resolve(root, repo.path);
}

/** True when `file` is one of the repository's train files. */
export function isTrainFile(repo, file) {
	return repo.trainFiles.some((entry) =>
		entry.endsWith("/") ? file.startsWith(entry) : file === entry,
	);
}
