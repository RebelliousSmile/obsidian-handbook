/**
 * schema-adrenaline: `publish-candidate.yml`, then `release-train.yml`, then
 * `release.yml` on the final tag.
 *
 * The consumers adopt the candidate, the manifest and the final record are
 * landed on main, all by the supervisor. `release.yml` runs on the push of a
 * `v*.*.*` tag, or by dispatch for a tag that already exists: the supervisor
 * pushes the final tag once the train is proven, follows the run that push
 * started, and dispatches it again only when the last one failed.
 */
import { ghJson } from "../gh.mjs";
import {
	adoptStep, candidateFields, checks, CONSUMER_ROLES, done, finalConsumersProblem, inspect, json, landStep, lastRun, nextCandidateTag, originJson,
	observeCandidate, observeTrainManifest, pending, settleCandidate, succeeded, tagExists, tagStep, wait, workflowStep,
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
	const adoption = adoptStep(o);
	if (adoption) return adoption;
	if (o.trainProblem) {
		const manifest = { protocol: 1, candidate: { provider: repo.package, ...candidateFields(o) }, consumers: o.consumers };
		return landStep(repo, "manifest", o.trainPath, json(manifest), `chore(release-train): add the ${o.finalTag} manifest`, `land ${o.trainPath} (it ${o.trainProblem})`);
	}
	if (pending(o.runs.train)) return wait(o.runs.train);
	if (!succeeded(o.runs.train)) return workflowStep(repo, "release-train", "release-train.yml", o.inputs.train, `prove ${o.trainPath} against the consumers`);
	if (!o.tagPushed) return tagStep(repo, o.finalTag, "release.yml", `tag origin/main (it carries ${o.trainPath}) as ${o.finalTag}; the push starts release.yml, which publishes the final`);
	if (pending(o.runs.promote)) return wait(o.runs.promote);
	if (succeeded(o.runs.promote)) return inspect(repo.id, o.runs.promote, `release ${o.finalTag} is not published`);
	return workflowStep(repo, "promote", "release.yml", o.inputs.promote, `publish ${o.finalTag} with the bytes of ${o.candidate.tag}`);
}

/**
 * After the final: the supervisor lands the final record the provider's
 * `release-train:verify-final` reads, which then checks each named consumer
 * against GitHub. `final-convergence.yml` runs the same check on dispatch; the
 * local command gives the same answer without a workflow run.
 */
export function observeConvergence(ctx) {
	const { root, topology, repo, dir, finalTag, final, version, consumers } = ctx;
	const recordPath = `release-train/${repo.package}-${finalTag}-final.json`;
	const record = originJson(dir, recordPath);
	const artifact = { provider: repo.package, releaseUrl: final.url, sha256: final.sha256, integrity: final.integrity, version };
	let recordProblem = null;
	if (!record) recordProblem = "is not on origin/main";
	else if (record.unreadable) recordProblem = "is not valid JSON";
	else if (record.protocol !== 2) recordProblem = `has protocol ${record.protocol ?? "(none)"}, not 2`;
	else {
		const wrong = Object.keys(artifact).find((field) => record.artifact?.[field] !== artifact[field]);
		recordProblem = wrong
			? `names artifact.${wrong} ${record.artifact?.[wrong] ?? "(none)"}, the train expects ${artifact[wrong]}`
			: finalConsumersProblem(root, topology, repo, record.consumers, final);
	}
	return {
		repo,
		finalTag,
		recordPath,
		recordProblem,
		expectedRecord: {
			protocol: 2,
			artifact,
			consumers: consumers.map((consumer) => ({ role: CONSUMER_ROLES[consumer.repo] ?? consumer.repo, repository: consumer.repository, ref: consumer.sha })),
		},
	};
}

export function convergence(o) {
	if (o.recordProblem) {
		return landStep(o.repo, "final-record", o.recordPath, json(o.expectedRecord), `chore(release-train): record the ${o.finalTag} final`, `land ${o.recordPath} (it ${o.recordProblem})`);
	}
	return checks([["npm", "run", "release-train:verify-final"]]);
}
