/**
 * `publish`: drive the providers of an approved train to their final release.
 *
 * Without `--run` it only shows the next step and the exact command; with
 * `--run` it executes the steps a machine may take, one after the other,
 * and stops at the first one that needs a person or has to wait.
 */
import { publishTrain } from "./publish.mjs";
import { resolveTrain } from "./train.mjs";
import { SupervisorError } from "./topology.mjs";

export const PUBLISH_COMMANDS = {
	publish: {
		usage: "publish [--run]                           show the next publication step of an approved train; --run executes it",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			const { train, file } = resolveTrain(context.root, context.topology, values.train);
			if (train.status !== "open") throw new SupervisorError(`publish: train "${train.id}" is closed`);
			return publishTrain(context, file, { run: Boolean(values.run) });
		},
	},
};
