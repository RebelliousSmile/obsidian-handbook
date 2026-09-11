import { readFileSync } from "fs";
import { dirname, join } from "path";
import { MIST_ENGINE_CODECS } from "schema-in-the-mist";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";

class El {
    textContent = "";
    children: El[] = [];
    dataset: Record<string, string> = {};
    classes: string[] = [];
    classList = { add: (...names: string[]) => this.classes.push(...names) };
    constructor(public tagName: string) {}
    appendChild(child: El): El { this.children.push(child); return child; }
}
const doc = { createElement: (tagName: string) => new El(tagName) };
const text = (element: El): string => element.textContent + element.children.map(text).join("");

const renderers: Record<string, string> = {
    "city-of-mist/danger": "com-danger",
    "city-of-mist/theme-card": "com-theme-card",
    "legend-in-the-mist/challenge": "litm-challenge",
    "legend-in-the-mist/journey": "litm-journey",
    "legend-in-the-mist/story-theme": "theme-card",
    "legend-in-the-mist/theme-kit": "litm-theme-kit",
    "otherscape/challenge": "os-challenge",
    "otherscape/character-trope": "os-character-trope",
    "otherscape/loadout-item": "os-loadout-item",
    "otherscape/power-set": "os-power-set",
    "otherscape/theme": "os-theme",
    "otherscape/theme-kit": "os-theme-kit",
};
if (Object.keys(renderers).length !== 12) throw new Error("Expected 12 rendered Mist formats");

const manifestFile = join(process.cwd(), "node_modules/schema-in-the-mist/corpus/contract/cases.json");
const corpusRoot = dirname(manifestFile);
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
let canonicalAccepted = 0;
let canonicalRejected = 0;
let rendered = 0;

for (const entry of manifest.cases) {
    const source = readFileSync(join(corpusRoot, entry.file), "utf8");
    const codec = MIST_ENGINE_CODECS[entry.target as keyof typeof MIST_ENGINE_CODECS];
    if (entry.canonical === "accept") {
        const value = codec.parseToml(source);
        const after = codec.parseToml(codec.stringifyToml(value as never));
        if (JSON.stringify(value) !== JSON.stringify(after)) throw new Error(`${entry.id}: canonical round-trip`);
        canonicalAccepted += 1;
    } else {
        let failed = false;
        try { codec.parseToml(source); } catch { failed = true; }
        if (!failed) throw new Error(`${entry.id}: canonical rejection expected`);
        canonicalRejected += 1;
    }

    const blockId = renderers[entry.target];
    if (!blockId || entry.canonical !== "accept") continue;
    const block = BRUMES_BLOCKS.find((candidate) => candidate.id === blockId);
    if (!block) throw new Error(`${entry.target}: renderer not registered`);
    const data = block.parse(source);
    if (data === null) throw new Error(`${entry.id}: accepted witness returned null`);
    const element = block.render(data, doc as unknown as Document) as unknown as El;
    if (!text(element).trim()) throw new Error(`${entry.id}: renderer returned no text`);
    rendered += 1;
}

console.log(`Mist contract: ${canonicalAccepted} accepted, ${canonicalRejected} rejected, ${rendered} rendered.`);
