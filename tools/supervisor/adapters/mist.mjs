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
import { showFile } from "../git.mjs";
import {
	adoptionStep, candidateFields, checkoutStep, checks, CONSUMER_ROLES, done, finalConsumersProblem, human, inspect, lastRun,
	localStep, manifestInstruction, nextCandidateTag, originJson, observeCandidate, observeCheckout, observeTrainManifest, pending, settleCandidate, succeeded,
	wait, workflowStep,
} from "./common.mjs";

const PROOF = { interface: "npm-run-release-train-assert", manifest: "release-train/schema-in-the-mist.json" };

/** The consumer entries the provider's manifest validator accepts: exactly role, repository, ref, path and proof. */
export function mistConsumers(o) {
	return o.adoption.map((entry, index) => ({
		role: CONSUMER_ROLES[entry.repo] ?? entry.repo,
		repository: o.consumers[index].repository,
		ref: o.consumers[index].ref,
		path: CONSUMER_ROLES[entry.repo] ?? entry.repo,
		proof: { ...PROOF },
	}));
}

/** The candidate block of a manifest: the shared fields without `version`, which the validator refuses. */
function mistCandidate(o) {
	const { version: _version, ...fields } = candidateFields(o);
	return { packageName: o.repo.package, ...fields };
}

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
		return human(repo.id, manifestInstruction(o.trainPath, `it ${o.trainProblem}`, mistCandidate(o), { status: "pending", consumers: mistConsumers(o) }));
	}
	const checkout = checkoutStep(repo.id, o.checkout);
	if (checkout) return checkout;
	if (!o.proven) {
		return localStep(repo, "assert", ["npm", "run", "release-train:assert", "--", o.trainPath, "--output", o.provenance], `prove ${o.trainPath} locally and write its provenance`);
	}
	if (succeeded(o.runs.promote)) return inspect(repo.id, o.runs.promote, `release ${o.finalTag} is not published`);
	return localStep(repo, "promote", ["npm", "run", "release-train:promote", "--", o.trainPath, "--evidence", o.provenance], `publish ${o.finalTag} with the bytes of ${o.candidate.tag}`);
}

/**
 * After the final: the manifest turns `completed` with its `final` block, a
 * person commits it; `release-train:converge` then writes the convergence
 * evidence next to it, a person commits that too; `release-train:validate
 * --require-complete` is the proof.
 */
export function observeConvergence(ctx) {
	const { root, topology, repo, dir, finalTag, final, consumers, evidenceDir } = ctx;
	const trainPath = `release-trains/${finalTag}.json`;
	const convergencePath = `release-trains/${finalTag}.convergence.json`;
	const manifest = originJson(dir, trainPath);
	let finalProblem = null;
	if (!manifest) finalProblem = "is not on origin/main";
	else if (manifest.unreadable) finalProblem = "is not valid JSON";
	else if (manifest.status !== "completed") finalProblem = `has status ${manifest.status ?? "(none)"}, not completed`;
	else {
		const named = manifest.final ?? {};
		const fields = { releaseUrl: final.url, sha256: final.sha256, integrity: final.integrity };
		const wrong = Object.keys(fields).find((field) => named[field] !== fields[field]);
		finalProblem = wrong
			? `names final.${wrong} ${named[wrong] ?? "(none)"}, the train expects ${fields[wrong]}`
			: finalConsumersProblem(root, topology, repo, named.consumers, final);
		if (finalProblem && !wrong) finalProblem = `final.consumers ${finalProblem}`;
	}
	return {
		repo,
		finalTag,
		trainPath,
		convergencePath,
		finalProblem,
		expectedFinal: {
			releaseUrl: final.url,
			sha256: final.sha256,
			integrity: final.integrity,
			consumers: consumers.map((consumer) => ({ role: CONSUMER_ROLES[consumer.repo] ?? consumer.repo, repository: consumer.repository, ref: consumer.sha })),
		},
		convergenceCommitted: showFile(dir, "origin/main", convergencePath) !== null,
		convergenceWritten: existsSync(join(dir, convergencePath)),
		provenance: join(evidenceDir, `${repo.id}-${finalTag}.provenance.json`),
		provenanceKept: existsSync(join(evidenceDir, `${repo.id}-${finalTag}.provenance.json`)),
	};
}

export function convergence(o) {
	const { repo } = o;
	if (o.finalProblem) {
		return human(repo.id, [
			`commit ${o.trainPath} on main of the provider (it ${o.finalProblem}): set "status" to "completed" and add this "final" block, candidate and consumers unchanged:`,
			...JSON.stringify({ final: o.expectedFinal }, null, "\t").split("\n").map((line) => `  ${line}`),
		].join("\n"));
	}
	if (!o.convergenceCommitted) {
		if (o.convergenceWritten) {
			return human(repo.id, `commit ${o.convergencePath}, written by release-train:converge, on main of the provider and push it`);
		}
		if (!o.provenanceKept) {
			return human(repo.id, `the provenance of the promotion is missing (${o.provenance}): release-train:converge needs it as --candidate-evidence; restore it from the run of supervise publish`);
		}
		return localStep(repo, "converge", ["npm", "run", "release-train:converge", "--", o.trainPath, "--candidate-evidence", o.provenance], `write the convergence evidence of ${o.trainPath}`);
	}
	return checks([["npm", "run", "release-train:validate", "--", "--require-complete", o.finalTag]]);
}
