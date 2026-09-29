/**
 * `present` and `approve`: show the evidence, then record a yes bound to it.
 *
 * `approve` binds exactly what `present` showed: it refuses a presentation
 * that was not presentable, one whose repositories moved since, and one
 * edited by hand (its fingerprint no longer matches). The yes itself is the
 * train id typed on a terminal; there is no flag to skip it.
 */
import { fetchOrigin, revParse } from "./git.mjs";
import { askTrainId, assertApproval } from "./approval.mjs";
import { computeDigest } from "./digest.mjs";
import { presentTrain, renderPresentation } from "./present.mjs";
import { resolveTrain, writeTrain } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

function checkPresentation(root, topology, train) {
	const presentation = train.presentation;
	if (!presentation) throw new SupervisorError(`approve: train "${train.id}" was never presented; run supervise present first`, 1);
	if (!presentation.presentable) {
		throw new SupervisorError(`approve: the last presentation of train "${train.id}" is not presentable:\n  ${presentation.reasons.join("\n  ")}`, 1);
	}
	const digest = computeDigest({ id: train.id, repos: presentation.repos, trainFiles: presentation.trainFiles, publications: presentation.publications });
	if (digest !== presentation.digest) {
		throw new SupervisorError(`approve: the presentation of train "${train.id}" was edited after present; run supervise present again`, 1);
	}
	const moved = [];
	for (const { repo: id, sha } of presentation.repos) {
		const dir = repoDir(root, repoById(topology, id));
		fetchOrigin(dir);
		const head = revParse(dir, "origin/main");
		if (head !== sha) moved.push(`${id}: origin/main is ${head ? head.slice(0, 10) : "unknown"}, the presentation showed ${sha.slice(0, 10)}`);
	}
	if (moved.length > 0) throw new SupervisorError(`approve: the repositories moved since the presentation\n  ${moved.join("\n  ")}\nrun supervise present again`, 1);
	return presentation;
}

const TRAIN = { train: { type: "string" } };

export const APPROVAL_COMMANDS = {
	present: {
		usage: "present                                   validate every concerned repository and report, without publishing",
		options: { ...TRAIN },
		run(context, values) {
			const { train, file } = resolveTrain(context.root, context.topology, values.train);
			const presentation = presentTrain(context.root, context.topology, train);
			writeTrain(file, { ...train, presentation }, context.topology);
			console.log(renderPresentation(train, presentation));
			return presentation.presentable ? 0 : 1;
		},
	},
	approve: {
		usage: "approve [--verify]                        type the train id to approve the presentation; --verify checks it still holds",
		options: { ...TRAIN, verify: { type: "boolean" } },
		async run(context, values) {
			const { train, file } = resolveTrain(context.root, context.topology, values.train);
			if (values.verify) {
				assertApproval(context.root, context.topology, train);
				console.log(`Approval of train ${train.id} holds (${train.approval.digest}).`);
				return 0;
			}
			if (train.status !== "open") throw new SupervisorError(`approve: train "${train.id}" is closed`);
			const presentation = checkPresentation(context.root, context.topology, train);
			process.stderr.write([
				`Train ${train.id}: ${train.title}`,
				`Fingerprint ${presentation.digest}`,
				...presentation.repos.map((entry) => `  ${entry.repo} at ${entry.sha}`),
				"An approval covers:",
				...presentation.publications.map((publication) => `  - ${publication}`),
				"",
			].join("\n"));
			if (!(await askTrainId(train.id))) throw new SupervisorError(`approve: the typed id is not "${train.id}"; nothing was approved`, 1);
			const approval = {
				approvedAt: new Date().toISOString(),
				digest: presentation.digest,
				repos: presentation.repos.map(({ repo, sha }) => ({ repo, sha })),
				trainFiles: presentation.trainFiles,
				publications: presentation.publications,
			};
			writeTrain(file, { ...train, approval }, context.topology);
			console.log(`Train ${train.id} approved at ${approval.approvedAt} (${approval.digest}).`);
			return 0;
		},
	},
};
