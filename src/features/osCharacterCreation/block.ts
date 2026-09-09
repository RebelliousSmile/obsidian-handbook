import { BrumesBlock } from "../blocks/types";
import { OS_BLOCK_IDS, OS_FEATURE_FLAGS } from "../otherscape/types";
import { OsCreationData, parseOsCharacterTrope, parseOsLoadoutItem } from "./parser";
import { renderOsCreation } from "./renderer";
import { osCharacterTropeShape, osLoadoutItemShape } from "./shape";
export const osCharacterTropeBlock: BrumesBlock<OsCreationData> = { id: OS_BLOCK_IDS.characterTrope, mode: "otherscape", flag: OS_FEATURE_FLAGS.characterTrope, label: "Trope de personnage :Otherscape", icon: "users", shape: osCharacterTropeShape, parse: parseOsCharacterTrope, render: renderOsCreation, template: () => `\`\`\`os-character-trope\nname = "Neon Exorcist"\ncategory = "MYSTICS & MEDIUMS"\ndescription = "Describe the trope."\nloadout = ["suggested item"]\n\`\`\`\n` };
export const osLoadoutItemBlock: BrumesBlock<OsCreationData> = { id: OS_BLOCK_IDS.loadoutItem, mode: "otherscape", flag: OS_FEATURE_FLAGS.loadoutItem, label: "Objet d'équipement :Otherscape", icon: "package", shape: osLoadoutItemShape, parse: parseOsLoadoutItem, render: renderOsCreation, template: () => `\`\`\`os-loadout-item\nname = "Kestrel Whisperlink"\ncategory = "Weapons"\nfeature_tags = ["Kestrel Whisperlink", "hard to jam"]\n\`\`\`\n` };
