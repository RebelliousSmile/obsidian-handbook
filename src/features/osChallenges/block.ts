import { BrumesBlock } from "../blocks/types";
import { OS_BLOCK_IDS, OS_FEATURE_FLAGS } from "../otherscape/types";
import { OsProfileData, parseOsChallenge, parseOsPowerSet } from "./parser";
import { renderOsProfile } from "./renderer";
import { osChallengeShape, osPowerSetShape } from "./shape";
const template = (power: boolean) => `\`\`\`${power ? OS_BLOCK_IDS.powerSet : OS_BLOCK_IDS.challenge}\nname = "${power ? "Source-Touched Berserk" : "Chrome Vulture Runner"}"\n${power ? 'type = "mythos"' : "scale = 1"}\ndescription = "Describe this profile."\n\`\`\`\n`;
export const osChallengeBlock: BrumesBlock<OsProfileData> = { id: OS_BLOCK_IDS.challenge, mode: "otherscape", flag: OS_FEATURE_FLAGS.challenge, label: "Challenge :Otherscape", icon: "shield", shape: osChallengeShape, parse: parseOsChallenge, render: renderOsProfile, template: () => template(false) };
export const osPowerSetBlock: BrumesBlock<OsProfileData> = { id: OS_BLOCK_IDS.powerSet, mode: "otherscape", flag: OS_FEATURE_FLAGS.powerSet, label: "Power Set :Otherscape", icon: "zap", shape: osPowerSetShape, parse: parseOsPowerSet, render: renderOsProfile, template: () => template(true) };
