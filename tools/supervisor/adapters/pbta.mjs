/**
 * schema-pbta: the manifest path of `release.yml`, and nothing else.
 *
 * `mode=digest` packs the presented commit and hands back a receipt (an
 * artifact, no release); the candidate manifest is landed; `mode=stage`
 * publishes the candidate from that manifest; the consumers adopt it; the
 * train manifest is landed; `release-train.yml` proves it; `mode=promote`
 * publishes the final with the same bytes. `publish-candidate.yml` is not
 * used: its candidate is named by no manifest, so the train could not tie it
 * to the presentation.
 *
 * The candidate is recorded in the train as soon as the receipt is read,
 * before its manifest is committed: the presentation admits a commit only when
 * every release URL and SRI it introduces is already known to the train.
 */
import {
	adoptStep, candidateFields, checks, done, inspect, json, landStep, lastRun, manifestProblem,
	nextCandidateTag, observeCandidate, observeTrainManifest, originFiles, originJson, pending, releaseUrl,
	runArtifactJson, settleCandidate, succeeded, wait, workflowStep,
} from "./common.mjs";
import { SupervisorError } from "../topology.mjs";

const CANDIDATES = "release-train/candidates";
const PROOF = { interface: "npm-run-release-train-assert", manifest: "release-train.manifest.json" };

function candidateManifests(dir, sha, finalTag) {
	return originFiles(dir, CANDIDATES)
		.filter((path) => path.endsWith(".json"))
		.map((path) => ({ path, manifest: originJson(dir, path) }))
		.filter(({ manifest }) => manifest?.candidate?.providerCommit === sha && manifest.candidate.finalTag === finalTag);
}

function readReceipt(ctx, run) {
	const { repo, sha, version } = ctx;
	const receipt = runArtifactJson(repo, run.id, `${repo.package}-digest-${sha}`, "candidate-digest.json");
	if (!receipt) throw new SupervisorError(`${repo.id}: digest run ${run.url} has no candidate-digest.json in artifact ${repo.package}-digest-${sha}`, 1);
	if (receipt.providerCommit !== sha || receipt.version !== version) {
		throw new SupervisorError(`${repo.id}: digest run ${run.url} describes ${receipt.providerCommit} at ${receipt.version}, the train presented ${sha} at ${version}`, 1);
	}
	return receipt;
}

/** The train manifest of `finalTag`, the one a consumer registry lists. */
export function trainManifest(repo, finalTag) {
	return `release-train/${repo.package}-${finalTag}.json`;
}

export function observe(ctx, base) {
	const { root, topology, repo, dir, sha, version, record } = ctx;
	const { tags, finalTag } = base;
	const inputs = {
		digest: { mode: "digest", provider_commit: sha },
	};
	const runs = { digest: lastRun(record, "digest", inputs.digest) };
	if (base.final) return { ...base, candidate: settleCandidate(record.candidate, null), runs };

	const manifests = candidateManifests(dir, sha, finalTag);
	let seen = null;
	let tag = record.candidate?.tag ?? null;
	if (!record.candidate) {
		const committed = manifests.length ? manifests[manifests.length - 1].manifest.candidate : null;
		if (committed) {
			tag = committed.stagingTag;
			seen = { tag, url: committed.releaseUrl, sha256: committed.sha256, integrity: committed.integrity };
		} else if (succeeded(runs.digest)) {
			const receipt = readReceipt(ctx, runs.digest);
			tag = nextCandidateTag(tags, version);
			seen = { tag, url: releaseUrl(repo, tag, version), sha256: receipt.sha256, integrity: receipt.integrity };
		}
	}
	const seenCandidate = observeCandidate(ctx, base, tag, seen);
	const { candidate } = seenCandidate;
	const entry = candidate ? manifests.find(({ manifest }) => manifest.candidate.stagingTag === candidate.tag) ?? null : null;
	const candidatePath = entry?.path ?? (candidate ? `${CANDIDATES}/${repo.package}-${candidate.tag}.json` : null);
	const trainPath = trainManifest(repo, finalTag);
	inputs.stage = { mode: "stage", provider_commit: sha, config: candidatePath };
	inputs.train = { provider_commit: sha, config: trainPath };
	inputs.promote = { mode: "promote", provider_commit: sha, config: trainPath };
	runs.stage = lastRun(record, "stage", inputs.stage);
	runs.train = lastRun(record, "release-train", inputs.train);
	runs.promote = lastRun(record, "promote", inputs.promote);
	return {
		...base,
		...seenCandidate,
		candidatePath,
		candidateProblem: candidate ? manifestProblem(root, topology, repo, entry?.manifest ?? null, { candidate, finalTag, sha }) : null,
		trainPath,
		trainProblem: observeTrainManifest(ctx, base, seenCandidate, trainPath),
		inputs,
		runs,
	};
}

export function nextStep(o) {
	const { repo } = o;
	if (o.final) return done();
	if (!o.candidate) {
		if (pending(o.runs.digest)) return wait(o.runs.digest);
		return workflowStep(repo, "digest", "release.yml", o.inputs.digest, `pack ${o.sha.slice(0, 10)} and compute its candidate digest (no release)`);
	}
	const fields = { provider: repo.package, ...candidateFields(o) };
	if (o.candidateProblem) {
		return landStep(repo, "candidate-manifest", o.candidatePath, json({ protocol: 1, candidate: fields }), `chore(release-train): add the ${o.candidate.tag} candidate manifest`, `land ${o.candidatePath} (it ${o.candidateProblem})`);
	}
	if (!o.published) {
		if (pending(o.runs.stage)) return wait(o.runs.stage);
		if (succeeded(o.runs.stage)) return inspect(repo.id, o.runs.stage, `release ${o.candidate.tag} is not published`);
		return workflowStep(repo, "stage", "release.yml", o.inputs.stage, `publish the candidate ${o.candidate.tag} named by ${o.candidatePath}`);
	}
	const adoption = adoptStep(o);
	if (adoption) return adoption;
	if (o.trainProblem) {
		const consumers = o.consumers.map((entry) => ({ ...entry, path: entry.role, proof: { ...PROOF } }));
		return landStep(repo, "manifest", o.trainPath, json({ protocol: 1, candidate: fields, consumers }), `chore(release-train): add the ${o.finalTag} manifest`, `land ${o.trainPath} (it ${o.trainProblem})`);
	}
	if (pending(o.runs.train)) return wait(o.runs.train);
	if (!succeeded(o.runs.train)) return workflowStep(repo, "release-train", "release-train.yml", o.inputs.train, `prove ${o.trainPath} against the consumers`);
	if (pending(o.runs.promote)) return wait(o.runs.promote);
	if (succeeded(o.runs.promote)) return inspect(repo.id, o.runs.promote, `release ${o.finalTag} is not published`);
	return workflowStep(repo, "promote", "release.yml", o.inputs.promote, `publish ${o.finalTag} with the bytes of ${o.candidate.tag}`);
}

/** schema-pbta has no convergence tool: both consumers pinning the final, and their own checks, are the whole proof. */
export function observeConvergence(ctx) {
	return { repo: ctx.repo, finalTag: ctx.finalTag };
}

export function convergence(o) {
	return checks([], [`${o.repo.id}: no convergence tool of its own; its convergence rests on the final ${o.finalTag} pinned by both consumers and on their convergence commands`]);
}
