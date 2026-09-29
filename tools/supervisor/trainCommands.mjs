/**
 * `open`, `link`, `next` and `sync`: start a train, attach its issues, say who
 * can move, and project the train into its coordination issue.
 *
 * Every refusal happens before the first write, local or on GitHub: a refused
 * command leaves no half-created issue and no half-written record.
 */
import { existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { gh, ghJson, ghOut } from "./gh.mjs";
import { fetchOrigin, revParse } from "./git.mjs";
import { renderBlock, replaceBlock } from "./coordination.mjs";
import { evaluateTrain, renderNext } from "./next.mjs";
import {
	checkTrain,
	localTrains,
	originTrains,
	resolveTrain,
	trainFile,
	trainsDir,
	writeTrain,
} from "./train.mjs";
import { coordinatorOf, repoById, repoDir, SupervisorError } from "./topology.mjs";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function issueNumber(url) {
	const match = /\/issues\/(\d+)\s*$/.exec(url.trim());
	if (!match) throw new SupervisorError(`gh issue create did not return an issue URL: ${url.trim()}`);
	return Number(match[1]);
}

function issueUrl(repo, number) {
	return `https://github.com/${repo.repository}/issues/${number}`;
}

function openTrain(root, topology, { id, title }) {
	if (!id || !ID.test(id)) throw new SupervisorError(`open: "${id ?? ""}" is not a train id (lowercase letters, digits, single dashes)`);
	if (!title) throw new SupervisorError("open: --title is required");
	const file = trainFile(root, topology, id);
	if (existsSync(file)) throw new SupervisorError(`open: train "${id}" already exists at ${file}`);
	if (originTrains(root, topology).some((train) => train.id === id)) {
		throw new SupervisorError(`open: train "${id}" already exists on origin/main of ${coordinatorOf(topology).id}`);
	}
	const coordinator = coordinatorOf(topology);
	const train = {
		$schema: "../train.schema.json",
		id,
		title,
		status: "open",
		coordinationIssue: { repo: coordinator.id, number: 1, url: issueUrl(coordinator, 1) },
		items: [],
		approval: null,
		publication: {},
	};
	const body = replaceBlock(
		`${title}\n\nThis issue follows the train \`${id}\` across the repositories of the supervisor topology.\n`,
		renderBlock(train, { items: [] }),
	);
	const url = ghOut(["issue", "create", "-R", coordinator.repository, "--title", `Train ${id}: ${title}`, "--body-file", "-"], { input: body });
	const number = issueNumber(url);
	train.coordinationIssue = { repo: coordinator.id, number, url: issueUrl(coordinator, number) };
	mkdirSync(trainsDir(root, topology), { recursive: true });
	writeTrain(file, train, topology);
	return train;
}

/** The open train, other than `train`, that already engages `repoId`, from the checkout or origin/main. */
function concurrentTrain(root, topology, train, repoId) {
	const candidates = [...localTrains(root, topology), ...originTrains(root, topology)];
	return candidates.find((other) => other.id !== train.id
		&& other.status === "open"
		&& (other.items ?? []).some((item) => item.repo === repoId)) ?? null;
}

function defaultEvidence(repo) {
	if (repo.role === "provider") {
		return ["closing commit on origin/main", "contract corpus and codecs updated for the change"];
	}
	return ["closing commit on origin/main", "pnpm check green on the closing commit"];
}

function parseSpec(spec) {
	const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)(?:#(\d+))?$/.exec(spec ?? "");
	if (!match) throw new SupervisorError(`link: "${spec ?? ""}" is neither <repo>#<issue> nor <repo> --create`);
	return { repoId: match[1], number: match[2] ? Number(match[2]) : null };
}

async function confirm(question) {
	const prompt = createInterface({ input: process.stdin, output: process.stderr });
	try {
		return /^y(es)?$/i.test((await prompt.question(`${question} [y/N] `)).trim());
	} finally {
		prompt.close();
	}
}

async function linkIssue(root, topology, { train, file }, spec, values) {
	const { repoId, number } = parseSpec(spec);
	const repo = repoById(topology, repoId);
	if (!repo) throw new SupervisorError(`link: ${repoId} is not in the topology`);
	if (train.status !== "open") throw new SupervisorError(`link: train "${train.id}" is closed`);
	if (train.items.some((item) => item.repo === repoId)) {
		throw new SupervisorError(`link: ${repoId} is already an item of train "${train.id}"`);
	}
	if (number === null && !values.create) throw new SupervisorError(`link: name the issue (${repoId}#<n>) or pass --create --title`);
	if (number !== null && values.create) throw new SupervisorError("link: --create creates a new issue, do not name one");
	const concurrent = concurrentTrain(root, topology, train, repoId);
	if (concurrent) {
		throw new SupervisorError(`link: ${repoId} is already engaged by the open train "${concurrent.id}" (${concurrent.title}); finish or close it first`);
	}

	const dependsOn = values["depends-on"] === undefined
		? train.items
			.filter((item) => repoById(topology, item.repo).consumers?.includes(repoId))
			.map((item) => item.repo)
		: values["depends-on"].split(",").map((entry) => entry.trim()).filter(Boolean);
	const dependents = values["depends-on"] === undefined
		? train.items.filter((item) => (repo.consumers ?? []).includes(item.repo)).map((item) => item.repo)
		: [];
	const draft = {
		...train,
		items: [
			...train.items.map((item) => dependents.includes(item.repo) ? { ...item, dependsOn: [...item.dependsOn, repoId] } : item),
			{ repo: repoId, issue: 1, url: issueUrl(repo, 1), title: "-", baseSha: "0".repeat(40), dependsOn, expectedEvidence: values.evidence ?? defaultEvidence(repo) },
		],
	};
	checkTrain(draft, topology, file);

	const dir = repoDir(root, repo);
	fetchOrigin(dir);
	const baseSha = revParse(dir, "origin/main");
	if (!baseSha) throw new SupervisorError(`link: origin/main of ${repoId} is unknown in ${dir}`);

	let issue;
	if (values.create) {
		if (!values.title) throw new SupervisorError("link: --create needs --title");
		const question = `Create an issue in ${repo.repository} titled "${values.title}"?`;
		if (!values.yes) {
			if (!process.stdin.isTTY) throw new SupervisorError(`link: ${question} Refused without a terminal; pass --yes to confirm`);
			if (!(await confirm(question))) throw new SupervisorError("link: issue creation declined");
		}
		const body = `Part of the train \`${train.id}\`: ${train.coordinationIssue.url}\n`;
		const url = ghOut(["issue", "create", "-R", repo.repository, "--title", values.title, "--body-file", "-"], { input: body });
		const created = issueNumber(url);
		issue = { number: created, title: values.title, url: issueUrl(repo, created) };
	} else {
		const viewed = gh(["issue", "view", String(number), "-R", repo.repository, "--json", "number,title,state,url"]);
		if (viewed.status !== 0) throw new SupervisorError(`link: ${repoId}#${number} was not found (${viewed.stderr.trim()})`);
		issue = JSON.parse(viewed.stdout);
	}

	const item = draft.items[draft.items.length - 1];
	Object.assign(item, { issue: issue.number, url: issue.url, title: issue.title, baseSha });
	writeTrain(file, draft, topology);
	return { train: draft, item, created: Boolean(values.create) };
}

function syncIssue(root, topology, train) {
	const evaluation = evaluateTrain(root, topology, train);
	const coordination = repoById(topology, train.coordinationIssue.repo);
	const current = ghJson(["issue", "view", String(train.coordinationIssue.number), "-R", coordination.repository, "--json", "body"]);
	const body = replaceBlock(current.body ?? "", renderBlock(train, evaluation));
	if (body !== current.body) {
		ghOut(["issue", "edit", String(train.coordinationIssue.number), "-R", coordination.repository, "--body-file", "-"], { input: body });
	}
	return { changed: body !== current.body, evaluation };
}

const TRAIN = { train: { type: "string" } };

export const TRAIN_COMMANDS = {
	open: {
		usage: "open <id> --title <title>                 start a train and its coordination issue",
		options: { title: { type: "string" } },
		run(context, values, [id]) {
			const train = openTrain(context.root, context.topology, { id, title: values.title });
			console.log(`Train ${train.id} opened: ${trainFile(context.root, context.topology, train.id)}`);
			console.log(`Coordination issue: ${train.coordinationIssue.url}`);
			return 0;
		},
	},
	link: {
		usage: "link <repo>#<n> | <repo> --create --title <t> [--yes] [--depends-on a,b] [--evidence e]...\n                                            attach an issue to the train",
		options: {
			...TRAIN,
			create: { type: "boolean" },
			title: { type: "string" },
			yes: { type: "boolean" },
			"depends-on": { type: "string" },
			evidence: { type: "string", multiple: true },
		},
		async run(context, values, [spec]) {
			const resolved = resolveTrain(context.root, context.topology, values.train);
			const { train, item, created } = await linkIssue(context.root, context.topology, resolved, spec, values);
			console.log(`${created ? "Created and linked" : "Linked"} ${item.repo}#${item.issue} (${item.title}) to train ${train.id}, base ${item.baseSha.slice(0, 10)}`);
			console.log(`  depends on: ${item.dependsOn.join(", ") || "-"}`);
			return 0;
		},
	},
	next: {
		usage: "next [--json]                             ready, blocked and done items of the train",
		options: { ...TRAIN, json: { type: "boolean" } },
		run(context, values) {
			const { train } = resolveTrain(context.root, context.topology, values.train);
			const evaluation = evaluateTrain(context.root, context.topology, train);
			console.log(values.json ? JSON.stringify(evaluation, null, "\t") : renderNext(evaluation));
			return 0;
		},
	},
	sync: {
		usage: "sync                                      rewrite the supervisor block of the coordination issue",
		options: { ...TRAIN },
		run(context, values) {
			const { train } = resolveTrain(context.root, context.topology, values.train);
			const { changed } = syncIssue(context.root, context.topology, train);
			console.log(changed ? `Coordination issue ${train.coordinationIssue.url} updated.` : "Coordination issue already up to date.");
			return 0;
		},
	},
};
