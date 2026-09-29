/**
 * The only caller of the GitHub CLI.
 *
 * `SUPERVISOR_GH` replaces the binary: the harness points it at a fake that
 * answers from a state file, so every GitHub read and write of the
 * supervisor can be observed without a network. A value ending in `.mjs` is
 * run with the current node.
 */
import { spawnSync } from "node:child_process";

export function gh(args, { cwd, input, inherit = false } = {}) {
	const binary = process.env.SUPERVISOR_GH || "gh";
	const viaNode = binary.endsWith(".mjs");
	const result = spawnSync(
		viaNode ? process.execPath : binary,
		viaNode ? [binary, ...args] : args,
		{
			cwd,
			input,
			encoding: "utf8",
			stdio: inherit ? ["inherit", "inherit", "inherit"] : undefined,
			maxBuffer: 64 * 1024 * 1024,
		},
	);
	if (result.error) throw result.error;
	return {
		status: result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

export function ghOut(args, options) {
	const result = gh(args, options);
	if (result.status !== 0) {
		throw new Error(`gh ${args.join(" ")}: ${result.stderr.trim() || `exit ${result.status}`}`);
	}
	return result.stdout;
}

export function ghJson(args, options) {
	return JSON.parse(ghOut(args, options));
}

const RC_TAG = /^v(\d+\.\d+\.\d+)-rc\.(\d+)$/;
const FINAL_TAG = /^v(\d+\.\d+\.\d+)$/;

/** Latest release candidate and latest final release, in GitHub's order (newest first). */
export function latestReleases(repository) {
	const releases = ghJson([
		"release", "list", "-R", repository, "--limit", "50",
		"--json", "tagName,isPrerelease,isDraft,publishedAt",
	]);
	const published = releases.filter((release) => !release.isDraft);
	const rc = published.find((release) => RC_TAG.test(release.tagName));
	const final = published.find((release) => FINAL_TAG.test(release.tagName));
	return {
		latestRc: rc ? { tag: rc.tagName, publishedAt: rc.publishedAt } : null,
		latestFinal: final ? { tag: final.tagName, publishedAt: final.publishedAt } : null,
	};
}

export function releaseExists(repository, tag) {
	return gh(["release", "view", tag, "-R", repository, "--json", "tagName"]).status === 0;
}
