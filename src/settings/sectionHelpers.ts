import { App, Notice, SettingGroup } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import { log } from "../utils/logger";

export interface SettingsHost {
	readonly app: App;
	readonly plugin: BrumesPlugin;
	readonly containerEl: HTMLElement;
	redisplay(): void;
}

export function createSection(containerEl: HTMLElement): SettingGroup {
	return new SettingGroup(containerEl);
}

/** Runs a settings write; a failure is logged and shown as the already translated notice. */
export function runTask(
	task: () => Promise<void>,
	logMessage: string,
	noticeMessage: string,
): void {
	void task().catch((error: unknown) => {
		log.error(logMessage, error);
		new Notice(noticeMessage);
	});
}

/** Fill a translated sentence, its `{slot}` markers replaced by nodes, so no fragment is translated apart. */
export function appendTemplate(
	parent: DocumentFragment,
	template: string,
	slots: Record<string, (host: DocumentFragment) => void>,
) {
	for (const piece of template.split(/(\{\w+\})/)) {
		const slot = /^\{(\w+)\}$/.exec(piece)?.[1];
		const fill = slot === undefined ? undefined : slots[slot];
		if (fill) fill(parent);
		else if (piece) parent.append(piece);
	}
}

export function appendLink(parent: DocumentFragment, label: string, href: string) {
	const link = parent.doc.createElement("a");
	link.textContent = label;
	link.href = href;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	parent.append(link);
}
