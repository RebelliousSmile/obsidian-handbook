/**
 * `publish`, `converge` and `close`: take an approved train from its providers'
 * finals to its closed coordination issue.
 *
 * `publish` without `--run` only shows the next step and the exact command;
 * with `--run` it executes the steps a machine may take, one after the other,
 * and stops at the first one that needs a person or has to wait. `converge`
 * proves the consumers adopted every final. `close` checks the consumer
 * releases and, with `--run`, closes the issues, the coordination issue last.
 */
import { closeTrain } from "./close.mjs";
import { convergeTrain } from "./converge.mjs";
import { publishTrain } from "./publish.mjs";
import { resolveTrain } from "./train.mjs";
import { SupervisorError } from "./topology.mjs";

function openTrainFile(context, values, label) {
	const { train, file } = resolveTrain(context.root, context.topology, values.train);
	if (train.status !== "open") throw new SupervisorError(`${label}: train "${train.id}" is closed`);
	return file;
}

export const PUBLISH_COMMANDS = {
	publish: {
		usage: "publish [--run]                           show the next publication step of an approved train; --run executes it",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			return publishTrain(context, openTrainFile(context, values, "publish"), { run: Boolean(values.run) });
		},
	},
	converge: {
		usage: "converge                                  prove every consumer pins every final, then run the convergence checks",
		options: { train: { type: "string" } },
		run(context, values) {
			return convergeTrain(context, openTrainFile(context, values, "converge"));
		},
	},
	close: {
		usage: "close [--run]                             check the consumer releases; --run closes the issues, the coordination issue last",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			return closeTrain(context, openTrainFile(context, values, "close"), { run: Boolean(values.run) });
		},
	},
};
