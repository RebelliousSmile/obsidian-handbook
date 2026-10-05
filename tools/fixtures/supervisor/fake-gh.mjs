/**
 * A stand-in for the GitHub CLI, driven by a JSON state file.
 *
 * `FAKE_GH_STATE` names the file. Every call is appended to `calls` with its
 * arguments, working directory and stdin, so the harness can prove what the
 * supervisor asked for, and what it did not. Writes (issues, workflow runs)
 * change the state the next read sees; a workflow run applies the next queued
 * effect of `workflowEffects["<repo> <workflow>"]`, which is how a fake
 * release comes to exist.
 *
 * An effect with a `status` (`in_progress`, `waiting`) leaves its run open.
 * Each `run view` of an open run then takes the next effect of the queue the
 * run came from: another `status` keeps it open, anything else completes it.
 * With nothing queued, the run stays as it is.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const statePath = process.env.FAKE_GH_STATE;
if (!statePath) {
	process.stderr.write("fake gh: FAKE_GH_STATE is not set\n");
	process.exit(90);
}
const state = JSON.parse(readFileSync(statePath, "utf8"));
const args = process.argv.slice(2);
const stdin = readStdin();
state.calls = state.calls ?? [];
state.calls.push({ args, cwd: process.cwd(), stdin });

function readStdin() {
	if (!args.includes("-") && !args.includes("--body-file")) return null;
	try {
		return readFileSync(0, "utf8");
	} catch {
		return null;
	}
}

function save() {
	writeFileSync(statePath, JSON.stringify(state, null, "\t"));
}

function done(status, stdout = "", stderr = "") {
	save();
	if (stdout) process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
	if (stderr) process.stderr.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);
	process.exit(status);
}

function option(...names) {
	for (const name of names) {
		const index = args.indexOf(name);
		if (index >= 0) return args[index + 1];
		const inline = args.find((argument) => argument.startsWith(`${name}=`));
		if (inline) return inline.slice(name.length + 1);
	}
	return undefined;
}

function options(name) {
	const values = [];
	args.forEach((argument, index) => {
		if (argument === name) values.push(args[index + 1]);
	});
	return values;
}

const repo = option("-R", "--repo");
const command = `${args[0]} ${args[1] ?? ""}`.trim();
const failure = (state.fail ?? {})[command];
if (failure) done(failure.status ?? 1, "", failure.stderr ?? `fake gh: ${command} failed`);

function issuesOf(name) {
	state.issues = state.issues ?? {};
	state.issues[name] = state.issues[name] ?? {};
	return state.issues[name];
}

function issueView(issue) {
	return {
		number: issue.number,
		title: issue.title,
		body: issue.body ?? "",
		state: issue.state ?? "OPEN",
		url: `https://github.com/${repo}/issues/${issue.number}`,
		closedByPullRequestsReferences: (issue.closedByPullRequests ?? []).map((number) => ({ number })),
	};
}

/** Give `run` the outcome of `effect`: left open on a `status`, else completed, a success publishing its release. */
function applyEffect(run, effect) {
	if (effect.status) {
		run.status = effect.status;
		run.conclusion = null;
		return;
	}
	run.status = "completed";
	run.conclusion = effect.conclusion ?? "success";
	run.artifacts = effect.artifacts ?? run.artifacts ?? [];
	if (run.conclusion === "success" && effect.createRelease) {
		const name = run.url.replace(/^https:\/\/github\.com\/|\/actions\/runs\/\d+$/g, "");
		state.releases = state.releases ?? {};
		state.releases[name] = [effect.createRelease, ...(state.releases[name] ?? [])];
	}
}

switch (command) {
	case "auth status":
		done(0, "", "Logged in to github.com as fake");
		break;
	case "release list":
		done(0, JSON.stringify((state.releases ?? {})[repo] ?? []));
		break;
	case "release view": {
		const release = ((state.releases ?? {})[repo] ?? []).find((entry) => entry.tagName === args[2]);
		if (!release) done(1, "", "release not found");
		done(0, JSON.stringify({ ...release, assets: (release.assets ?? []).map((asset) => ({ name: asset.name, url: asset.url })) }));
		break;
	}
	case "release download": {
		const release = ((state.releases ?? {})[repo] ?? []).find((entry) => entry.tagName === args[2]);
		if (!release) done(1, "", "release not found");
		const directory = option("-D", "--dir") ?? process.cwd();
		const pattern = option("-p", "--pattern");
		mkdirSync(directory, { recursive: true });
		for (const asset of release.assets ?? []) {
			if (pattern && pattern !== asset.name && !new RegExp(`^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`).test(asset.name)) continue;
			copyFileSync(asset.file, join(directory, asset.name));
		}
		done(0);
		break;
	}
	case "issue view": {
		const issue = issuesOf(repo)[args[2]];
		if (!issue) done(1, "", `could not resolve to an issue with the number of ${args[2]}`);
		done(0, JSON.stringify(issueView(issue)));
		break;
	}
	case "issue create": {
		const issues = issuesOf(repo);
		const number = Math.max(0, ...Object.keys(issues).map(Number)) + 1;
		issues[number] = { number, title: option("--title", "-t"), body: stdin ?? option("--body", "-b") ?? "", state: "OPEN" };
		done(0, `https://github.com/${repo}/issues/${number}`);
		break;
	}
	case "issue edit": {
		const issue = issuesOf(repo)[args[2]];
		if (!issue) done(1, "", "issue not found");
		issue.body = stdin ?? option("--body", "-b") ?? issue.body;
		done(0, `https://github.com/${repo}/issues/${args[2]}`);
		break;
	}
	case "issue comment": {
		const issue = issuesOf(repo)[args[2]];
		if (!issue) done(1, "", "issue not found");
		issue.comments = [...(issue.comments ?? []), stdin ?? option("--body", "-b")];
		done(0);
		break;
	}
	case "issue close": {
		const issue = issuesOf(repo)[args[2]];
		if (!issue) done(1, "", "issue not found");
		issue.state = "CLOSED";
		const comment = option("--comment", "-c");
		if (comment) issue.comments = [...(issue.comments ?? []), comment];
		done(0);
		break;
	}
	case "pr view": {
		const pr = ((state.prs ?? {})[repo] ?? {})[args[2]];
		if (!pr) done(1, "", "pull request not found");
		done(0, JSON.stringify({ number: Number(args[2]), state: pr.state ?? "MERGED", mergeCommit: pr.mergeCommit ? { oid: pr.mergeCommit } : null }));
		break;
	}
	case "secret list":
		done(0, JSON.stringify(((state.secrets ?? {})[repo] ?? []).map((name) => ({ name }))));
		break;
	case "workflow run": {
		const workflow = args[2];
		const inputs = {};
		for (const field of [...options("-f"), ...options("--raw-field"), ...options("-F")]) {
			const [key, ...value] = field.split("=");
			inputs[key] = value.join("=");
		}
		state.runs = state.runs ?? {};
		state.runs[repo] = state.runs[repo] ?? [];
		const id = 1000 + Object.keys(state.runs).reduce((count, name) => count + state.runs[name].length, 0);
		const effect = ((state.workflowEffects ?? {})[`${repo} ${workflow}`] ?? []).shift() ?? {};
		const run = {
			databaseId: id,
			workflowName: workflow,
			headBranch: option("--ref", "-r") ?? "main",
			inputs,
			createdAt: new Date(Date.UTC(2026, 8, 29, 12, 0, id - 1000)).toISOString(),
			url: `https://github.com/${repo}/actions/runs/${id}`,
			effects: ["workflowEffects", `${repo} ${workflow}`],
		};
		applyEffect(run, effect);
		state.runs[repo].unshift(run);
		done(0, "", `✓ Created workflow_dispatch event for ${workflow}`);
		break;
	}
	case "run list": {
		const workflow = option("--workflow", "-w");
		const runs = ((state.runs ?? {})[repo] ?? []).filter((run) => !workflow || run.workflowName === workflow);
		done(0, JSON.stringify(runs.slice(0, Number(option("--limit", "-L") ?? 20))));
		break;
	}
	case "run view": {
		const run = ((state.runs ?? {})[repo] ?? []).find((entry) => String(entry.databaseId) === args[2]);
		if (!run) done(1, "", "run not found");
		if (run.status !== "completed" && run.effects) {
			const effect = ((state[run.effects[0]] ?? {})[run.effects[1]] ?? []).shift();
			if (effect) applyEffect(run, effect);
		}
		done(0, JSON.stringify(run));
		break;
	}
	case "run download": {
		const run = ((state.runs ?? {})[repo] ?? []).find((entry) => String(entry.databaseId) === args[2]);
		if (!run) done(1, "", "run not found");
		const directory = option("-D", "--dir") ?? process.cwd();
		mkdirSync(directory, { recursive: true });
		const name = option("-n", "--name");
		for (const artifact of run.artifacts ?? []) {
			if (name && artifact.name !== name) continue;
			copyFileSync(artifact.file, join(directory, basename(artifact.file)));
		}
		done(0);
		break;
	}
	default:
		if (args[0] === "api") {
			const events = (state.events ?? {})[args[1]];
			if (events) done(0, JSON.stringify(events));
			done(1, "", `fake gh: no answer for api ${args[1]}`);
		}
		done(91, "", `fake gh: unsupported command ${args.join(" ")}`);
}
