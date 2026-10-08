/**
 * What a green validation was proved on, and when it need not run again.
 *
 * A repository's validations are a function of four things: the files of its
 * commit, the files its linked providers publish (`packedFiles.mjs`), the
 * commands run, and the Node that runs them. When a re-presentation finds
 * the same four as a presentation whose validations were all green, running
 * them again can only say the same thing: the result is taken over, marked as
 * such, with the date of the proof it comes from.
 *
 * The key leaves out the time, the commit and the train: two commits holding
 * the same files, or two trains, prove the same thing. A red result is never
 * taken over, nor one that was not run. A repository linked to a provider
 * whose published files have no fingerprint has no key and always runs.
 */
import { createHash } from "node:crypto";
import { canonical } from "./digest.mjs";
import { gitOut } from "./git.mjs";
import { TRAINS_PATH } from "./train.mjs";

/** The files of a commit as git sees them. The coordinator's train records are written by the supervisor, they do not count. */
function treeOf(dir, repo, sha) {
	if (repo.role !== "coordinator") return gitOut(dir, ["rev-parse", `${sha}^{tree}`]).trim();
	const files = gitOut(dir, ["ls-tree", "-r", sha]).split(/\r?\n/).filter((line) => line.trim() && !line.split("\t")[1]?.startsWith(`${TRAINS_PATH}/`));
	return createHash("sha256").update(files.join("\n")).digest("hex");
}

/**
 * `links` are the providers the repository is validated against, each with the
 * fingerprint of its package (`sha256`). Returns the key, or `null` when one
 * of them has none.
 */
export function evidenceKey({ dir, repo, sha, links, validations, node = process.version }) {
	if (links.some((link) => !link.sha256)) return null;
	const subject = {
		tree: treeOf(dir, repo, sha),
		providers: links.map((link) => ({ repo: link.repo, sha256: link.sha256 })).sort((left, right) => left.repo.localeCompare(right.repo)),
		validations,
		node,
	};
	return createHash("sha256").update(canonical(subject)).digest("hex");
}

/** A validation as the record keeps it passed: nothing red, nothing left unrun. */
export function isGreen(validations) {
	return validations.length > 0 && validations.every((validation) => validation.status === 0 && !validation.notRun);
}

/**
 * The validations of `previous` (an entry of the last presentation) when they
 * were proved on `key`, as taken over; otherwise `null`. `fresh` ignores any
 * proof.
 */
export function reusableValidations(previous, key, { fresh = false } = {}) {
	if (fresh || key === null || !previous?.evidence || previous.evidence.key !== key) return null;
	if (!isGreen(previous.validations ?? [])) return null;
	return previous.validations.map((validation) => ({ ...validation, reused: previous.evidence.provedAt }));
}
