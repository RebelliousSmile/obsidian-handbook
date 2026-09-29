/**
 * Supervisor guard rules, written once.
 *
 * The PATH shims (`gh`, `git`, `gh.cmd`, `git.cmd` through `run.mjs`) and the
 * child_process hook (`hook.cjs`) both ask `guardRefusal`. It refuses what
 * publishes (release writes, workflow dispatch, pull request merge, API
 * writes, push, tag creation) and lets every other call through.
 *
 * CommonJS on purpose: `hook.cjs` is preloaded by `--require` and must load
 * these rules on every Node version the CI runs, without `require(esm)`.
 */
"use strict";

function refusal(tool, args) {
	return `supervisor guard: "${[tool, ...args].join(" ")}" publishes and is refused before approval (supervise present)`;
}

function ghRefused(args) {
	const head = `${args[0] ?? ""} ${args[1] ?? ""}`;
	const prefixes = [
		"release create",
		"release upload",
		"release edit",
		"release delete",
		"workflow run",
		"run rerun",
		"pr merge",
	];
	if (prefixes.some((prefix) => head.startsWith(prefix))) return true;
	// `gh api` writes as soon as it sends a method other than GET or a field.
	if (args[0] !== "api") return false;
	let previous = "";
	for (const argument of args) {
		if ((previous === "-X" || previous === "--method") && argument !== "GET") return true;
		if (["-f", "-F", "--field", "--raw-field", "--input"].includes(argument)) return true;
		if (/^-[fF]./.test(argument) || /^--(field|raw-field|input)=/.test(argument)) return true;
		if (argument !== "--method=GET" && argument !== "-XGET") {
			if (argument.startsWith("--method=") || /^-X./.test(argument)) return true;
		}
		previous = argument;
	}
	return false;
}

const GIT_GLOBAL_WITH_VALUE = ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"];
const TAG_LIST_FILTER =
	/^(-n.*|--contains.*|--no-contains.*|--points-at.*|--merged.*|--no-merged.*|--sort.*|--format.*|--column.*|--no-column|-i|--ignore-case)$/;

function gitRefused(args) {
	let subcommand = "";
	let skip = false;
	for (const argument of args) {
		if (skip) {
			skip = false;
			continue;
		}
		if (GIT_GLOBAL_WITH_VALUE.includes(argument)) skip = true;
		else if (argument.startsWith("-")) continue;
		else {
			subcommand = argument;
			break;
		}
	}
	if (subcommand === "push") return true;
	if (subcommand !== "tag") return false;
	// Listing tags is reading: no argument, or -l/--list among them. Any other
	// form (a name, -d, -a, -f...) creates or deletes one.
	let listing = true;
	let seen = false;
	for (const argument of args) {
		if (seen) {
			if (argument === "-l" || argument === "--list") {
				listing = true;
				break;
			}
			if (!TAG_LIST_FILTER.test(argument)) listing = false;
		}
		if (argument === "tag") seen = true;
	}
	return !listing;
}

/**
 * @param {string} tool `gh` or `git`; any other tool is never refused.
 * @param {string[]} args the arguments after the tool name.
 * @returns {string | null} the refusal message, or null when the call may run.
 */
function guardRefusal(tool, args) {
	const list = args.map(String);
	if (tool === "gh" && ghRefused(list)) return refusal(tool, list);
	if (tool === "git" && gitRefused(list)) return refusal(tool, list);
	return null;
}

module.exports = { guardRefusal };
