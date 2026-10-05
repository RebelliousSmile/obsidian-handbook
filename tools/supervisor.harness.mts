/**
 * `pnpm assert:supervisor`: the supervisor's behaviour, proved without a
 * network on a throwaway copy of the five repositories.
 *
 * Each scenario builds its own world (`tools/fixtures/supervisor/world.mts`),
 * runs `tools/supervise.mjs` as a child process against it, and asserts on
 * what it printed, what it wrote, and which git and gh calls it made.
 */
import assert from "assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { basename, delimiter, join, resolve } from "path";
import Ajv from "ajv";
import { createWorld, git, HANDBOOK, sh, TOPOLOGY, World } from "./fixtures/supervisor/world.mts";
import { pathKey, spawnCommand, withRequire } from "./supervisor/spawn.mjs";

// guarded.mjs locates its guard through import.meta, which this CJS bundle empties.
const GUARD_DIR = resolve(HANDBOOK, "tools/supervisor/guard");

const statusSchema = JSON.parse(readFileSync(resolve(HANDBOOK, "supervisor/status.schema.json"), "utf8"));
const validateStatus = new Ajv({ allErrors: true }).compile(statusSchema);

type Scenario = { name: string; run: (world: World) => void };
const scenarios: Scenario[] = [];

function scenario(name: string, run: (world: World) => void): void {
	scenarios.push({ name, run });
}

function ok(result: { status: number; stdout: string; stderr: string }, what: string): string {
	assert.equal(result.status, 0, `${what} exited ${result.status}\n${result.stdout}\n${result.stderr}`);
	return result.stdout;
}

// Phase 1: topology and state of the five repositories.

scenario("status lists every repository and leaves each one untouched", (world) => {
	const before = world.snapshot();
	const text = ok(world.supervise(["status"]), "status");
	for (const id of ["obsidian-handbook", "lantern", "schema-pbta", "schema-adrenaline", "schema-in-the-mist"]) {
		assert.match(text, new RegExp(`^${id} \\[`, "m"), `status names ${id}`);
	}
	assert.match(text, /branch main @ [0-9a-f]{10}, clean, ahead 0, behind 0/);
	assert.match(text, /No gaps/);
	assert.deepEqual(world.snapshot(), before, "status changed a HEAD or a working tree");
});

scenario("status --json matches status.schema.json with a pin per consumer and provider", (world) => {
	const status = JSON.parse(ok(world.supervise(["status", "--json"]), "status --json"));
	assert.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
	assert.equal(status.pins.length, 6);
	const lantern = status.pins.find((pin: any) => pin.consumer === "lantern" && pin.provider === "schema-pbta");
	assert.deepEqual(lantern.lockfiles.map((lock: any) => lock.file), ["pnpm-lock.yaml", "package-lock.json"]);
	assert.equal(lantern.lockfiles[1].integrity, world.archive("schema-pbta", "v1.0.0").integrity);
	assert.equal(status.providers.find((provider: any) => provider.id === "schema-pbta").latestRc.tag, "v1.0.1-rc.1");
});

scenario("a branch behind origin/main is named and --strict fails", (world) => {
	for (let index = 0; index < 24; index += 1) world.land("obsidian-handbook", { [`notes/${index}.md`]: `${index}\n` }, `landed ${index}`);
	sh(world.dir("obsidian-handbook"), "git", ["switch", "--quiet", "-c", "feat/old", "HEAD~24"]);
	const text = ok(world.supervise(["status"]), "status");
	assert.match(text, /obsidian-handbook: feat\/old is 24 commit\(s\) behind origin\/main/);
	const strict = world.supervise(["status", "--strict"]);
	assert.notEqual(strict.status, 0, "--strict must fail on a gap");
	const status = JSON.parse(world.supervise(["status", "--json"]).stdout);
	assert.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
	assert.equal(status.repos.find((repo: any) => repo.id === "obsidian-handbook").behind, 24);
});

scenario("a release candidate pin is reported with its URL and lockfile SRI, and divergence names both URLs", (world) => {
	const rc = world.archive("schema-pbta", "v1.0.1-rc.1");
	const handbook = JSON.parse(readFileSync(resolve(world.dir("obsidian-handbook"), "package.json"), "utf8"));
	const final = handbook.dependencies["schema-pbta"];
	const lock = readFileSync(resolve(world.dir("obsidian-handbook"), "pnpm-lock.yaml"), "utf8")
		.split(final).join(rc.url)
		.replace(world.archive("schema-pbta", "v1.0.0").integrity, rc.integrity);
	handbook.dependencies["schema-pbta"] = rc.url;
	world.write("obsidian-handbook", { "package.json": JSON.stringify(handbook), "pnpm-lock.yaml": lock });
	const text = ok(world.supervise(["status"]), "status");
	assert.ok(text.includes(`obsidian-handbook: schema-pbta is pinned to release candidate v1.0.1-rc.1: ${rc.url} (${rc.integrity})`), text);
	assert.ok(text.includes(`obsidian-handbook: ${rc.url}`) && text.includes(`lantern: ${final}`), text);
	assert.notEqual(world.supervise(["status", "--strict"]).status, 0);
});

scenario("an edge to an undeclared repository is refused before any git command", (world) => {
	const result = world.supervise(["status"], { topology: resolve(HANDBOOK, "tools/fixtures/supervisor/topology-unknown-edge.json") });
	assert.equal(result.status, 2, result.stderr);
	assert.match(result.stderr, /edge schema-pbta -> ghost points to an undeclared repository/);
	let calls = "";
	try {
		calls = readFileSync(world.gitLog, "utf8");
	} catch {
		calls = "";
	}
	assert.equal(calls, "", "git ran before the topology was accepted");
	assert.equal(world.readState().calls.length, 0, "gh ran before the topology was accepted");
});

scenario("the shipped topology lists exactly the five repositories", () => {
	const topology = JSON.parse(readFileSync(resolve(HANDBOOK, "supervisor/topology.json"), "utf8"));
	assert.deepEqual(
		topology.repos.map((repo: any) => repo.id).sort(),
		["lantern", "obsidian-handbook", "schema-adrenaline", "schema-in-the-mist", "schema-pbta"],
	);
});

// Phase 2: train record, issues and next step.

const REPOSITORY: Record<string, string> = Object.fromEntries(TOPOLOGY.repos.map((repo: any) => [repo.id, repo.repository]));
const TRAIN_ID = "couleur-otherscape";

function trainPath(world: World, id = TRAIN_ID): string {
	return resolve(world.dir("obsidian-handbook"), "supervisor/trains", `${id}.json`);
}

function readRecord(world: World, id = TRAIN_ID): any {
	return JSON.parse(readFileSync(trainPath(world, id), "utf8"));
}

function seedIssues(world: World): void {
	world.updateState((state) => {
		state.issues[REPOSITORY["schema-in-the-mist"]] = {
			31: { number: 31, title: "Otherscape colour tokens", state: "OPEN" },
			32: { number: 32, title: "Another Mist change", state: "OPEN" },
		};
		state.issues[REPOSITORY["obsidian-handbook"]] = { 12: { number: 12, title: "Render the new colours", state: "OPEN" } };
		state.issues[REPOSITORY.lantern] = { 40: { number: 40, title: "Offer the new colours", state: "OPEN" } };
	});
}

function creates(world: World, repository?: string): any[] {
	return world.readState().calls.filter((call: any) => call.args[0] === "issue" && call.args[1] === "create"
		&& (!repository || call.args.includes(repository)));
}

function openTrain(world: World, id = TRAIN_ID, title = "Otherscape colours"): void {
	ok(world.supervise(["open", id, "--title", title]), `open ${id}`);
}

function next(world: World): Record<string, any> {
	const evaluation = JSON.parse(ok(world.supervise(["next", "--json"]), "next --json"));
	return Object.fromEntries(evaluation.items.map((item: any) => [item.repo, item]));
}

scenario("open writes a stable record and a coordination issue with the supervisor block", (world) => {
	openTrain(world);
	const text = readFileSync(trainPath(world), "utf8");
	const record = JSON.parse(text);
	assert.equal(`${JSON.stringify(record, null, "\t")}\n`, text, "the record is not byte-stable");
	assert.deepEqual(record.coordinationIssue, { repo: "obsidian-handbook", number: 1, url: `https://github.com/${REPOSITORY["obsidian-handbook"]}/issues/1` });
	assert.ok(!("approval" in record), "open wrote an approval");
	const created = creates(world);
	assert.equal(created.length, 1);
	assert.ok(created[0].args.includes(REPOSITORY["obsidian-handbook"]));
	const issue = world.readState().issues[REPOSITORY["obsidian-handbook"]][1];
	assert.equal(issue.title, `Train ${TRAIN_ID}: Otherscape colours`);
	assert.match(issue.body, /<!-- supervisor:begin -->[\s\S]*<!-- supervisor:end -->/);
	const again = world.supervise(["open", TRAIN_ID, "--title", "twice"]);
	assert.equal(again.status, 2);
	assert.match(again.stderr, /already exists/);
	assert.equal(creates(world).length, 1, "a refused open created an issue");
});

scenario("link reuses issues, next follows the topology, and a merged provider unblocks its consumers", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
	ok(world.supervise(["link", "lantern#40"]), "link lantern");
	assert.equal(creates(world).length, 1, "link created an issue");
	const record = readRecord(world);
	const items = Object.fromEntries(record.items.map((item: any) => [item.repo, item]));
	assert.deepEqual(items["schema-in-the-mist"].dependsOn, []);
	assert.deepEqual(items["obsidian-handbook"].dependsOn, ["schema-in-the-mist"]);
	assert.deepEqual(items.lantern.dependsOn, ["schema-in-the-mist"]);
	assert.equal(items["schema-in-the-mist"].baseSha, git(world.dir("schema-in-the-mist"), "rev-parse", "origin/main"));
	assert.equal(items["obsidian-handbook"].title, "Render the new colours");

	let state = next(world);
	assert.equal(state["schema-in-the-mist"].state, "ready");
	assert.equal(state["obsidian-handbook"].state, "blocked");
	assert.deepEqual(state.lantern.blockedBy.map((dependency: any) => dependency.label), ["schema-in-the-mist#31"]);
	assert.match(ok(world.supervise(["next"]), "next"), /Blocked:\n.*obsidian-handbook#12.*blocked by schema-in-the-mist#31 \(open\)/);

	const status = JSON.parse(ok(world.supervise(["status", "--json"]), "status --json"));
	assert.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
	assert.equal(status.train.id, TRAIN_ID);
	assert.equal(status.train.items.length, 3);

	// Mist merges and closes #31; the local Mist checkout has not fetched nor pulled.
	const mist = world.dir("schema-in-the-mist");
	const before = git(mist, "rev-parse", "HEAD");
	const merged = world.land("schema-in-the-mist", { "src/colours.ts": "export const colours = [];\n" }, "Add colours (fixes #31)");
	git(mist, "reset", "--quiet", "--hard", before);
	git(mist, "update-ref", "refs/remotes/origin/main", before);
	world.updateState((state) => {
		state.issues[REPOSITORY["schema-in-the-mist"]][31].state = "CLOSED";
		state.events[`repos/${REPOSITORY["schema-in-the-mist"]}/issues/31/events`] = [{ event: "closed", commit_id: merged }];
	});
	const recordBefore = readFileSync(trainPath(world), "utf8");
	state = next(world);
	assert.equal(state["schema-in-the-mist"].state, "done");
	assert.equal(state["schema-in-the-mist"].commit, merged);
	assert.equal(state["obsidian-handbook"].state, "ready");
	assert.equal(state.lantern.state, "ready");
	assert.equal(git(mist, "rev-parse", "HEAD"), before, "next moved the Mist checkout");
	assert.equal(readFileSync(trainPath(world), "utf8"), recordBefore, "next changed the record");

	// Handbook closes through a merged pull request; Lantern is closed by hand, without a commit.
	const handbookMerge = world.land("obsidian-handbook", { "src/colours.ts": "export {};\n" }, "Merge pull request #5");
	world.updateState((state) => {
		state.prs[REPOSITORY["obsidian-handbook"]] = { 5: { mergeCommit: handbookMerge } };
		Object.assign(state.issues[REPOSITORY["obsidian-handbook"]][12], { state: "CLOSED", closedByPullRequests: [5] });
		state.issues[REPOSITORY.lantern][40].state = "CLOSED";
	});
	state = next(world);
	assert.equal(state["obsidian-handbook"].state, "done");
	assert.equal(state["obsidian-handbook"].via, "pull request #5");
	assert.equal(state.lantern.state, "closed-unproven");
});

scenario("sync rewrites only the supervisor block of the coordination issue", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	const coordination = readRecord(world).coordinationIssue.number;
	world.updateState((state) => {
		const issue = state.issues[REPOSITORY["obsidian-handbook"]][coordination];
		issue.body = `Written by hand above.\n\n${issue.body}\nWritten by hand below.\n`;
	});
	ok(world.supervise(["sync"]), "sync");
	const body = world.readState().issues[REPOSITORY["obsidian-handbook"]][coordination].body;
	assert.match(body, /^Written by hand above\./);
	assert.match(body, /Written by hand below\.\n$/);
	assert.match(body, /\[schema-in-the-mist#31\]\(https:\/\/github\.com\/RebelliousSmile\/schema-in-the-mist\/issues\/31\) Otherscape colour tokens \| ready \|/);
	assert.equal(body.split("<!-- supervisor:begin -->").length, 2, "the block was duplicated");
	const edits = () => world.readState().calls.filter((call: any) => call.args[0] === "issue" && call.args[1] === "edit").length;
	const count = edits();
	assert.match(ok(world.supervise(["sync"]), "sync again"), /already up to date/);
	assert.equal(edits(), count, "an unchanged block was written again");
});

scenario("a repository engaged by another open train is refused, from the checkout or from origin/main", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	openTrain(world, "autre-train", "Another change");
	const calls = world.readState().calls.length;
	let refused = world.supervise(["link", "schema-in-the-mist#32", "--train", "autre-train"]);
	assert.equal(refused.status, 2, refused.stderr);
	assert.match(refused.stderr, new RegExp(`already engaged by the open train "${TRAIN_ID}"`));
	assert.equal(world.readState().calls.length, calls, "a refused link called gh");

	// The first train is only on origin/main of Handbook, not in the checkout.
	const handbook = world.dir("obsidian-handbook");
	git(handbook, "add", "supervisor/trains");
	git(handbook, "commit", "--quiet", "-m", "record trains");
	git(handbook, "push", "--quiet", "origin", "HEAD:main");
	rmSync(trainPath(world));
	refused = world.supervise(["link", "schema-in-the-mist#32", "--train", "autre-train"]);
	assert.equal(refused.status, 2, refused.stderr);
	assert.match(refused.stderr, new RegExp(`already engaged by the open train "${TRAIN_ID}"`));
});

scenario("a record with a dependency cycle or without coordination issue is refused by name", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
	const record = readRecord(world);
	record.items.find((item: any) => item.repo === "schema-in-the-mist").dependsOn = ["obsidian-handbook"];
	writeFileSync(trainPath(world), JSON.stringify(record, null, "\t"));
	let result = world.supervise(["next"]);
	assert.equal(result.status, 2);
	assert.match(result.stderr, /dependency cycle (schema-in-the-mist -> obsidian-handbook -> schema-in-the-mist|obsidian-handbook -> schema-in-the-mist -> obsidian-handbook)/);
	delete record.coordinationIssue;
	writeFileSync(trainPath(world), JSON.stringify(record, null, "\t"));
	result = world.supervise(["next"]);
	assert.equal(result.status, 2);
	assert.match(result.stderr, /coordinationIssue/);
});

scenario("link --create asks first: nothing is created without a terminal or --yes", (world) => {
	openTrain(world);
	const refused = world.supervise(["link", "lantern", "--create", "--title", "Offer the new colours"]);
	assert.equal(refused.status, 2, refused.stderr);
	assert.match(refused.stderr, /pass --yes/);
	assert.equal(creates(world, REPOSITORY.lantern).length, 0, "an issue was created without confirmation");
	assert.ok(!readRecord(world).items.length, "a refused link wrote an item");
	ok(world.supervise(["link", "lantern", "--create", "--title", "Offer the new colours", "--yes"]), "link --create --yes");
	assert.equal(creates(world, REPOSITORY.lantern).length, 1);
	const item = readRecord(world).items[0];
	assert.equal(item.issue, 1);
	assert.equal(item.title, "Offer the new colours");
	assert.ok(existsSync(trainPath(world)));
});

// Phase 3: the presentation, and what it binds.

/** A validation that runs `code` in the current node: no shell, the same on every OS. */
function nodeCommand(code: string): string[] {
	return [process.execPath, "-e", code];
}

const PASS = nodeCommand("console.log('validation passed')");

/** The shipped topology with harmless validations and consumer convergence commands, written in the world. */
function testTopology(world: World, validations: Record<string, string[][]> = {}, convergence: Record<string, string[][] | null> = {}, name = "topology.json"): string {
	const file = resolve(world.tmp, name);
	const topology = JSON.parse(JSON.stringify(TOPOLOGY));
	for (const repo of topology.repos) {
		repo.validations = validations[repo.id] ?? [PASS];
		if (repo.role === "provider") continue;
		if (convergence[repo.id] === null) delete repo.convergence;
		else repo.convergence = convergence[repo.id] ?? [PASS];
	}
	writeFileSync(file, JSON.stringify(topology));
	return file;
}

/** A train whose three items (Mist, Handbook, Lantern) are closed by a commit on origin/main. */
function doneTrain(world: World): void {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
	ok(world.supervise(["link", "lantern#40"]), "link lantern");
	const closing: Array<[string, number, string]> = [["schema-in-the-mist", 31, "src/colours.ts"], ["obsidian-handbook", 12, "src/colours.ts"], ["lantern", 40, "src/colours.ts"]];
	for (const [repo, issue, path] of closing) {
		const commit = world.land(repo, { [path]: `export const ${repo.replace(/-/g, "")} = [];\n` }, `Colours (fixes #${issue})`);
		world.updateState((state) => {
			state.issues[REPOSITORY[repo]][issue].state = "CLOSED";
			state.events[`repos/${REPOSITORY[repo]}/issues/${issue}/events`] = [{ event: "closed", commit_id: commit }];
		});
	}
}

function presentTrain(world: World, topology: string): void {
	ok(world.supervise(["present"], { topology }), "present");
}

/** Every reason the presentation no longer binds the train, as the supervisor's own module gives them. */
function bindingMessages(world: World, topology: string): string[] {
	// binding.mjs is an ES module that locates the repository by import.meta: it is loaded by node itself, not bundled.
	const probe = [
		"const [root, topologyFile, trainFile] = process.argv.slice(1);",
		"const { loadTopology } = await import('./tools/supervisor/topology.mjs');",
		"const { readTrain } = await import('./tools/supervisor/train.mjs');",
		"const { bindingProblems } = await import('./tools/supervisor/binding.mjs');",
		"const topology = loadTopology(topologyFile);",
		"console.log(JSON.stringify(bindingProblems(root, topology, readTrain(trainFile, topology)).map((problem) => problem.message)));",
	].join("\n");
	return JSON.parse(ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, world.root, topology, trainPath(world)]), "binding probe"));
}

scenario("present reports each concerned repository with its SHA, commits and validations", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	const report = ok(world.supervise(["present"], { topology }), "present");
	for (const repo of ["schema-in-the-mist", "obsidian-handbook", "lantern"]) {
		const sha = git(world.dir(repo), "rev-parse", "origin/main");
		assert.ok(report.includes(`## ${repo} (`) && report.includes(sha.slice(0, 10)), `${repo} at ${sha} missing\n${report}`);
	}
	assert.match(report, /\*\*Presentable\.\*\*/);
	assert.match(report, /Colours \(fixes #31\)/);
	assert.ok(report.includes(`passed: \`${PASS.join(" ")}\``), report);
	assert.match(report, /schema-in-the-mist: release candidate of schema-in-the-mist/);
	assert.match(report, /schema-in-the-mist: final release of schema-in-the-mist, same bytes as the candidate/);
	assert.match(report, /lantern: release/);
	assert.ok(report.includes("## Try it before publishing\n\n`pnpm supervise preview --vault <vault>`"), report);
	assert.ok(report.includes("`pnpm supervise publish --run` publishes exactly these commits"), report);
	const record = readRecord(world);
	assert.equal(record.presentation.presentable, true);
	assert.ok(!("approval" in record), "present wrote an approval");
	assert.ok(!report.includes("schema-pbta ("), "an unconcerned provider was presented");
});

scenario("present refuses an unfinished train and a checkout that is not origin/main", (world) => {
	const topology = testTopology(world);
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	let result = world.supervise(["present"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stderr, /not every item is done: schema-in-the-mist#31 \(ready\)/);

	world.updateState((state) => { state.issues[REPOSITORY["schema-in-the-mist"]][31].state = "CLOSED"; });
	const commit = world.land("schema-in-the-mist", { "src/colours.ts": "export {};\n" }, "Colours");
	world.updateState((state) => { state.events[`repos/${REPOSITORY["schema-in-the-mist"]}/issues/31/events`] = [{ event: "closed", commit_id: commit }]; });
	world.write("lantern", { "src/index.ts": "dirty\n" });
	sh(world.dir("obsidian-handbook"), "git", ["switch", "--quiet", "-c", "feat/elsewhere"]);
	world.commit("obsidian-handbook", { "src/other.ts": "export {};\n" }, "not landed");
	result = world.supervise(["present"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stderr, /lantern: uncommitted changes/);
	assert.match(result.stderr, /obsidian-handbook: HEAD [0-9a-f]{10} is not origin\/main .*switch main && git -C .* pull --ff-only/);
});

scenario("present binds the SHAs without a terminal", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	const report = ok(world.supervise(["present"], { topology }), "present");
	const record = readRecord(world);
	assert.ok(!("approval" in record), "present wrote an approval");
	assert.match(record.presentation.digest, /^sha256:[0-9a-f]{64}$/);
	assert.ok(report.includes(record.presentation.digest), report);
	assert.deepEqual(record.presentation.repos.map((entry: any) => entry.repo).sort(), ["lantern", "obsidian-handbook", "schema-in-the-mist"]);
	assert.equal(record.presentation.repos.find((entry: any) => entry.repo === "lantern").sha, git(world.dir("lantern"), "rev-parse", "origin/main"));
	assert.ok(record.presentation.publications.includes("schema-in-the-mist: release candidate of schema-in-the-mist"));
	assert.ok(record.presentation.presentedAt);
	assert.deepEqual(bindingMessages(world, topology), []);
});

scenario("approve is no longer a command, and the help does not name it", (world) => {
	const result = world.supervise(["approve"]);
	assert.equal(result.status, 2, result.stderr);
	assert.match(result.stderr, /unknown command "approve"/);
	assert.match(result.stderr, /usage: pnpm supervise <command>/);
	assert.ok(!/\bapprove\b/.test(result.stderr.replace("unknown command \"approve\"", "")), result.stderr);
	assert.ok(!/\bapprove\b/.test(ok(world.supervise(["--help"]), "help")));
});

scenario("a record written by the former approve still reads, and its approval binds nothing", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	presentTrain(world, topology);
	const record = readRecord(world);
	const { digest, repos, trainFiles, publications } = record.presentation;
	record.approval = { approvedAt: "2026-10-02T14:43:41.944Z", digest, repos: repos.map(({ repo, sha }: any) => ({ repo, sha: "0".repeat(sha.length) })), trainFiles, publications };
	writeFileSync(trainPath(world), `${JSON.stringify(record, null, "\t")}\n`);
	ok(world.supervise(["next", "--json"]), "next");
	assert.equal(JSON.parse(ok(world.supervise(["status", "--json"]), "status --json")).train.id, TRAIN_ID);
	assert.deepEqual(bindingMessages(world, topology), [], "the obsolete approval was read");

	const validate = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync(resolve(HANDBOOK, "supervisor/train.schema.json"), "utf8")));
	const shipped = resolve(HANDBOOK, "supervisor/trains");
	for (const name of readdirSync(shipped).filter((entry) => entry.endsWith(".json"))) {
		assert.ok(validate(JSON.parse(readFileSync(resolve(shipped, name), "utf8"))), `${name}: ${JSON.stringify(validate.errors)}`);
	}
});

scenario("publish refuses a commit outside the train pushed after present", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	presentTrain(world, topology);
	const late = world.land("lantern", { "src/late.ts": "export {};\n" }, "late change");
	const result = world.supervise(["publish"], { topology });
	assert.equal(result.status, 1, result.stdout);
	assert.ok(result.stderr.includes(`lantern: commit ${late.slice(0, 10)} changes src/late.ts, outside the train files`), result.stderr);
	assert.match(result.stderr, /Present the train again: supervise present/);
});

scenario("publish refuses a presentation edited by hand", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	presentTrain(world, topology);
	const record = readRecord(world);
	record.presentation.repos.find((entry: any) => entry.repo === "lantern").sha = "f".repeat(40);
	writeFileSync(trainPath(world), `${JSON.stringify(record, null, "\t")}\n`);
	const result = world.supervise(["publish", "--run"], { topology });
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /the presentation was edited after present/);
	assert.deepEqual(dispatches(world), []);
});

scenario("an adoption commit of the observed candidate keeps the presentation; any other change voids it", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	presentTrain(world, topology);
	const candidate = world.archive("schema-in-the-mist", "v1.0.1-rc.1");
	const final = world.archive("schema-in-the-mist", "v1.0.0");
	const record = readRecord(world);
	record.publication = { "schema-in-the-mist": { candidate: { tag: candidate.tag, url: candidate.url, sha256: candidate.sha256, integrity: candidate.integrity } } };
	writeFileSync(trainPath(world), `${JSON.stringify(record, null, "\t")}\n`);

	const lantern = world.dir("lantern");
	const adopt: Record<string, string> = {};
	for (const file of ["package.json", "pnpm-lock.yaml", "package-lock.json"]) {
		adopt[file] = readFileSync(resolve(lantern, file), "utf8").split(final.url).join(candidate.url).split(final.integrity).join(candidate.integrity);
	}
	world.land("lantern", adopt, "Adopt schema-in-the-mist v1.0.1-rc.1");
	assert.deepEqual(bindingMessages(world, topology), [], "the adoption voided the presentation");

	const unknown = world.archive("schema-in-the-mist", "v9.9.9");
	world.land("lantern", { "pnpm-lock.yaml": `${adopt["pnpm-lock.yaml"]}# ${unknown.url}\n` }, "Pin an archive nobody observed");
	let result = world.supervise(["publish"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.ok(result.stderr.includes(`introduces ${unknown.url} in pnpm-lock.yaml`), result.stderr);

	const outside = world.land("obsidian-handbook", { "src/main.ts": "export const late = 1;\n" }, "late fix");
	result = world.supervise(["publish"], { topology });
	assert.equal(result.status, 1);
	assert.ok(result.stderr.includes(`obsidian-handbook: commit ${outside.slice(0, 10)} changes src/main.ts, outside the train files`), result.stderr);
	assert.match(result.stderr, /supervise present/);
});

scenario("a failing validation makes the train not presentable and publish --run refuses it, running nothing", (world) => {
	const broken = nodeCommand("console.error('contract broken'); process.exit(3)");
	const topology = testTopology(world, { "schema-in-the-mist": [broken] });
	doneTrain(world);
	const result = world.supervise(["present"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stdout, /\*\*Not presentable\*\*/);
	assert.ok(result.stdout.includes(`schema-in-the-mist: ${broken.join(" ")} exited 3`), result.stdout);
	assert.match(result.stdout, /contract broken/);
	const refused = world.supervise(["publish", "--run"], { topology });
	assert.equal(refused.status, 1, refused.stdout);
	assert.match(refused.stderr, /the last presentation of train "couleur-otherscape" is not presentable/);
	assert.ok(refused.stderr.includes(`schema-in-the-mist: ${broken.join(" ")} exited 3`), refused.stderr);
	assert.deepEqual(dispatches(world), []);
	assert.equal(world.readState().localCalls, undefined);
});

/** A shell validation: `cmd /d /s /c` on Windows, `sh -c` elsewhere. Lines joined by the shell's own separator. */
function shellCommand(lines: string[]): string[] {
	return process.platform === "win32" ? ["cmd", "/d", "/s", "/c", lines.join(" & ")] : ["sh", "-c", lines.join("; ")];
}

/**
 * A Node validation that starts gh and git by absolute path, so no PATH shim
 * stands in its way: only the preloaded hook can refuse it. `leak` runs the
 * first publishing call alone, for the mutation that removes the hook.
 */
function nodeValidation(world: World): string {
	const file = resolve(world.tmp, "publishing-tool.cjs");
	writeFileSync(file, `const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const BIN = ${JSON.stringify(world.bin)};
function run(name, args) {
	const file = join(BIN, name);
	const result = process.platform === "win32"
		? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", \`""\${file}.cmd" \${args.join(" ")}"\`], { windowsVerbatimArguments: true, stdio: "inherit" })
		: spawnSync(file, args, { stdio: "inherit" });
	return result.status;
}
if (run("gh", ["workflow", "run", "release.yml"]) === 0) process.exit(21);
if (process.argv[2] === "leak") process.exit(0);
if (run("gh", ["release", "create", "v9.9.8"]) === 0) process.exit(22);
if (run("git", ["push", "origin", "HEAD:main"]) === 0) process.exit(23);
if (run("git", ["tag", "v9.9.8"]) === 0) process.exit(24);
if (run("gh", ["issue", "list"]) !== 0) process.exit(25);
if (run("git", ["status", "--short"]) !== 0) process.exit(26);
console.log("guarded");
`);
	return file;
}

scenario("a validation cannot release, push or tag: the guard refuses on both paths, ordinary calls go through", (world) => {
	const ghLog = resolve(world.tmp, "real-gh.log");
	const realGh = resolve(world.tmp, "real-gh.mjs");
	writeFileSync(realGh, `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(ghLog)}, process.argv.slice(2).join(" ") + "\\n");\n`);
	world.shim("gh", realGh);
	const shell = shellCommand([
		"gh release create v9.9.9 dist.tgz && exit 11",
		"gh api -X POST repos/o/r/dispatches && exit 12",
		"gh workflow run release.yml && exit 13",
		"git push origin HEAD:main && exit 14",
		"git tag v9.9.9 && exit 15",
		"gh issue list || exit 16",
		"git status --short || exit 17",
		"git tag -l || exit 18",
		"echo guarded",
	]);
	const tool = nodeValidation(world);
	const topology = testTopology(world, { "schema-in-the-mist": [shell, [process.execPath, tool]] });
	doneTrain(world);
	const mist = world.dir("schema-in-the-mist");
	const remote = git(mist, "ls-remote", "origin", "refs/heads/main", "refs/tags/*");
	const report = ok(world.supervise(["present"], { topology }), "present");
	assert.ok(report.includes(`passed: \`${shell.join(" ")}\``), report);
	assert.ok(report.includes(`passed: \`${process.execPath} ${tool}\``), report);
	const calls = readFileSync(ghLog, "utf8");
	assert.equal(calls, "issue list\nissue list\n", `the real gh saw: ${calls}`);
	assert.equal(git(mist, "ls-remote", "origin", "refs/heads/main", "refs/tags/*"), remote, "a validation moved the remote");
	const gitCalls = readFileSync(world.gitLog, "utf8");
	assert.doesNotMatch(gitCalls, /^push/m, "a push reached git");
	assert.doesNotMatch(gitCalls, /^tag v9/m, "a tag reached git");

	// Mutation: each path, removed alone, lets its publishing call through.
	const env = world.env();
	const key = pathKey(env);
	const unshimmed = { ...env, NODE_OPTIONS: withRequire(env.NODE_OPTIONS, join(GUARD_DIR, "hook.cjs")) };
	const [command, ...args] = shellCommand(["gh release create v9.9.9 dist.tgz"]);
	spawnCommand(command, args, { cwd: mist, env: unshimmed, encoding: "utf8" });
	assert.match(readFileSync(ghLog, "utf8"), /^release create v9\.9\.9/m, "without its shims the shell path did not leak: the scenario proves nothing");
	const unhooked = { ...env, [key]: [GUARD_DIR, env[key]].join(delimiter) };
	spawnCommand(process.execPath, [tool, "leak"], { cwd: mist, env: unhooked, encoding: "utf8" });
	assert.match(readFileSync(ghLog, "utf8"), /^workflow run release\.yml/m, "without its hook the Node path did not leak: the scenario proves nothing");
});

// Phase 4: publication, one provider at a time, bound by the presentation.

const NEXT = "1.1.0";

function bytesOf(provider: string, variant = ""): string {
	return `package ${provider} ${NEXT}${variant}\n`;
}

/**
 * A train of `providers` then both consumers, every item closed by a commit
 * (each provider's bumps it to 1.1.0), presented unless told not.
 */
function presentedTrain(world: World, providers: string[], options: { present?: boolean; secrets?: boolean; before?: () => void } = {}): string {
	const topology = testTopology(world);
	const items: Array<[string, number]> = [...providers.map((id, index): [string, number] => [id, 50 + index]), ["obsidian-handbook", 12], ["lantern", 40]];
	world.updateState((state) => {
		for (const [repo, number] of items) state.issues[REPOSITORY[repo]] = { [number]: { number, title: `Change ${repo}`, state: "OPEN" } };
		if (options.secrets !== false) state.secrets[REPOSITORY["schema-pbta"]] = ["RELEASE_TOKEN"];
	});
	openTrain(world);
	for (const [repo, number] of items) ok(world.supervise(["link", `${repo}#${number}`]), `link ${repo}`);
	for (const [repo, number] of items) {
		const files: Record<string, string> = { "src/change.ts": `export const change = ${number};\n` };
		if (providers.includes(repo)) files["package.json"] = `${JSON.stringify({ name: repo, version: NEXT }, null, "\t")}\n`;
		const commit = world.land(repo, files, `Change (fixes #${number})`);
		world.updateState((state) => {
			state.issues[REPOSITORY[repo]][number].state = "CLOSED";
			state.events[`repos/${REPOSITORY[repo]}/issues/${number}/events`] = [{ event: "closed", commit_id: commit }];
		});
	}
	options.before?.();
	if (options.present !== false) presentTrain(world, topology);
	return topology;
}

function publish(world: World, run: boolean, topology?: string) {
	return world.supervise(run ? ["publish", "--run"] : ["publish"], { topology });
}

function dispatches(world: World, workflow?: string): string[][] {
	return world.readState().calls
		.filter((call: any) => call.args[0] === "workflow" && call.args[1] === "run" && (!workflow || call.args[2] === workflow))
		.map((call: any) => call.args);
}

/** Both consumers land `candidate` in place of the `from` pin (v1.0.0 by default): package.json and every lockfile. */
function adopt(world: World, provider: string, candidate: { tag: string; url: string; integrity: string }, from: { url: string; integrity: string } = world.archive(provider, "v1.0.0")): void {
	const consumers: Array<[string, string[]]> = [["obsidian-handbook", ["package.json", "pnpm-lock.yaml"]], ["lantern", ["package.json", "pnpm-lock.yaml", "package-lock.json"]]];
	for (const [id, files] of consumers) {
		const changed: Record<string, string> = {};
		for (const file of files) {
			changed[file] = readFileSync(resolve(world.dir(id), file), "utf8").split(from.url).join(candidate.url).split(from.integrity).join(candidate.integrity);
		}
		world.landFiles(id, changed, `Adopt ${provider} ${candidate.tag}`);
	}
}

/** A file as origin/main of a repository holds it. */
function originFile(world: World, id: string, path: string): string {
	return git(world.dir(id), "show", `origin/main:${path}`);
}

/** A file as the commit that first added it holds it. */
function firstVersion(world: World, id: string, path: string): string {
	const added = git(world.dir(id), "log", "--format=%H", "--diff-filter=A", "origin/main", "--", path).split("\n").pop();
	return git(world.dir(id), "show", `${added}:${path}`);
}

function lastSubject(world: World, id: string): string {
	return git(world.dir(id), "log", "-1", "--format=%s", "origin/main");
}

/** The installs the supervisor ran, as `<repository directory> <args>`. */
function installs(world: World): string[] {
	return (world.readState().localCalls ?? [])
		.filter((call: any) => call.args[0] === "install" || call.args[0] === "ci")
		.map((call: any) => `${basename(call.cwd)} ${call.args.join(" ")}`);
}

/** schema-in-the-mist from its presentation through its local promotion, whose final carries `finalBytes`, then its convergence. */
function driveMist(world: World, finalBytes: string, topology: string) {
	const mist = REPOSITORY["schema-in-the-mist"];
	world.updateState((state) => {
		state.workflowEffects[`${mist} release-candidate.yml`] = [{ createRelease: world.release("schema-in-the-mist", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-in-the-mist")) }];
		state.localEffects = {
			...state.localEffects,
			"schema-in-the-mist release-train:promote": [{ repository: mist, createRelease: world.release("schema-in-the-mist", `v${NEXT}`, "2026-09-29T11:00:00Z", finalBytes) }],
			"schema-in-the-mist release-train:converge": [{ write: { path: `release-trains/v${NEXT}.convergence.json`, content: "{\"converged\": true}\n" } }],
		};
	});
	const candidate = world.archive("schema-in-the-mist", `v${NEXT}-rc.1`);
	return { candidate, result: publish(world, true, topology) };
}

scenario("publish shows the next step and its exact command, runs nothing, and says the same twice", (world) => {
	presentedTrain(world, ["schema-pbta", "schema-in-the-mist"], { secrets: false });
	const sha = readRecord(world).presentation.repos.find((entry: any) => entry.repo === "schema-pbta").sha;
	const first = ok(publish(world, false), "publish");
	assert.ok(first.includes(`$ gh workflow run release.yml -R RebelliousSmile/schema-pbta --ref main -f mode=digest -f provider_commit=${sha}`), first);
	assert.match(first, /Nothing was run/);
	assert.equal(ok(publish(world, false), "publish again"), first, "a same observation gave another step");
	assert.deepEqual(dispatches(world), []);
	assert.equal(world.readState().calls.filter((call: any) => call.args[0] === "secret").length, 0, "publish without --run read secrets");
	assert.equal(readRecord(world).publication["schema-pbta"]?.runs, undefined);
});

scenario("a same observation always gives the same step, for each adapter", () => {
	const repo = (id: string) => TOPOLOGY.repos.find((entry: any) => entry.id === id);
	const candidate = { tag: "v1.1.0-rc.1", url: "https://github.com/o/r/releases/download/v1.1.0-rc.1/p-1.1.0.tgz", sha256: "a".repeat(64), integrity: "sha512-x" };
	const run = (conclusion: string | null) => ({ step: "s", url: "https://github.com/o/r/actions/runs/1", conclusion, at: "t" });
	const common = { sha: "b".repeat(40), version: NEXT, finalTag: `v${NEXT}`, final: null, candidate, published: true, adopted: true, trainProblem: null, trainPath: "release-train/x.json" };
	const adoption = [{ repo: "obsidian-handbook", sha: "c".repeat(40), adopted: true }, { repo: "lantern", sha: "d".repeat(40), adopted: false }];
	const consumers = [{ role: "handbook", repository: "o/h", ref: "c".repeat(40) }];
	const observations: Array<[any, any]> = [
		["pbta", { ...common, repo: repo("schema-pbta"), provider: "schema-pbta", candidate: null, runs: { digest: run(null) }, inputs: { digest: {} } }],
		["pbta", { ...common, repo: repo("schema-pbta"), provider: "schema-pbta", candidateProblem: null, adoption, runs: {}, inputs: {} }],
		["pbta", { ...common, repo: repo("schema-pbta"), provider: "schema-pbta", candidateProblem: null, adoption: adoption.map((entry) => ({ ...entry, adopted: true })), runs: { train: run("success"), promote: run("failure") }, inputs: { promote: { mode: "promote" } } }],
		["adrenaline", { ...common, repo: repo("schema-adrenaline"), provider: "schema-adrenaline", candidateTag: "v1.1.0-rc.1", published: false, runs: { candidate: null }, inputs: { candidate: { tag: "v1.1.0-rc.1" } } }],
		["adrenaline", { ...common, repo: repo("schema-adrenaline"), provider: "schema-adrenaline", adoption: [], consumers, trainProblem: "is not on origin/main", runs: {}, inputs: {} }],
		["adrenaline", { ...common, repo: repo("schema-adrenaline"), provider: "schema-adrenaline", adoption: [], tagPushed: false, runs: { train: run("success") }, inputs: {} }],
		["mist", { ...common, repo: repo("schema-in-the-mist"), provider: "schema-in-the-mist", adoption: [], proven: false, provenance: "/p.json", runs: {}, inputs: {} }],
		["mist", { ...common, repo: repo("schema-in-the-mist"), provider: "schema-in-the-mist", adoption: [{ repo: "obsidian-handbook", adopted: true }], consumers, trainProblem: "is not on origin/main", runs: {}, inputs: {} }],
	];
	// The adapters are ES modules that locate the repository by import.meta: they are loaded by node itself, not bundled.
	const probe = [
		"const observations = JSON.parse(process.argv[1]);",
		"const results = [];",
		"for (const [name, observation] of observations) {",
		"\tconst adapter = await import(`./tools/supervisor/adapters/${name}.mjs`);",
		"\tconst copy = structuredClone(observation);",
		"\tresults.push({ first: adapter.nextStep(observation), second: adapter.nextStep(copy), untouched: JSON.stringify(observation) === JSON.stringify(copy) });",
		"}",
		"console.log(JSON.stringify(results));",
	].join("\n");
	const result = sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, JSON.stringify(observations)]);
	const steps = JSON.parse(ok(result, "nextStep probe")) as any[];
	for (const [index, entry] of steps.entries()) {
		const provider = observations[index][1].provider;
		assert.notEqual(entry.first.kind, "done", `${provider}: observation ${index} is not finished`);
		assert.deepEqual(entry.second, entry.first, `${provider}: a copy of observation ${index} gave another step`);
		assert.ok(entry.untouched, `${provider}: nextStep changed observation ${index}`);
	}
	assert.deepEqual(steps.map((entry) => entry.first.type ?? entry.first.kind), ["wait", "adopt", "workflow", "workflow", "land", "tag", "local", "land"]);
	assert.deepEqual(steps[1].first.consumers, ["lantern"], "an adopted consumer is adopted again");
	assert.deepEqual(steps[5].first.command, ["git", "push", "origin", `origin/main:refs/tags/v${NEXT}`]);
});

/** schema-pbta from its presentation to its final, through the four dispatches of its release workflows, then its convergence. */
function drivePbta(world: World, topology: string) {
	const pbta = REPOSITORY["schema-pbta"];
	const sha = readRecord(world).presentation.repos.find((entry: any) => entry.repo === "schema-pbta").sha;
	const candidate = world.archive("schema-pbta", `v${NEXT}-rc.1`, bytesOf("schema-pbta"));
	const receipt = resolve(world.tmp, "receipt", "candidate-digest.json");
	mkdirSync(resolve(world.tmp, "receipt"));
	writeFileSync(receipt, JSON.stringify({ protocol: 1, providerCommit: sha, version: NEXT, filename: `schema-pbta-${NEXT}.tgz`, sha256: candidate.sha256, integrity: candidate.integrity }));
	world.updateState((state) => {
		state.workflowEffects[`${pbta} release.yml`] = [
			{ artifacts: [{ name: `schema-pbta-digest-${sha}`, file: receipt }] },
			{ createRelease: world.release("schema-pbta", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-pbta")) },
			{ createRelease: world.release("schema-pbta", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-pbta")) },
		];
	});
	const result = publish(world, true, topology);
	return { pbta, sha, candidate, candidatePath: `release-train/candidates/schema-pbta-v${NEXT}-rc.1.json`, trainPath: `release-train/schema-pbta-v${NEXT}.json`, result };
}

scenario("publish --run takes schema-pbta through digest, stage, release-train and promote, landing its manifests and the adoption itself", (world) => {
	const topology = presentedTrain(world, ["schema-pbta"]);
	const { pbta, sha, candidate, candidatePath, trainPath, result } = drivePbta(world, topology);
	const output = ok(result, "publish --run");
	assert.match(output, /adopt the candidate v1\.1\.0-rc\.1 of schema-pbta in obsidian-handbook and lantern/);
	assert.match(output, /Every provider of train couleur-otherscape is published/);

	const head = ["-R", pbta, "--ref", "main"];
	assert.deepEqual(dispatches(world), [
		["workflow", "run", "release.yml", ...head, "-f", "mode=digest", "-f", `provider_commit=${sha}`],
		["workflow", "run", "release.yml", ...head, "-f", "mode=stage", "-f", `provider_commit=${sha}`, "-f", `config=${candidatePath}`],
		["workflow", "run", "release-train.yml", ...head, "-f", `provider_commit=${sha}`, "-f", `config=${trainPath}`],
		["workflow", "run", "release.yml", ...head, "-f", "mode=promote", "-f", `provider_commit=${sha}`, "-f", `config=${trainPath}`],
	]);
	const candidateManifest = JSON.parse(originFile(world, "schema-pbta", candidatePath));
	assert.deepEqual(Object.keys(candidateManifest).sort(), ["candidate", "protocol"]);
	assert.equal(candidateManifest.candidate.sha256, candidate.sha256, "the receipt's candidate is not the one of its manifest");
	const train = JSON.parse(originFile(world, "schema-pbta", trainPath));
	assert.deepEqual(train.consumers.map((consumer: any) => [consumer.role, consumer.path, consumer.proof.manifest]), [
		["handbook", "handbook", "release-train.manifest.json"],
		["lantern", "lantern", "release-train.manifest.json"],
	]);
	for (const id of ["obsidian-handbook", "lantern"]) {
		const adoption = git(world.dir(id), "log", "--format=%s", "origin/main").split("\n");
		assert.ok(adoption.includes(`chore(deps): adopt schema-pbta v${NEXT}-rc.1`), `${id} did not adopt the candidate:\n${adoption.join("\n")}`);
	}
	const record = readRecord(world).publication["schema-pbta"];
	assert.equal(record.final.tag, `v${NEXT}`);
	assert.equal(record.final.sha256, record.candidate.sha256);
	assert.deepEqual(record.runs.map((entry: any) => `${entry.step} ${entry.conclusion}`), ["digest success", "stage success", "release-train success", "promote success"]);
	assert.match(ok(publish(world, false), "the presentation still holds after the publication"), /Every provider of train couleur-otherscape is published/);
});

scenario("publish --run promotes schema-in-the-mist locally in its checkout, with the candidate's bytes", (world) => {
	const topology = presentedTrain(world, ["schema-in-the-mist"]);
	const { candidate, result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
	const output = ok(result, "publish --run");
	assert.match(output, /adopt the candidate v1\.1\.0-rc\.1 of schema-in-the-mist in obsidian-handbook and lantern/);
	assert.match(output, /Every provider of train couleur-otherscape is published/);
	const mistDir = world.dir("schema-in-the-mist");
	const evidence = resolve(world.dir("obsidian-handbook"), "supervisor/trains", `${TRAIN_ID}.evidence`, `schema-in-the-mist-v${NEXT}.provenance.json`);
	const mistCalls = world.readState().localCalls.filter((call: any) => call.cwd === mistDir).map((call: any) => call.args);
	assert.deepEqual(mistCalls.slice(0, 2), [
		["run", "release-train:assert", "--", `release-trains/v${NEXT}.json`, "--output", evidence],
		["run", "release-train:promote", "--", `release-trains/v${NEXT}.json`, "--evidence", evidence],
	]);
	assert.ok(existsSync(evidence), "the provenance was not written");
	const record = readRecord(world).publication["schema-in-the-mist"];
	assert.equal(record.final.sha256, candidate.sha256);
	assert.deepEqual(record.runs.map((entry: any) => `${entry.step} ${entry.conclusion}`), ["candidate success", "assert success", "promote success"]);
	assert.deepEqual(dispatches(world).map((args) => args[2]), ["release-candidate.yml"]);
	const manifest = JSON.parse(firstVersion(world, "schema-in-the-mist", `release-trains/v${NEXT}.json`));
	assert.deepEqual(Object.keys(manifest).sort(), ["candidate", "consumers", "status"], "the manifest has keys the Mist validator refuses");
	assert.equal(manifest.status, "pending");
	assert.deepEqual(Object.keys(manifest.candidate).sort(), ["finalTag", "integrity", "packageName", "providerCommit", "releaseUrl", "sha256", "stagingTag"]);
	assert.deepEqual(manifest.consumers.map((consumer: any) => [consumer.role, consumer.repository, Object.keys(consumer).sort()]), [
		["handbook", REPOSITORY["obsidian-handbook"], ["path", "proof", "ref", "repository", "role"]],
		["lantern", REPOSITORY.lantern, ["path", "proof", "ref", "repository", "role"]],
	]);
	for (const consumer of manifest.consumers) assert.deepEqual(consumer.proof, { interface: "npm-run-release-train-assert", manifest: "release-train/schema-in-the-mist.json" });
});

scenario("without a presentation that holds, publish --run dispatches nothing and runs nothing", (world) => {
	presentedTrain(world, ["schema-in-the-mist"], { present: false });
	let result = publish(world, true);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /train "couleur-otherscape" was never presented/);
	presentTrain(world, testTopology(world));
	const outside = world.land("schema-in-the-mist", { "src/late.ts": "export {};\n" }, "late change");
	result = publish(world, true);
	assert.equal(result.status, 1, result.stdout);
	assert.ok(result.stderr.includes(`commit ${outside.slice(0, 10)} changes src/late.ts, outside the train files`), result.stderr);
	assert.deepEqual(dispatches(world), []);
	assert.equal(world.readState().localCalls, undefined);
});

scenario("a consumer that fails with the candidate stops publish --run by name, its pins restored and nothing of it committed", (world) => {
	const topology = presentedTrain(world, ["schema-in-the-mist"]);
	const before = originMain(world, "lantern");
	world.updateState((state) => {
		state.localEffects = { "lantern install": [{ status: 4 }] };
	});
	const { result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /lantern does not pass with schema-in-the-mist v1\.1\.0-rc\.1: `pnpm install --frozen-lockfile` exited 4; its pins are restored and nothing of lantern was committed/);
	assert.equal(originMain(world, "lantern"), before, "lantern was pushed");
	assert.equal(git(world.dir("lantern"), "status", "--porcelain"), "", "the pins of lantern were not restored");
	assert.deepEqual(installs(world).filter((entry) => entry.startsWith("lantern ")), ["lantern install --frozen-lockfile", "lantern install --frozen-lockfile"], "the restored pins were not installed again");
	assert.equal(readRecord(world).publication["schema-in-the-mist"].final, undefined);
	assert.deepEqual(world.readState().localCalls.filter((call: any) => call.cwd === world.dir("schema-in-the-mist")), [], "the provider went on without its consumer");
});

scenario("after a failed release-train, publish resumes at the proof, pushes the final tag and follows the release it starts", (world) => {
	const topology = presentedTrain(world, ["schema-adrenaline"]);
	const adrenaline = REPOSITORY["schema-adrenaline"];
	world.updateState((state) => {
		state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
		state.workflowEffects[`${adrenaline} release-train.yml`] = [{ conclusion: "failure" }, {}];
		state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ repository: adrenaline, workflow: "release.yml", createRelease: world.release("schema-adrenaline", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-adrenaline")) }];
	});
	const failed = publish(world, true, topology);
	assert.equal(failed.status, 1, failed.stdout);
	assert.match(failed.stderr, /release-train\.yml run https:\/\/github\.com\/RebelliousSmile\/schema-adrenaline\/actions\/runs\/\d+ concluded failure/);
	for (const id of ["obsidian-handbook", "lantern"]) assert.equal(lastSubject(world, id), `chore(deps): adopt schema-adrenaline v${NEXT}-rc.1`);
	const trainPath = `release-train/schema-adrenaline-v${NEXT}.json`;
	const manifest = JSON.parse(originFile(world, "schema-adrenaline", trainPath));
	assert.deepEqual(Object.keys(manifest).sort(), ["candidate", "consumers", "protocol"]);
	assert.deepEqual(Object.keys(manifest.candidate).sort(), ["finalTag", "integrity", "provider", "providerCommit", "releaseUrl", "sha256", "stagingTag", "version"]);
	assert.deepEqual(manifest.consumers.map((consumer: any) => Object.keys(consumer).sort().join(" ")), ["ref repository role", "ref repository role"]);

	const shown = ok(publish(world, false, topology), "publish after the failure");
	assert.ok(shown.includes(`$ gh workflow run release-train.yml -R ${adrenaline} --ref main -f manifest=${trainPath}`), shown);
	const output = ok(publish(world, true, topology), "publish --run again");
	assert.ok(output.includes(`$ git push origin origin/main:refs/tags/v${NEXT}`), output);
	assert.match(output, /Every provider of train couleur-otherscape is published/);
	assert.notEqual(sh(world.dir("schema-adrenaline"), "git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/v${NEXT}`]).status, 2, "the final tag was not pushed");

	assert.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml", "release-train.yml"], "release.yml was dispatched on top of the run of the tag");
	const record = readRecord(world).publication["schema-adrenaline"];
	assert.deepEqual(record.runs.map((entry: any) => `${entry.step} ${entry.conclusion}`), ["candidate success", "release-train failure", "release-train success"]);
	assert.equal(record.final.sha256, record.candidate.sha256);

	const final = JSON.parse(originFile(world, "schema-adrenaline", `release-train/schema-adrenaline-v${NEXT}-final.json`));
	assert.equal(final.protocol, 2);
	assert.equal(final.artifact.releaseUrl, world.archive("schema-adrenaline", `v${NEXT}`).url);
	assert.deepEqual(final.consumers.map((consumer: any) => [consumer.role, consumer.ref]), [["handbook", originMain(world, "obsidian-handbook")], ["lantern", originMain(world, "lantern")]]);
	assert.deepEqual(world.readState().localCalls.filter((call: any) => call.cwd === world.dir("schema-adrenaline")).map((call: any) => call.args), [["run", "release-train:verify-final"]]);
	assert.equal(readRecord(world).convergence.status, "passed");
});

scenario("a dispatched run held by reviewers stops publish at once; run again, the same run is taken up and nothing is dispatched twice", (world) => {
	const topology = presentedTrain(world, ["schema-adrenaline"]);
	const adrenaline = REPOSITORY["schema-adrenaline"];
	world.updateState((state) => {
		state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ status: "waiting" }];
	});
	const held = publish(world, true, topology);
	assert.equal(held.status, 1, held.stdout);
	assert.match(held.stderr, /run https:\/\/github\.com\/RebelliousSmile\/schema-adrenaline\/actions\/runs\/\d+ is waiting: the release environment still has required reviewers; remove them, then run the command again: pnpm supervise publish --run/);
	assert.deepEqual(readRecord(world).publication["schema-adrenaline"].runs.map((entry: any) => `${entry.step} ${entry.conclusion}`), ["candidate null"]);

	// The reviewers are gone: the held run completes, and the run after it stays open for one look before it fails.
	world.updateState((state) => {
		state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
		state.workflowEffects[`${adrenaline} release-train.yml`] = [{ status: "in_progress" }, { conclusion: "failure" }];
	});
	const failed = publish(world, true, topology);
	assert.equal(failed.status, 1, failed.stdout);
	assert.match(failed.stderr, /release-train\.yml run \S+ concluded failure/);
	assert.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml"], "a run was dispatched a second time");
	assert.deepEqual(readRecord(world).publication["schema-adrenaline"].runs.map((entry: any) => `${entry.step} ${entry.conclusion}`), ["candidate success", "release-train failure"]);
});

scenario("the release run of the final tag held by reviewers stops publish at once; once it completes, publish observes the final without dispatching release.yml", (world) => {
	const topology = presentedTrain(world, ["schema-adrenaline"]);
	const adrenaline = REPOSITORY["schema-adrenaline"];
	world.updateState((state) => {
		state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
		state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ repository: adrenaline, workflow: "release.yml", status: "waiting" }];
	});
	const held = publish(world, true, topology);
	assert.equal(held.status, 1, held.stdout);
	assert.ok(held.stdout.includes(`$ git push origin origin/main:refs/tags/v${NEXT}`), held.stdout);
	assert.match(held.stderr, /run \S+ is waiting: the release environment still has required reviewers; remove them/);
	assert.equal(readRecord(world).publication["schema-adrenaline"].final, undefined);

	world.updateState((state) => {
		state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-adrenaline")) }];
	});
	const output = ok(publish(world, true, topology), "publish --run once the run is released");
	assert.match(output, /Every provider of train couleur-otherscape is published/);
	assert.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml"], "release.yml was dispatched on top of the run of the tag");
	assert.equal(git(world.dir("schema-adrenaline"), "ls-remote", "--tags", "origin", `refs/tags/v${NEXT}`).split("\n").length, 1);
	const record = readRecord(world).publication["schema-adrenaline"];
	assert.equal(record.final.sha256, record.candidate.sha256);
});

scenario("a run that never completes stops its watch at the limit, naming its last status, its URL and the command that follows it again", (world) => {
	const adrenaline = REPOSITORY["schema-adrenaline"];
	const url = `https://github.com/${adrenaline}/actions/runs/1000`;
	world.updateState((state) => {
		state.runs = { ...state.runs, [adrenaline]: [{ databaseId: 1000, workflowName: "release.yml", headBranch: `v${NEXT}`, status: "in_progress", conclusion: null, url }] };
	});
	// publish.mjs locates the repository by import.meta: it is loaded by node itself, not bundled. The delays are the probe's, no command sets them.
	const probe = [
		"const [repository, url] = process.argv.slice(1);",
		"const { followRun } = await import('./tools/supervisor/publish.mjs');",
		"try {",
		"	console.log(`completed ${followRun({ repository }, { id: 1000, url }, 'pnpm supervise publish --run', { watchMs: 10, limitMs: 60 })}`);",
		"} catch (error) {",
		"	console.log(error.message);",
		"}",
	].join("\n");
	const message = ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, adrenaline, url], world.env()), "watch probe");
	assert.ok(message.includes(`run ${url} did not complete within`), message);
	assert.ok(message.includes("its last status was in_progress; nothing was dispatched again, follow it with: pnpm supervise publish --run"), message);
	assert.deepEqual(dispatches(world), []);
});

scenario("a missing RELEASE_TOKEN on schema-pbta stops publish --run before any dispatch, by name", (world) => {
	presentedTrain(world, ["schema-pbta"], { secrets: false });
	const result = publish(world, true);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /RebelliousSmile\/schema-pbta lacks the secret RELEASE_TOKEN that release\.yml reads; nothing was run/);
	assert.deepEqual(dispatches(world), []);
});

scenario("inputs a workflow does not declare stop publish before anything is dispatched", (world) => {
	presentedTrain(world, ["schema-adrenaline"], {
		before: () => {
			world.land("schema-adrenaline", { ".github/workflows/publish-candidate.yml": "on:\n  workflow_dispatch:\n    inputs:\n      version:\n        required: true\n" }, "Rename the input");
		},
	});
	const result = publish(world, true);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /publish-candidate\.yml: input tag is not declared; required input version is missing/);
	assert.deepEqual(dispatches(world), []);
});

scenario("a final whose bytes differ from the candidate stops publish, naming both digests", (world) => {
	const topology = presentedTrain(world, ["schema-in-the-mist"]);
	const { candidate, result } = driveMist(world, bytesOf("schema-in-the-mist", " rebuilt"), topology);
	const final = world.archive("schema-in-the-mist", `v${NEXT}`);
	assert.equal(result.status, 1, result.stdout);
	assert.ok(result.stderr.includes(final.sha256) && result.stderr.includes(candidate.sha256), result.stderr);
	assert.notEqual(final.sha256, candidate.sha256);
	assert.equal(readRecord(world).publication["schema-in-the-mist"].final, undefined, "a final with other bytes was recorded");
	const again = publish(world, false, topology);
	assert.equal(again.status, 1, "a second look must stop the same way");
});

scenario("with two providers, publish --run finishes the first one of the train before it starts the second", (world) => {
	const topology = presentedTrain(world, ["schema-in-the-mist", "schema-adrenaline"]);
	world.updateState((state) => {
		state.workflowEffects[`${REPOSITORY["schema-adrenaline"]} publish-candidate.yml`] = [{ conclusion: "failure" }];
	});
	const { result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /publish-candidate\.yml run \S+ concluded failure/);
	assert.deepEqual(dispatches(world).map((args) => `${args[4]} ${args[2]}`), [`${REPOSITORY["schema-in-the-mist"]} release-candidate.yml`, `${REPOSITORY["schema-adrenaline"]} publish-candidate.yml`]);
	assert.equal(readRecord(world).publication["schema-in-the-mist"].final.tag, `v${NEXT}`);
	assert.equal(readRecord(world).publication["schema-adrenaline"].final, undefined);
});

// Phase 5: convergence of the consumers on every final, their releases, and the closing.

const FAIL = nodeCommand("console.error('pins do not converge'); process.exit(3)");

function converge(world: World, topology: string) {
	return world.supervise(["converge"], { topology });
}

function close(world: World, topology: string, run: boolean) {
	return world.supervise(run ? ["close", "--run"] : ["close"], { topology });
}

/** The coordination issue of the train, as the fake GitHub holds it. */
function coordinationIssue(world: World): any {
	const { repo, number } = readRecord(world).coordinationIssue;
	return world.readState().issues[REPOSITORY[repo]][number];
}

function issueCalls(world: World): string[] {
	return world.readState().calls
		.filter((call: any) => call.args[0] === "issue" && (call.args[1] === "close" || call.args[1] === "comment"))
		.map((call: any) => `${call.args[1]} ${call.args[4]}#${call.args[2]}`);
}

/** A consumer release: its version bumped on main, the tag `v<version>` pushed, its GitHub release published. */
function releaseConsumer(world: World, id: string, version: string): string {
	const manifest = JSON.parse(readFileSync(resolve(world.dir(id), "package.json"), "utf8"));
	const commit = world.landFiles(id, { "package.json": `${JSON.stringify({ ...manifest, version }, null, "\t")}\n` }, `Release ${version}`);
	git(world.dir(id), "tag", `v${version}`, commit);
	git(world.dir(id), "push", "--quiet", "origin", `v${version}`);
	world.updateState((state) => {
		state.releases[REPOSITORY[id]] = [{ tagName: `v${version}`, isPrerelease: false, isDraft: false, publishedAt: "2026-09-29T12:00:00Z", assets: [] }, ...(state.releases[REPOSITORY[id]] ?? [])];
	});
	return commit;
}

/** schema-pbta published by publish --run, which then converges both consumers on its final. */
function pbtaOnFinal(world: World, options: { convergence?: Record<string, string[][] | null> } = {}) {
	const presented = presentedTrain(world, ["schema-pbta"]);
	const topology = options.convergence ? testTopology(world, {}, options.convergence, "converge-topology.json") : presented;
	const { candidate, result } = drivePbta(world, topology);
	const final = world.archive("schema-pbta", `v${NEXT}`);
	return { topology, candidate, final, result };
}

scenario("converge names each consumer that does not pin the final, with both URLs, and close refuses the unproven train", (world) => {
	const { topology, candidate, final, result } = pbtaOnFinal(world);
	ok(result, "publish --run");
	adopt(world, "schema-pbta", candidate, final);
	const refusedConvergence = converge(world, topology);
	assert.equal(refusedConvergence.status, 1, refusedConvergence.stdout);
	for (const consumer of ["obsidian-handbook", "lantern"]) {
		assert.ok(refusedConvergence.stdout.includes(`${consumer}: package.json pins ${candidate.url}`), refusedConvergence.stdout);
	}
	assert.ok(refusedConvergence.stdout.includes(`the final is ${final.url}`), refusedConvergence.stdout);
	assert.equal(readRecord(world).convergence.status, "failed");
	assert.equal(readRecord(world).convergence.checks.length, 0, "a check ran before the pins converged");

	const refused = close(world, topology, true);
	assert.equal(refused.status, 1, refused.stdout);
	assert.match(refused.stderr, /convergence of train "couleur-otherscape" failed; run supervise converge first; nothing was closed/);
	assert.equal(coordinationIssue(world).state, "OPEN");
	assert.deepEqual(issueCalls(world), []);
	assert.equal(readRecord(world).status, "open");
});

scenario("publish --run converges by itself: each consumer adopts the final, every check runs behind the guard, and schema-pbta has no tool of its own", (world) => {
	const { final, result } = pbtaOnFinal(world);
	const output = ok(result, "publish --run");
	assert.match(output, /Every consumer pins every final on origin\/main: schema-pbta v1\.1\.0/);
	assert.match(output, /Next: pnpm supervise release --run, then pnpm supervise close --run\./);
	for (const id of ["obsidian-handbook", "lantern"]) {
		assert.ok(originFile(world, id, "package.json").includes(final.url), `${id} does not pin the final`);
	}
	assert.equal(lastSubject(world, "obsidian-handbook"), `chore(deps): adopt schema-pbta v${NEXT}`);
	assert.equal(lastSubject(world, "lantern"), `chore(release-train): register schema-pbta v${NEXT}`);
	const matrix = JSON.parse(originFile(world, "lantern", "release-train.matrix.json"));
	const head = originMain(world, "schema-pbta");
	assert.equal(matrix.handbook.ref, originMain(world, "obsidian-handbook"), "the registry does not read the Handbook that pins the final");
	const pbtaEntry = matrix.providers.find((entry: any) => entry.provider === "schema-pbta");
	assert.equal(pbtaEntry.ref, head, "the registry does not read schema-pbta where its manifest is");
	assert.deepEqual(pbtaEntry.manifests.map((manifest: any) => `${manifest.path} ${manifest.validatorRef}`), [`release-train/earlier.json ${"0".repeat(40)}`, `release-train/schema-pbta-v${NEXT}.json ${head}`]);
	assert.ok(matrix.providers.filter((entry: any) => entry.provider !== "schema-pbta").every((entry: any) => entry.ref === "0".repeat(40)), "a provider outside the train moved");
	assert.ok(originFile(world, "lantern", "release-train.matrix.json").startsWith("{\n    \"protocol\": 1,"), "the registry lost its layout");
	const installed = (id: string) => `${basename(world.dir(id))} install --frozen-lockfile`;
	assert.deepEqual(installs(world).sort(), [installed("lantern"), installed("lantern"), installed("obsidian-handbook"), installed("obsidian-handbook")].sort(), "each consumer installs the candidate, then the final");
	const convergence = readRecord(world).convergence;
	assert.equal(convergence.status, "passed");
	assert.deepEqual(convergence.checks.map((check: any) => `${check.repo} ${check.status}`).sort(), ["lantern 0", "obsidian-handbook 0"]);
	assert.deepEqual(convergence.repos.map((entry: any) => entry.repo).sort(), ["lantern", "obsidian-handbook", "schema-pbta"]);
	for (const entry of convergence.repos) assert.equal(entry.sha, git(world.dir(entry.repo), "rev-parse", "origin/main"));
	assert.ok(convergence.notes.some((note: string) => note.startsWith("schema-pbta: no convergence tool of its own")), convergence.notes.join("\n"));
	assert.equal(dispatches(world).length, 4, "converge dispatched a workflow");
	assert.match(ok(publish(world, false), "adopting the final keeps the presentation"), /Every provider of train couleur-otherscape is published/);
});

scenario("a failing consumer check or a consumer without convergence command fails the convergence, by name", (world) => {
	const { result } = pbtaOnFinal(world, { convergence: { lantern: [FAIL], "obsidian-handbook": null } });
	assert.equal(result.status, 1, result.stdout);
	assert.ok(result.stdout.includes(`failed (exit 3): lantern: ${FAIL.join(" ")}`), result.stdout);
	assert.match(result.stdout, /pins do not converge/);
	assert.match(result.stdout, /note: obsidian-handbook: no convergence command is configured in the topology/);
	assert.equal(readRecord(world).convergence.status, "failed");
});

scenario("close refuses a consumer that was not released, naming it, and closes nothing", (world) => {
	const { topology, result } = pbtaOnFinal(world);
	ok(result, "publish --run");
	let refused = close(world, topology, true);
	assert.equal(refused.status, 1, refused.stdout);
	assert.match(refused.stderr, /lantern: the release v1\.0\.0 of RebelliousSmile\/lantern does not exist on GitHub; run supervise release --run first/);
	releaseConsumer(world, "lantern", "1.1.0");
	world.updateState((state) => {
		state.releases[REPOSITORY.lantern] = state.releases[REPOSITORY.lantern].filter((release: any) => release.tagName !== "v1.1.0");
	});
	refused = close(world, topology, true);
	assert.equal(refused.status, 1, refused.stdout);
	assert.match(refused.stderr, /lantern: the release v1\.1\.0 of RebelliousSmile\/lantern does not exist on GitHub/);
	assert.match(refused.stderr, /obsidian-handbook: the release v1\.0\.0 of RebelliousSmile\/obsidian-handbook does not exist on GitHub/);
	assert.deepEqual(issueCalls(world), []);
	assert.equal(coordinationIssue(world).state, "OPEN");
	assert.equal(readRecord(world).status, "open");
});

scenario("close --run records the consumer releases, comments every item and closes the coordination issue last", (world) => {
	const { topology, final, result } = pbtaOnFinal(world);
	ok(result, "publish --run");
	const lantern = releaseConsumer(world, "lantern", "1.1.0");
	const handbook = releaseConsumer(world, "obsidian-handbook", "1.0.1");
	const dry = ok(close(world, topology, false), "close");
	assert.match(dry, /Nothing was closed/);
	assert.deepEqual(issueCalls(world), []);

	ok(close(world, topology, true), "close --run");
	const record = readRecord(world);
	assert.equal(record.status, "closed");
	assert.ok(record.closedAt);
	assert.deepEqual(record.consumerReleases, [
		{ repo: "lantern", version: "1.1.0", tag: "v1.1.0", sha: lantern, url: `https://github.com/${REPOSITORY.lantern}/releases/tag/v1.1.0` },
		{ repo: "obsidian-handbook", version: "1.0.1", tag: "v1.0.1", sha: handbook, url: `https://github.com/${REPOSITORY["obsidian-handbook"]}/releases/tag/v1.0.1` },
	]);
	const coordination = `${REPOSITORY[record.coordinationIssue.repo]}#${record.coordinationIssue.number}`;
	const calls = issueCalls(world);
	assert.equal(calls[calls.length - 1], `close ${coordination}`, calls.join("\n"));
	assert.deepEqual(calls.slice(0, -1).sort(), [`comment ${REPOSITORY["schema-pbta"]}#50`, `comment ${REPOSITORY["obsidian-handbook"]}#12`, `comment ${REPOSITORY.lantern}#40`].sort());
	const comment = coordinationIssue(world).comments.at(-1);
	for (const expected of [final.url, final.sha256, `https://github.com/${REPOSITORY.lantern}/releases/tag/v1.1.0`, "Convergence passed"]) assert.ok(comment.includes(expected), comment);
	const again = close(world, topology, true);
	assert.notEqual(again.status, 0, "a closed train was closed again");
	assert.match(again.stderr, /no open train/);
});

// The releases of the consumers: Lantern's workflow starts on the push of its tag, Handbook's is dispatched on it.

function release(world: World, topology: string, run: boolean) {
	return world.supervise(run ? ["release", "--run"] : ["release"], { topology });
}

function published(tag: string) {
	return { tagName: tag, isPrerelease: false, isDraft: false, publishedAt: "2026-09-29T12:00:00Z", assets: [] };
}

/** What GitHub will do on the release of each consumer at v1.0.0: publish it, unless `outcome` says otherwise. */
function consumerEffects(world: World, outcome: { lantern?: Record<string, unknown>; handbook?: Array<Record<string, unknown>> } = {}): void {
	world.updateState((state) => {
		state.tagEffects = { ...(state.tagEffects ?? {}), [`${basename(world.dir("lantern"))} v1.0.0`]: [{ repository: REPOSITORY.lantern, workflow: "release.yml", createRelease: published("v1.0.0"), ...outcome.lantern }] };
		state.workflowEffects[`${REPOSITORY["obsidian-handbook"]} release.yml`] = (outcome.handbook ?? [{}]).map((effect) => ({ createRelease: published("v1.0.0"), ...effect }));
	});
}

function remoteTag(world: World, id: string, tag: string): string {
	return git(world.dir(id), "ls-remote", "origin", `refs/tags/${tag}`).split(/\s+/)[0];
}

/** The tag pushes the supervisor made, as git received them. */
function tagPushes(world: World): string[] {
	return readFileSync(world.gitLog, "utf8").split("\n").filter((line) => line.startsWith("push") && line.includes("origin/main:refs/tags/v1.0.0"));
}

function handbookDispatches(world: World): string[][] {
	return dispatches(world, "release.yml").filter((args) => args.includes(REPOSITORY["obsidian-handbook"]));
}

scenario("release shows the next step and runs nothing; release --run publishes Lantern then Handbook, records both, and releases nothing twice", (world) => {
	const { topology, result } = pbtaOnFinal(world);
	ok(result, "publish --run");
	consumerEffects(world);
	const dry = ok(release(world, topology, false), "release");
	assert.ok(dry.includes("Next step for lantern: tag origin/main as v1.0.0"), dry);
	assert.ok(dry.includes("$ git push origin origin/main:refs/tags/v1.0.0"), dry);
	assert.match(dry, /Nothing was run\. Run it with: pnpm supervise release --run/);
	assert.deepEqual(tagPushes(world), []);
	assert.equal(remoteTag(world, "lantern", "v1.0.0"), "");
	assert.equal(readRecord(world).consumerReleases, undefined);

	const output = ok(release(world, topology, true), "release --run");
	assert.ok(output.indexOf("lantern: v1.0.0 already released") < output.indexOf("Next step for obsidian-handbook: tag origin/main as v1.0.0"), output);
	assert.ok(output.indexOf("lantern: v1.0.0 already released") > 0, output);
	assert.match(output, /Every consumer of train couleur-otherscape is released\. Next: pnpm supervise close --run/);
	const repository = REPOSITORY["obsidian-handbook"];
	assert.deepEqual(handbookDispatches(world), [["workflow", "run", "release.yml", "-R", repository, "--ref", "v1.0.0"]]);
	assert.equal(tagPushes(world).length, 2);
	assert.deepEqual(readRecord(world).consumerReleases, [
		{ repo: "lantern", version: "1.0.0", tag: "v1.0.0", sha: originMain(world, "lantern"), url: `https://github.com/${REPOSITORY.lantern}/releases/tag/v1.0.0` },
		{ repo: "obsidian-handbook", version: "1.0.0", tag: "v1.0.0", sha: originMain(world, "obsidian-handbook"), url: `https://github.com/${repository}/releases/tag/v1.0.0` },
	]);
	assert.equal(remoteTag(world, "lantern", "v1.0.0"), originMain(world, "lantern"));

	const again = ok(release(world, topology, true), "release --run again");
	assert.match(again, /lantern: v1\.0\.0 already released/);
	assert.match(again, /obsidian-handbook: v1\.0\.0 already released/);
	assert.equal(tagPushes(world).length, 2, "a tag was pushed again");
	assert.equal(handbookDispatches(world).length, 1, "a release was dispatched again");
	ok(close(world, topology, true), "close --run");
	assert.equal(readRecord(world).status, "closed");
});

scenario("a consumer whose version is already released makes the train not presentable, by repository and version", (world) => {
	const topology = presentedTrain(world, ["schema-pbta"], {
		present: false,
		before: () => world.updateState((state) => {
			state.releases[REPOSITORY.lantern] = [published("v1.0.0")];
		}),
	});
	const result = world.supervise(["present"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stdout, /\*\*Not presentable\*\*/);
	assert.match(result.stdout, /lantern: package\.json is at 1\.0\.0 and the release v1\.0\.0 of RebelliousSmile\/lantern already exists; prepare a new version with the change/);
	assert.doesNotMatch(result.stdout, /obsidian-handbook: package\.json is at/);
});

scenario("release refuses a train that did not converge and sends back to converge", (world) => {
	const { topology, result } = pbtaOnFinal(world, { convergence: { lantern: [FAIL] } });
	assert.equal(result.status, 1, result.stdout);
	consumerEffects(world);
	const refused = release(world, topology, true);
	assert.equal(refused.status, 1, refused.stdout);
	assert.match(refused.stderr, /release: the convergence of train "couleur-otherscape" failed; run supervise converge first; nothing was released/);
	assert.deepEqual(tagPushes(world), []);
});

scenario("a red release stops release --run with the URL of its run, before the next consumer, and its tag is never pushed twice", (world) => {
	const { topology, result } = pbtaOnFinal(world);
	ok(result, "publish --run");
	consumerEffects(world, { lantern: { conclusion: "failure" } });
	const red = release(world, topology, true);
	assert.equal(red.status, 1, red.stdout);
	assert.match(red.stderr, /release: lantern: run https:\/\/github\.com\/RebelliousSmile\/lantern\/actions\/runs\/\d+ concluded failure/);
	assert.equal(remoteTag(world, "obsidian-handbook", "v1.0.0"), "", "Handbook was tagged after a red Lantern release");
	assert.deepEqual(handbookDispatches(world), []);
	assert.equal(readRecord(world).consumerReleases, undefined);
	const again = release(world, topology, true);
	assert.equal(again.status, 1, again.stdout);
	assert.match(again.stderr, /release: lantern: run https:\/\/github\.com\/RebelliousSmile\/lantern\/actions\/runs\/\d+ concluded failure; release\.yml starts on the push of v1\.0\.0 and a tag is not pushed twice/);
	assert.equal(tagPushes(world).length, 1, "the tag of Lantern was pushed again");
});

scenario("a tag left without release nor run: Lantern is named and not tagged again, Handbook is dispatched on its tag", (world) => {
	const { topology, result } = pbtaOnFinal(world);
	ok(result, "publish --run");
	for (const id of ["lantern", "obsidian-handbook"]) {
		git(world.dir(id), "tag", "v1.0.0", originMain(world, id));
		git(world.dir(id), "push", "--quiet", "origin", "v1.0.0");
	}
	consumerEffects(world);
	const named = release(world, topology, true);
	assert.equal(named.status, 1, named.stdout);
	assert.match(named.stderr, /release: lantern: the tag v1\.0\.0 is on origin with no release and no release\.yml run; release\.yml starts on the push of the tag and a tag is not pushed twice: delete the tag by hand/);
	assert.deepEqual(handbookDispatches(world), []);

	world.updateState((state) => {
		state.releases[REPOSITORY.lantern] = [published("v1.0.0")];
	});
	const output = ok(release(world, topology, true), "release --run");
	assert.match(output, /lantern: v1\.0\.0 already released/);
	assert.ok(output.includes(`$ gh workflow run release.yml -R ${REPOSITORY["obsidian-handbook"]} --ref v1.0.0`), output);
	assert.equal(handbookDispatches(world).length, 1);
	assert.deepEqual(tagPushes(world), [], "the supervisor pushed a tag that was already on origin");
	assert.deepEqual(readRecord(world).consumerReleases.map((entry: any) => entry.repo), ["lantern", "obsidian-handbook"]);
});

scenario("after a partial release the train is presented again: the release it recorded is not a refusal, and the red one is dispatched again", (world) => {
	const { topology, result } = pbtaOnFinal(world);
	ok(result, "publish --run");
	consumerEffects(world, { handbook: [{ conclusion: "failure" }, {}] });
	const red = release(world, topology, true);
	assert.equal(red.status, 1, red.stdout);
	assert.match(red.stderr, /release: obsidian-handbook: run https:\/\/github\.com\/RebelliousSmile\/obsidian-handbook\/actions\/runs\/\d+ concluded failure/);
	assert.deepEqual(readRecord(world).consumerReleases.map((entry: any) => entry.repo), ["lantern"]);

	const presented = ok(world.supervise(["present"], { topology }), "present after a partial release");
	assert.match(presented, /\*\*Presentable\.\*\*/);
	ok(release(world, topology, true), "release --run after the red run");
	assert.equal(handbookDispatches(world).length, 2);
	assert.equal(tagPushes(world).length, 2, "a tag was pushed again");
	assert.deepEqual(readRecord(world).consumerReleases.map((entry: any) => entry.repo), ["lantern", "obsidian-handbook"]);
});

scenario("publish --run completes the schema-in-the-mist manifest, lands its convergence file and validates it", (world) => {
	const topology = presentedTrain(world, ["schema-in-the-mist"]);
	const { result } = driveMist(world, bytesOf("schema-in-the-mist"), topology);
	ok(result, "publish --run");
	const mist = world.dir("schema-in-the-mist");
	const path = `release-trains/v${NEXT}.json`;
	const manifest = JSON.parse(originFile(world, "schema-in-the-mist", path));
	assert.equal(manifest.status, "completed");
	assert.equal(manifest.final.releaseUrl, world.archive("schema-in-the-mist", `v${NEXT}`).url);
	assert.deepEqual(manifest.final.consumers.map((consumer: any) => [consumer.role, consumer.ref]), [["handbook", originMain(world, "obsidian-handbook")], ["lantern", originMain(world, "lantern")]]);
	const evidencePath = `release-trains/v${NEXT}.convergence.json`;
	assert.equal(originFile(world, "schema-in-the-mist", evidencePath), "{\"converged\": true}");
	assert.equal(git(mist, "status", "--porcelain"), "", "the checkout of schema-in-the-mist is left dirty");
	const evidence = resolve(world.dir("obsidian-handbook"), "supervisor/trains", `${TRAIN_ID}.evidence`, `schema-in-the-mist-v${NEXT}.provenance.json`);
	assert.deepEqual(world.readState().localCalls.filter((call: any) => call.cwd === mist).slice(2).map((call: any) => call.args), [
		["run", "release-train:converge", "--", path, "--candidate-evidence", evidence],
		["run", "release-train:validate", "--", "--require-complete", `v${NEXT}`],
	]);
	assert.equal(readRecord(world).convergence.status, "passed");
	assert.match(ok(publish(world, false), "the provider's train files keep the presentation"), /Every provider of train couleur-otherscape is published/);
});

scenario("the convergence step of each provider is pure: it lands what is missing and leaves a person only what it cannot know", () => {
	const repo = (id: string) => TOPOLOGY.repos.find((entry: any) => entry.id === id);
	const record = { protocol: 2, artifact: { provider: "schema-adrenaline", releaseUrl: "https://github.com/o/r/releases/download/v1.1.0/p.tgz", sha256: "a".repeat(64), integrity: "sha512-x", version: NEXT }, consumers: [{ role: "handbook", repository: "o/h", ref: "c".repeat(40) }] };
	const expectedFinal = { releaseUrl: record.artifact.releaseUrl, sha256: record.artifact.sha256, integrity: "sha512-x", consumers: record.consumers };
	const mist = { repo: repo("schema-in-the-mist"), finalTag: `v${NEXT}`, trainPath: "release-trains/v1.1.0.json", convergencePath: "release-trains/v1.1.0.convergence.json", finalProblem: null, expectedFinal, manifest: null, convergenceCommitted: true, convergenceWritten: null, provenance: "/p.json", provenanceKept: true };
	const pending = { status: "pending", candidate: { packageName: "schema-in-the-mist" }, consumers: [] };
	const observations: Array<[string, any]> = [
		["adrenaline", { repo: repo("schema-adrenaline"), finalTag: `v${NEXT}`, recordPath: "release-train/schema-adrenaline-v1.1.0-final.json", recordProblem: "is not on origin/main", expectedRecord: record }],
		["adrenaline", { repo: repo("schema-adrenaline"), finalTag: `v${NEXT}`, recordPath: "release-train/schema-adrenaline-v1.1.0-final.json", recordProblem: null, expectedRecord: record }],
		["mist", { ...mist, finalProblem: "is not on origin/main" }],
		["mist", { ...mist, finalProblem: "has status pending, not completed", manifest: pending }],
		["mist", { ...mist, convergenceCommitted: false, convergenceWritten: "{\"converged\": true}\n" }],
		["mist", { ...mist, convergenceCommitted: false, provenanceKept: false }],
		["mist", { ...mist, convergenceCommitted: false }],
		["mist", mist],
		["pbta", { repo: repo("schema-pbta"), finalTag: `v${NEXT}` }],
	];
	const probe = [
		"const observations = JSON.parse(process.argv[1]);",
		"const results = [];",
		"for (const [name, observation] of observations) {",
		"\tconst adapter = await import(`./tools/supervisor/adapters/${name}.mjs`);",
		"\tresults.push(adapter.convergence(observation));",
		"}",
		"console.log(JSON.stringify(results));",
	].join("\n");
	const steps = JSON.parse(ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, JSON.stringify(observations)]), "convergence probe")) as any[];
	assert.deepEqual(steps.map((step) => step.kind), ["automated", "checks", "human", "automated", "automated", "human", "automated", "checks", "checks"]);
	assert.equal(steps[0].type, "land");
	assert.deepEqual(JSON.parse(steps[0].files[observations[0][1].recordPath]), record, "the adrenaline record is not landed exactly");
	assert.deepEqual(steps[1].commands, [["npm", "run", "release-train:verify-final"]]);
	assert.match(steps[2].instruction, /must be on origin\/main before its final block/);
	const completed = JSON.parse(steps[3].files[mist.trainPath]);
	assert.equal(completed.status, "completed");
	assert.deepEqual(completed.final, expectedFinal);
	assert.deepEqual(completed.candidate, pending.candidate, "completing the manifest changed its candidate");
	assert.deepEqual(steps[4].files, { [mist.convergencePath]: "{\"converged\": true}\n" });
	assert.match(steps[5].instruction, /provenance of the promotion is missing/);
	assert.deepEqual(steps[6].command, ["npm", "run", "release-train:converge", "--", "release-trains/v1.1.0.json", "--candidate-evidence", "/p.json"]);
	assert.deepEqual(steps[7].commands, [["npm", "run", "release-train:validate", "--", "--require-complete", "v1.1.0"]]);
	assert.deepEqual(steps[8].commands, []);
	assert.match(steps[8].notes[0], /^schema-pbta: no convergence tool of its own/);
});

scenario("preview plans from what the train's providers publish, and installs their packs without touching data.json", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	const mist = world.dir("schema-in-the-mist");
	world.write("schema-in-the-mist", {
		"package.json": `${JSON.stringify({ name: "schema-in-the-mist", version: "1.0.0", scripts: { build: "tsc" }, exports: { ".": "./dist/index.js", "./presentation": { import: "./dist/presentation.js" }, "./handbook/*": "./handbook/*" } }, null, "\t")}\n`,
		"handbook.json": JSON.stringify({ repository: REPOSITORY["schema-in-the-mist"], packs: [{ id: "mist", version: "1.1.0", path: "handbook/mist/pack.json" }] }),
		"handbook/mist/pack.json": JSON.stringify({ version: "1.1.0", pack: { id: "mist" } }),
		"handbook/mist/assets/grain.webp": "grain",
	});
	world.write("obsidian-handbook", { "manifest.json": "{\"id\": \"obsidian-handbook\", \"version\": \"1.0.0\"}\n" });
	world.write("lantern", { "vite.config.ts": "export default {};\n" });
	const vault = resolve(world.tmp, "vault");
	const pluginDir = resolve(vault, ".obsidian/plugins/obsidian-handbook");
	mkdirSync(pluginDir, { recursive: true });
	const sourceId = REPOSITORY["schema-in-the-mist"].toLowerCase().replace("/", "--");
	const settings = `${JSON.stringify({ schemaSources: [{ id: sourceId, reference: { kind: "tag", value: "v1.0.0" } }] })}\n`;
	writeFileSync(resolve(pluginDir, "data.json"), settings);
	writeFileSync(resolve(pluginDir, "manifest.json"), "{}\n");

	const probe = [
		"const [root, topologyFile, trainFile, vault] = process.argv.slice(1);",
		"const { readFileSync } = await import('node:fs');",
		"const { planPreview, installSources } = await import('./tools/supervisor/preview.mjs');",
		"const read = (file) => JSON.parse(readFileSync(file, 'utf8'));",
		"const plan = planPreview(root, read(topologyFile), read(trainFile), { vaults: [vault] });",
		"const lines = installSources(plan, new Date(0));",
		"const resolveAlias = (aliases, spec) => { const alias = aliases.find(({ find }) => new RegExp(find).test(spec)); return alias ? spec.replace(new RegExp(alias.find), alias.replacement) : null; };",
		"const specs = ['schema-in-the-mist', 'schema-in-the-mist/presentation', 'schema-in-the-mist/handbook/mist/assets/grain.webp?url&no-inline', 'schema-in-the-mist-other'];",
		"console.log(JSON.stringify({ plan, lines, resolved: specs.map((spec) => resolveAlias(plan.handbook.aliases, spec)) }));",
	].join("\n");
	const { plan, lines, resolved } = JSON.parse(ok(sh(HANDBOOK, process.execPath, ["--input-type=module", "-e", probe, world.root, topology, trainPath(world), vault]), "preview probe"));
	const slash = (path: string) => path.split("\\").join("/");
	assert.deepEqual(plan.packages.map((entry: any) => entry.repo), ["schema-in-the-mist"], "only the train's providers are packages");
	assert.deepEqual(plan.builds.map((entry: any) => entry.repo), ["schema-in-the-mist"]);
	assert.deepEqual(plan.consumers.map((entry: any) => [entry.repo, entry.packages]), [["lantern", ["schema-in-the-mist"]]]);
	assert.equal(slash(resolved[0]), `${slash(mist)}/dist/index.js`);
	assert.equal(slash(resolved[1]), `${slash(mist)}/dist/presentation.js`);
	assert.equal(slash(resolved[2]), `${slash(mist)}/handbook/mist/assets/grain.webp?url&no-inline`, "the query is lost");
	assert.equal(resolved[3], null, "a longer package name was captured");

	const sourceDir = resolve(vault, ".obsidian/handbook/sources", sourceId);
	const source = JSON.parse(readFileSync(resolve(sourceDir, "source.json"), "utf8"));
	assert.deepEqual(source.reference, { kind: "tag", value: "v1.0.0" }, "the registered reference was replaced");
	assert.equal(source.revision, git(mist, "rev-parse", "HEAD"));
	assert.equal(readFileSync(resolve(sourceDir, "packs/mist/assets/grain.webp"), "utf8"), "grain");
	assert.ok(existsSync(resolve(sourceDir, "packs/mist/pack.json")) && existsSync(resolve(sourceDir, "handbook.json")));
	assert.equal(readFileSync(resolve(pluginDir, "data.json"), "utf8"), settings, "data.json was written");
	assert.match(lines[0], /source .* \(mist 1\.1\.0\)$/);

	const refused = world.supervise(["preview", "--no-serve"], { topology });
	assert.equal(refused.status, 2, refused.stderr);
	assert.match(refused.stderr, /nothing to show without --vault/);
});

// The commit of a provider and its consumers.

function commitMessage(world: World, id: string, message: string): void {
	writeFileSync(join(world.dir(id), ".git", "SUPERVISOR_COMMIT_MSG"), `${message}\n`);
}

function originMain(world: World, id: string): string {
	return git(world.dir(id), "rev-parse", "origin/main");
}

/** `commit <provider>`, its plan (stderr) and its result (stdout) in one text. */
function commit(world: World, provider: string, topology: string) {
	const result = world.supervise(["commit", provider], { topology });
	return { ...result, stdout: `${result.stdout}${result.stderr}` };
}

scenario("commit lands a provider and its consumers in one command, never the train records", (world) => {
	const topology = testTopology(world);
	const repos = ["schema-adrenaline", "obsidian-handbook", "lantern"];
	world.write("schema-adrenaline", { "src/malus.ts": "export {};\n" });
	world.write("lantern", { "src/sheet.tsx": "export {};\n" });
	world.write("obsidian-handbook", { "src/pj.ts": "export {};\n", "supervisor/trains/draft.json": "{}\n" });
	commitMessage(world, "schema-adrenaline", "feat(malus)!: follow the paper sheet");
	commitMessage(world, "lantern", "feat(adrenaline-pj): print the Malus column");
	const before = Object.fromEntries(repos.map((id) => [id, originMain(world, id)]));
	const untouched = originMain(world, "schema-pbta");

	let result = commit(world, "schema-adrenaline", topology);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stdout, /obsidian-handbook: uncommitted changes but no message/);
	assert.ok(result.stdout.includes("nothing was committed"), result.stdout);
	for (const id of repos) assert.equal(git(world.dir(id), "rev-parse", "HEAD"), before[id], `${id} moved on a refused commit`);

	commitMessage(world, "obsidian-handbook", "feat(adrenaline-pj): print the Malus column");
	result = commit(world, "lantern", topology);
	assert.equal(result.status, 2, result.stdout);
	for (const id of repos) assert.equal(git(world.dir(id), "rev-parse", "HEAD"), before[id], `${id} moved on a consumer named as provider`);

	const done = ok(commit(world, "schema-adrenaline", topology), "commit");
	for (const id of repos) {
		assert.notEqual(originMain(world, id), before[id], `${id} was not pushed`);
		assert.equal(git(world.dir(id), "rev-parse", "HEAD"), originMain(world, id), `${id} HEAD is not origin/main`);
		assert.ok(!existsSync(join(world.dir(id), ".git", "SUPERVISOR_COMMIT_MSG")), `${id} kept its message`);
	}
	assert.equal(git(world.dir("schema-adrenaline"), "log", "-1", "--format=%s"), "feat(malus)!: follow the paper sheet");
	assert.match(done, /lantern: [0-9a-f]+ feat\(adrenaline-pj\): print the Malus column/);
	assert.equal(git(world.dir("obsidian-handbook"), "status", "--porcelain"), "?? supervisor/trains/draft.json");
	assert.equal(originMain(world, "schema-pbta"), untouched, "an unconcerned provider moved");

	result = commit(world, "schema-adrenaline", topology);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stdout, /nothing to commit or push/);
});

scenario("commit --only lands one repository alone, whatever its role", (world) => {
	const topology = testTopology(world);
	const repos = ["schema-adrenaline", "obsidian-handbook", "lantern"];
	world.write("schema-adrenaline", { "src/malus.ts": "export {};\n" });
	world.write("lantern", { "src/sheet.tsx": "export {};\n" });
	world.write("obsidian-handbook", { "src/pj.ts": "export {};\n" });
	const before = Object.fromEntries(repos.map((id) => [id, originMain(world, id)]));
	const only = (args: string[]) => {
		const result = world.supervise(["commit", ...args], { topology });
		return { ...result, stdout: `${result.stdout}${result.stderr}` };
	};

	let result = only(["schema-adrenaline", "--message", "feat(malus): follow the paper sheet"]);
	assert.equal(result.status, 2, result.stdout);
	assert.match(result.stdout, /--message names one commit/);

	result = only(["lantern", "--only"]);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stdout, /lantern: uncommitted changes but no message/);
	for (const id of repos) assert.equal(git(world.dir(id), "rev-parse", "HEAD"), before[id], `${id} moved on a refused commit`);

	// A consumer alone, its message on the command line: the provider's dirty checkout is not its concern.
	ok(only(["lantern", "--only", "--message", "feat(adrenaline-pj): print the Malus column"]), "commit --only");
	assert.notEqual(originMain(world, "lantern"), before.lantern, "lantern was not pushed");
	assert.equal(git(world.dir("lantern"), "log", "-1", "--format=%s"), "feat(adrenaline-pj): print the Malus column");
	for (const id of ["schema-adrenaline", "obsidian-handbook"]) {
		assert.equal(originMain(world, id), before[id], `${id} moved on another repository's commit`);
		assert.notEqual(git(world.dir(id), "status", "--porcelain"), "", `${id} lost its uncommitted work`);
	}

	// A provider alone, its message prepared: its consumers stay where they are.
	commitMessage(world, "schema-adrenaline", "feat(malus)!: follow the paper sheet");
	result = only(["schema-adrenaline", "--only", "--message", "another message"]);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stdout, /a message already waits/);
	ok(only(["schema-adrenaline", "--only"]), "commit --only");
	assert.equal(git(world.dir("schema-adrenaline"), "log", "-1", "--format=%s"), "feat(malus)!: follow the paper sheet");
	assert.ok(!existsSync(join(world.dir("schema-adrenaline"), ".git", "SUPERVISOR_COMMIT_MSG")), "the message was kept");
	assert.equal(originMain(world, "obsidian-handbook"), before["obsidian-handbook"], "a consumer moved on the provider's commit");
});

scenario("the supervisor neither runs nor lands a change to its own code", (world) => {
	const topology = testTopology(world);
	const before = originMain(world, "obsidian-handbook");
	const refused = (args: string[], what: string) => {
		const result = world.supervise(args, { topology });
		const text = `${result.stdout}${result.stderr}`;
		assert.equal(result.status, 1, `${what}: ${text}`);
		assert.match(text, /the supervisor's own code differs from origin\/main/, what);
		return text;
	};

	// An edit nobody committed: no write command runs, and `commit` cannot land it.
	world.write("obsidian-handbook", { "tools/supervisor/commit.mjs": "export {};\n" });
	assert.match(refused(["commit", "obsidian-handbook", "--only", "--message", "chore: widen the supervisor"], "commit --only"), /tools\/supervisor\/commit\.mjs \(not committed\)/);
	refused(["open", "self-change", "--title", "Self change"], "open");
	assert.equal(originMain(world, "obsidian-handbook"), before, "the supervisor pushed its own change");
	ok(world.supervise(["status"], { topology }), "status");

	// Committed in the checkout but not published: still not the code a person pushed.
	world.commit("obsidian-handbook", {}, "chore: widen the supervisor");
	assert.match(refused(["commit", "obsidian-handbook", "--only"], "commit --only, unpublished"), /tools\/supervisor\/commit\.mjs \(committed, not on origin\/main\)/);
	assert.equal(originMain(world, "obsidian-handbook"), before, "the supervisor pushed its own commit");

	// Pushed by a person: the supervisor acts again. The train records never count as its code.
	git(world.dir("obsidian-handbook"), "push", "--quiet", "origin", "HEAD:main");
	world.write("obsidian-handbook", { "supervisor/trains/draft.json": "{}\n", "src/pj.ts": "export {};\n" });
	ok(world.supervise(["commit", "obsidian-handbook", "--only", "--message", "feat(adrenaline-pj): print the Malus column"], { topology }), "commit --only");

	// What proves it is part of it: a harness edited in place cannot vouch for itself.
	world.write("obsidian-handbook", { "tools/supervisor.harness.mts": "export {};\n" });
	assert.match(refused(["commit", "obsidian-handbook", "--only", "--message", "test: relax the scenarios"], "commit --only, harness"), /tools\/supervisor\.harness\.mts \(not committed\)/);

	// The script that starts it is part of it.
	world.write("obsidian-handbook", { "package.json": `${JSON.stringify({ scripts: { supervise: "node elsewhere.mjs" } })}\n` });
	assert.match(refused(["commit", "obsidian-handbook", "--only", "--message", "chore: move the entry point"], "commit --only, script"), /package\.json: the "supervise" script/);
});

// The whole cycle in one command.

const SHIP_REPOS = ["schema-adrenaline", "obsidian-handbook", "lantern"];
const SHIP_MESSAGE = "feat(colours): follow the paper sheet";
const SHIP = ["--message", SHIP_MESSAGE, "--run"];

/** A train of schema-adrenaline and both consumers, every item closed, with one more change nobody committed in each. */
function shippable(world: World, validations: Record<string, string[][]> = {}): string {
	presentedTrain(world, ["schema-adrenaline"], { present: false });
	for (const id of SHIP_REPOS) world.write(id, { "src/late.ts": "export const late = true;\n" });
	return testTopology(world, validations, {}, "ship-topology.json");
}

/** What GitHub will do from the candidate of schema-adrenaline to the releases of both consumers. */
function shipEffects(world: World, trainRuns: Array<Record<string, unknown>> = [{}]): void {
	const adrenaline = REPOSITORY["schema-adrenaline"];
	world.updateState((state) => {
		state.workflowEffects[`${adrenaline} publish-candidate.yml`] = [{ createRelease: world.release("schema-adrenaline", `v${NEXT}-rc.1`, "2026-09-29T10:00:00Z", bytesOf("schema-adrenaline")) }];
		state.workflowEffects[`${adrenaline} release-train.yml`] = trainRuns;
		state.tagEffects[`schema-adrenaline v${NEXT}`] = [{ repository: adrenaline, workflow: "release.yml", createRelease: world.release("schema-adrenaline", `v${NEXT}`, "2026-09-29T11:00:00Z", bytesOf("schema-adrenaline")) }];
	});
	consumerEffects(world);
}

function ship(world: World, topology: string, args: string[]) {
	const result = world.supervise(["ship", ...args], { topology });
	return { ...result, text: `${result.stdout}${result.stderr}` };
}

function shipHeads(world: World): Record<string, string> {
	return Object.fromEntries(SHIP_REPOS.map((id) => [id, originMain(world, id)]));
}

/** How many commits of origin/main carry the shipped message. */
function shipped(world: World, id: string): number {
	return git(world.dir(id), "log", "--format=%s", "origin/main").split("\n").filter((subject) => subject === SHIP_MESSAGE).length;
}

scenario("ship --run takes an uncommitted change to a closed train in one command, without reading a line", (world) => {
	const topology = shippable(world);
	shipEffects(world);
	const result = ship(world, topology, SHIP);
	ok(result, "ship --run");
	for (const id of SHIP_REPOS) assert.equal(shipped(world, id), 1, `${id} was not committed and pushed:\n${result.text}`);
	for (const id of ["schema-adrenaline", "lantern"]) assert.equal(git(world.dir(id), "status", "--porcelain"), "", `${id} is left dirty`);
	const record = readRecord(world);
	assert.equal(record.status, "closed");
	assert.equal(record.presentation.presentable, true);
	assert.equal(record.approval, undefined);
	assert.equal(record.publication["schema-adrenaline"].final.tag, `v${NEXT}`);
	assert.equal(record.convergence.status, "passed");
	assert.deepEqual(record.consumerReleases.map((entry: any) => entry.repo), ["lantern", "obsidian-handbook"]);
	assert.equal(coordinationIssue(world).state, "CLOSED");
	const order = ["Commit and push for train couleur-otherscape", "**Presentable.**", "Every provider of train couleur-otherscape is published", "Every consumer of train couleur-otherscape is released"];
	const positions = order.map((mark) => result.text.indexOf(mark));
	assert.ok(positions.every((position) => position >= 0), result.text);
	assert.doesNotMatch(readFileSync(resolve(HANDBOOK, "tools/supervisor/ship.mjs"), "utf8"), /stdin|readline/);
});

scenario("ship without --run shows every step of the cycle and commits, presents and dispatches nothing", (world) => {
	const topology = shippable(world);
	shipEffects(world);
	const before = shipHeads(world);
	const dry = ok(ship(world, topology, ["--message", SHIP_MESSAGE]), "ship");
	for (const id of SHIP_REPOS) assert.ok(dry.includes(`${id}:\n  commit "${SHIP_MESSAGE}"`), dry);
	assert.match(dry, /present: validate every concerned repository on the commits above/);
	assert.ok(dry.includes("then: publish --run\nthen: converge --run\nthen: release --run\nthen: close --run"), dry);
	assert.ok(dry.includes(`Nothing was run. Run it with: pnpm supervise ship --message ${JSON.stringify(SHIP_MESSAGE)} --run`), dry);
	assert.deepEqual(shipHeads(world), before, "ship without --run pushed");
	for (const id of ["schema-adrenaline", "lantern"]) assert.equal(git(world.dir(id), "status", "--porcelain"), "?? src/late.ts", `${id} was committed`);
	assert.equal(readRecord(world).presentation, undefined);
	assert.deepEqual(dispatches(world), []);

	const refused = ship(world, topology, ["--message", " ", "--run"]);
	assert.equal(refused.status, 2, refused.text);
	assert.match(refused.stderr, /ship: --message is empty/);
	const silent = ship(world, topology, ["--run"]);
	assert.equal(silent.status, 1, silent.text);
	assert.match(silent.stderr, /schema-adrenaline: uncommitted changes but no message/);
	assert.deepEqual(shipHeads(world), before, "a refused ship pushed");
});

scenario("a red validation stops ship --run after present: the commits are landed, nothing is published", (world) => {
	const broken = nodeCommand("console.error('contract broken'); process.exit(3)");
	const topology = shippable(world, { lantern: [broken] });
	shipEffects(world);
	const result = ship(world, topology, SHIP);
	assert.equal(result.status, 1, result.text);
	assert.ok(result.stdout.includes(`lantern: ${broken.join(" ")} exited 3`), result.stdout);
	assert.match(result.stderr, /ship: train "couleur-otherscape" is not presentable; nothing was published/);
	for (const id of SHIP_REPOS) assert.equal(shipped(world, id), 1, `${id} was not committed before the presentation`);
	assert.equal(readRecord(world).presentation.presentable, false);
	assert.equal(readRecord(world).publication["schema-adrenaline"], undefined);
	assert.deepEqual(dispatches(world), []);
	assert.deepEqual(tagPushes(world), []);
});

scenario("ship --run again after an interrupted publication resumes at the missing step, without a second commit or presentation", (world) => {
	const topology = shippable(world);
	shipEffects(world, [{ conclusion: "failure" }, {}]);
	const red = ship(world, topology, SHIP);
	assert.equal(red.status, 1, red.text);
	assert.match(red.stderr, /release-train\.yml run \S+ concluded failure/);
	const presentedAt = readRecord(world).presentation.presentedAt;
	assert.equal(readRecord(world).status, "open");

	const again = ship(world, topology, SHIP);
	ok(again, "ship --run again");
	assert.doesNotMatch(again.text, /Commit and push/);
	assert.doesNotMatch(again.text, /Presented at/);
	for (const id of SHIP_REPOS) assert.equal(shipped(world, id), 1, `${id} was committed again`);
	const record = readRecord(world);
	assert.equal(record.presentation.presentedAt, presentedAt, "the train was presented again");
	assert.deepEqual(dispatches(world).map((args) => args[2]), ["publish-candidate.yml", "release-train.yml", "release-train.yml", "release.yml"]);
	assert.equal(record.status, "closed");
});

scenario("ship refuses to run on supervisor code nobody published, before any step", (world) => {
	const topology = shippable(world);
	shipEffects(world);
	world.write("obsidian-handbook", { "tools/supervisor/ship.mjs": "export {};\n" });
	const before = shipHeads(world);
	const result = ship(world, topology, SHIP);
	assert.equal(result.status, 1, result.text);
	assert.match(result.stderr, /the supervisor's own code differs from origin\/main/);
	assert.match(result.stderr, /tools\/supervisor\/ship\.mjs \(not committed\)/);
	assert.deepEqual(shipHeads(world), before, "ship pushed beside unpublished supervisor code");
	assert.equal(readRecord(world).presentation, undefined);
	assert.deepEqual(dispatches(world), []);
});

scenario("ship refuses a repository engaged by another open train, by name, and commits nothing", (world) => {
	const topology = shippable(world);
	shipEffects(world);
	const record = readRecord(world);
	const lantern = record.items.find((item: any) => item.repo === "lantern");
	writeFileSync(trainPath(world, "autre-train"), `${JSON.stringify({ ...record, id: "autre-train", title: "Another change", items: [{ ...lantern, dependsOn: [] }] }, null, "\t")}\n`);
	const before = shipHeads(world);
	const result = ship(world, topology, ["--train", TRAIN_ID, ...SHIP]);
	assert.equal(result.status, 1, result.text);
	assert.match(result.stderr, /ship: lantern is already engaged by the open train "autre-train" \(Another change\); finish or close it first; nothing was committed/);
	assert.deepEqual(shipHeads(world), before, "ship pushed a repository of another train");
	assert.equal(shipped(world, "schema-adrenaline"), 0);
	assert.deepEqual(dispatches(world), []);
});

function main(): void {
	const handbookBefore = sh(HANDBOOK, "git", ["status", "--porcelain"]).stdout;
	const only = process.env.SUPERVISOR_SCENARIO;
	let failed = 0;
	for (const { name, run } of scenarios) {
		if (only && !name.includes(only)) continue;
		const world = createWorld();
		try {
			run(world);
			console.log(`ok   ${name}`);
		} catch (error) {
			failed += 1;
			console.error(`FAIL ${name}\n${(error as Error).stack ?? error}`);
		} finally {
			world.dispose();
		}
	}
	assert.equal(sh(HANDBOOK, "git", ["status", "--porcelain"]).stdout, handbookBefore, "the harness left files in the Handbook checkout");
	if (failed > 0) {
		console.error(`\n${failed} supervisor scenario(s) failed.`);
		process.exit(1);
	}
	console.log("\nSupervisor scenarios passed.");
}

main();
