/**
 * schema-adrenaline: `publish-candidate.yml`, then `release-train.yml`, then
 * `release.yml` on the final tag.
 *
 * `release.yml` runs on the push of a `v*.*.*` tag, or by dispatch for a tag
 * that already exists: either way the final tag must be on origin first.
 * Pushing a tag is a person's gesture, so it is a human step; the supervisor
 * then follows the run that push started, and dispatches it again only when
 * none ran or the last one failed.
 */
import { ghJson } from "../gh.mjs";
import {
	adoptionStep, candidateFields, done, human, inspect, lastRun, manifestInstruction, nextCandidateTag,
	observeCandidate, observeTrainManifest, pending, settleCandidate, succeeded, tagExists, wait, workflowStep,
} from "./common.mjs";

/** The newest `release.yml` run for the final tag: the push of the tag, or a recorded dispatch. */
function releaseRun(repo, record, finalTag) {
	const listed = ghJson(["run", "list", "-R", repo.repository, "--workflow", "release.yml", "--limit", "20", "--json", "databaseId,headBranch,status,conclusion,url,createdAt"])
		.filter((run) => run.headBranch === finalTag)
		.map((run) => ({ id: run.databaseId, url: run.url, at: run.createdAt, conclusion: run.status === "completed" ? run.conclusion || null : null }));
	const recorded = lastRun(record, "promote", { tag: finalTag });
	const runs = [...listed, ...(recorded ? [recorded] : [])].sort((left, right) => String(left.at).localeCompare(String(right.at)));
	return runs.length ? runs[runs.length - 1] : null;
}

export function observe(ctx, base) {
	const { repo, dir, version, record } = ctx;
	const { tags, finalTag } = base;
	const candidateRun = lastRun(record, "candidate");
	const runs = { candidate: candidateRun };
	if (base.final) return { ...base, candidate: settleCandidate(record.candidate, null), runs };
	const tag = record.candidate?.tag ?? candidateRun?.inputs?.tag ?? nextCandidateTag(tags, version);
	const seen = observeCandidate(ctx, base, tag);
	const trainPath = `release-train/${repo.package}-${finalTag}.json`;
	const inputs = { candidate: { tag }, train: { manifest: trainPath }, promote: { tag: finalTag } };
	runs.train = lastRun(record, "release-train", inputs.train);
	const tagPushed = seen.adopted ? tagExists(dir, finalTag) : false;
	runs.promote = tagPushed ? releaseRun(repo, record, finalTag) : null;
	return {
		...base,
		...seen,
		candidateTag: tag,
		trainPath,
		trainProblem: observeTrainManifest(ctx, base, seen, trainPath),
		tagPushed,
		inputs,
		runs,
	};
}

export function nextStep(o) {
	const { repo } = o;
	if (o.final) return done();
	if (!o.published) {
		if (pending(o.runs.candidate)) return wait(o.runs.candidate);
		return workflowStep(repo, "candidate", "publish-candidate.yml", o.inputs.candidate, `publish the candidate ${o.candidateTag} from main`);
	}
	const adoption = adoptionStep(o);
	if (adoption) return adoption;
	if (o.trainProblem) {
		return human(repo.id, manifestInstruction(o.trainPath, `it ${o.trainProblem}`, { provider: repo.package, ...candidateFields(o) }, { protocol: 1, consumers: o.consumers }));
	}
	if (pending(o.runs.train)) return wait(o.runs.train);
	if (!succeeded(o.runs.train)) return workflowStep(repo, "release-train", "release-train.yml", o.inputs.train, `prove ${o.trainPath} against the consumers`);
	if (!o.tagPushed) {
		return human(repo.id, `tag origin/main of ${repo.id} (the commit that carries ${o.trainPath}) as ${o.finalTag} and push the tag: git tag ${o.finalTag} origin/main && git push origin ${o.finalTag}. The push starts release.yml, which publishes the final.`);
	}
	if (pending(o.runs.promote)) return wait(o.runs.promote);
	if (succeeded(o.runs.promote)) return inspect(repo.id, o.runs.promote, `release ${o.finalTag} is not published`);
	return workflowStep(repo, "promote", "release.yml", o.inputs.promote, `publish ${o.finalTag} with the bytes of ${o.candidate.tag}`);
}
