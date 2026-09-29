/**
 * schema-in-the-mist: `release-candidate.yml`, then its release-train scripts
 * run locally in the provider's checkout.
 *
 * `release-train:assert` proves the committed manifest and writes a
 * provenance file; `release-train:promote` reads it and publishes the final
 * with the candidate's bytes, through the provider's own gh. Both need the
 * checkout clean and at origin/main, which the supervisor never arranges by
 * itself: a checkout elsewhere is a human step. `release-train:stage` is not
 * used: the candidate already comes from `release-candidate.yml`.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	adoptionStep, candidateFields, checkoutStep, done, human, inspect, lastRun, localStep, manifestInstruction,
	nextCandidateTag, observeCandidate, observeCheckout, observeTrainManifest, pending, settleCandidate, succeeded,
	wait, workflowStep,
} from "./common.mjs";

export function observe(ctx, base) {
	const { repo, dir, version, record, evidenceDir } = ctx;
	const { tags, finalTag } = base;
	const candidateRun = lastRun(record, "candidate");
	const runs = { candidate: candidateRun };
	if (base.final) return { ...base, candidate: settleCandidate(record.candidate, null), runs };
	const tag = record.candidate?.tag ?? candidateRun?.inputs?.tag ?? nextCandidateTag(tags, version);
	const seen = observeCandidate(ctx, base, tag);
	const trainPath = `release-trains/${finalTag}.json`;
	const provenance = join(evidenceDir, `${repo.id}-${finalTag}.provenance.json`);
	runs.assert = lastRun(record, "assert");
	runs.promote = lastRun(record, "promote");
	return {
		...base,
		...seen,
		candidateTag: tag,
		trainPath,
		trainProblem: observeTrainManifest(ctx, base, seen, trainPath),
		checkout: observeCheckout(dir),
		provenance,
		proven: succeeded(runs.assert) && existsSync(provenance),
		inputs: { candidate: { tag } },
		runs,
	};
}

export function nextStep(o) {
	const { repo } = o;
	if (o.final) return done();
	if (!o.published) {
		if (pending(o.runs.candidate)) return wait(o.runs.candidate);
		return workflowStep(repo, "candidate", "release-candidate.yml", o.inputs.candidate, `publish the candidate ${o.candidateTag} from main`);
	}
	const adoption = adoptionStep(o);
	if (adoption) return adoption;
	if (o.trainProblem) {
		return human(repo.id, manifestInstruction(o.trainPath, `it ${o.trainProblem}`, { packageName: repo.package, ...candidateFields(o) }, { status: "candidate", consumers: o.consumers }));
	}
	const checkout = checkoutStep(repo.id, o.checkout);
	if (checkout) return checkout;
	if (!o.proven) {
		return localStep(repo, "assert", ["npm", "run", "release-train:assert", "--", o.trainPath, "--output", o.provenance], `prove ${o.trainPath} locally and write its provenance`);
	}
	if (succeeded(o.runs.promote)) return inspect(repo.id, o.runs.promote, `release ${o.finalTag} is not published`);
	return localStep(repo, "promote", ["npm", "run", "release-train:promote", "--", o.trainPath, "--evidence", o.provenance], `publish ${o.finalTag} with the bytes of ${o.candidate.tag}`);
}
