/**
 * Which commit a recorded candidate stands for.
 *
 * A candidate is packed from one commit, and its manifests, its receipt and
 * its runs all name that commit. A later presentation can bind the provider to
 * another one: a commit that changes nothing the package publishes must not
 * send the candidate through its workflows again.
 *
 * The candidate packed from `commit` with the fingerprint `packed` stands for
 * the presented commit when the two are the same commit, or when the presented
 * one descends from it and publishes the same files (`packedFiles.mjs`). Then
 * the candidate keeps its own commit; otherwise the presented commit is used,
 * as it always was, and the reason says which of the commits or of the
 * fingerprints parted.
 *
 * A record written before the candidate carried its commit and its
 * fingerprint has neither: only the presented commit is known for it.
 */

const short = (sha) => sha.slice(0, 10);

/**
 * `candidate` is the train's record of it (or nothing), `sha` the presented
 * commit, `packed` the fingerprint the presentation wrote for it (or nothing),
 * `descends(ancestor, descendant)` the ancestry of the provider's repository.
 * Returns the commit the candidate is to be named by, and why it is not its own.
 */
export function candidateIdentity({ candidate, sha, packed, descends }) {
	const own = candidate?.commit;
	if (!own || !candidate.packed || own === sha) return { sha, reason: null };
	const name = `the candidate ${candidate.tag} was packed from ${short(own)}`;
	if (!descends(own, sha)) return { sha, reason: `${name}, which the presented commit ${short(sha)} does not descend from` };
	if (!packed) return { sha, reason: `${name} with the package fingerprint ${candidate.packed}, and the presentation holds no fingerprint for ${short(sha)}` };
	if (packed !== candidate.packed) return { sha, reason: `${name} with the package fingerprint ${candidate.packed}, the presented commit ${short(sha)} has ${packed}` };
	return { sha: own, reason: null };
}

/** The candidate as the train records it the first time: with the commit it was packed from and the fingerprint of that commit, both or neither. */
export function stampCandidate(candidate, sha, packed) {
	return packed ? { ...candidate, commit: sha, packed } : candidate;
}
