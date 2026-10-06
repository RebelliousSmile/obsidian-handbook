import { App, Modal, Setting } from "obsidian";
import { t } from "../utils/i18n";
import { BRUMES_BLOCKS } from "../features/blocks/registry";
import type { BrumesBlock } from "../features/blocks/types";
import type { CalloutDefinition } from "../features/callouts/types";
import { visibleCallouts } from "../features/callouts/visibility";
import type { GameRegistration } from "../games/variants";

export interface ThemeContents {
	handouts: BrumesBlock<unknown>[];
	callouts: CalloutDefinition[];
	blocks: BrumesBlock<unknown>[];
}

/** Return only features which the active installed game actually declares. */
export function resolveThemeContents(
	registration: GameRegistration,
	callouts: CalloutDefinition[],
): ThemeContents {
	const gameId = registration.pack.id;
	const requiredCapabilities = registration.installation?.requires ?? [];
	const requiredBlocks = new Set(
		requiredCapabilities
			.filter((capability) => capability.startsWith("block:"))
			.map((capability) => capability.slice("block:".length)),
	);

	const blocks = BRUMES_BLOCKS.filter((block) => requiredBlocks.has(block.id));
	return {
		handouts: blocks.filter((block) => block.handout),
		callouts: visibleCallouts(callouts, gameId, requiredCapabilities),
		blocks,
	};
}

export class ThemeContentsModal extends Modal {
	private readonly registration: GameRegistration;
	private readonly callouts: CalloutDefinition[];


	constructor(
		app: App,
		registration: GameRegistration,
		callouts: CalloutDefinition[],
	) {
		super(app);
		this.registration = registration;
		this.callouts = callouts;
	}

	onOpen(): void {
		this.setTitle(t("{game} features", { game: this.registration.pack.label }));
		const contents = resolveThemeContents(this.registration, this.callouts);

		this.contentEl.createEl("h3", { text: t("Handouts") });
		if (contents.handouts.length === 0) {
			this.contentEl.createEl("p", { text: t("No handout is declared for this game.") });
		} else {
			for (const handout of contents.handouts) {
				new Setting(this.contentEl)
					.setName(handout.label)
					.setDesc(t("Code block: {ids}", { ids: handout.id }));
			}
		}

		this.contentEl.createEl("h3", { text: t("Callouts") });
		if (contents.callouts.length === 0) {
			this.contentEl.createEl("p", { text: t("No callout is declared for this game.") });
		} else {
			for (const callout of contents.callouts) {
				const syntax = callout.aliases.map((alias) => `[!${alias}]`);
				new Setting(this.contentEl)
					.setName(callout.name)
					.setDesc(syntax.length > 0 ? syntax.join(", ") : t("ID: {id}", { id: callout.id }));
			}
		}

		this.contentEl.createEl("h3", { text: t("Code blocks") });
		if (contents.blocks.length === 0) {
			this.contentEl.createEl("p", { text: t("No code block is declared for this game.") });
		} else {
			for (const block of contents.blocks) {
				const ids = [block.id, ...(block.aliases ?? [])];
				new Setting(this.contentEl)
					.setName(block.label)
					.setDesc(t("Code block: {ids}", { ids: ids.join(", ") }));
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
