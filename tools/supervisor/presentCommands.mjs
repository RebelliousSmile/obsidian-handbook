/**
 * `present` and `preview`: show the evidence, and let it be tried.
 *
 * `present` runs the validations of every concerned repository and records
 * what it showed: the commit of each repository, the train files it admits
 * afterwards, the publications it covers, and a fingerprint of the three.
 * `publish`, `converge` and `close` are bound to that record (`binding.mjs`);
 * nothing is typed to confirm it.
 */
import { concernedRepos } from "./digest.mjs";
import { trainLogs } from "./logs.mjs";
import { checkCheckouts, presentTrain, renderPresentation } from "./present.mjs";
import { comparePresentation, planPreview, runPreview } from "./preview.mjs";
import { resolveTrain, writeTrain } from "./train.mjs";
import { coordinatorOf, SupervisorError } from "./topology.mjs";

const TRAIN = { train: { type: "string" } };

export const PRESENT_COMMANDS = {
	present: {
		usage: "present [--fresh]                         validate every concerned repository and report, without publishing; --fresh validates again what a green presentation already proved",
		options: { ...TRAIN, fresh: { type: "boolean" } },
		run(context, values) {
			const { train, file } = resolveTrain(context.root, context.topology, values.train);
			const logs = trainLogs(context.root, context.topology, train.id);
			const presentation = presentTrain(context.root, context.topology, train, logs, { fresh: Boolean(values.fresh) });
			writeTrain(file, { ...train, presentation }, context.topology);
			console.log(renderPresentation(train, presentation, logs));
			return presentation.presentable ? 0 : 1;
		},
	},
	preview: {
		usage: "preview --vault <dir> [--no-serve] [--no-open] [--port <n>]   run the train's own code in Obsidian and in each consumer's dev server",
		options: { ...TRAIN, vault: { type: "string", multiple: true }, "config-dir": { type: "string" }, "no-serve": { type: "boolean" }, "no-open": { type: "boolean" }, port: { type: "string" } },
		async run(context, values) {
			const { train } = resolveTrain(context.root, context.topology, values.train);
			if (train.status !== "open") throw new SupervisorError(`preview: train "${train.id}" is closed`);
			const vaults = values.vault ?? [];
			if (vaults.length === 0 && values["no-serve"]) throw new SupervisorError("preview: nothing to show without --vault and with --no-serve", 2);
			const port = values.port === undefined ? undefined : Number(values.port);
			if (port !== undefined && !(Number.isInteger(port) && port > 0 && port < 65536)) throw new SupervisorError(`preview: --port ${values.port} is not a port`, 2);
			const repos = concernedRepos(context.topology, train);
			const coordinator = coordinatorOf(context.topology);
			const heads = checkCheckouts(context.root, repos.some((repo) => repo.id === coordinator.id) ? repos : [...repos, coordinator], "preview");
			for (const warning of comparePresentation(train, heads)) console.log(`preview: warning: ${warning}`);
			const plan = planPreview(context.root, context.topology, train, { vaults, configDir: values["config-dir"] });
			return await runPreview(plan, { serve: !values["no-serve"], open: !values["no-open"], port });
		},
	},
};
