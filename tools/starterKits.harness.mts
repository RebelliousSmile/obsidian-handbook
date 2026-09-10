import { readStarterKitCatalog } from "../src/games/starterKits";

const catalogue = readStarterKitCatalog({
	manifestVersion: 1,
	kits: [
		{ id: "city", label: "City", description: "A", initialMode: "city-of-mist", sources: [{ repository: "owner/repo", reference: { kind: "latest" } }] },
		{ id: "legend", label: "Legend", description: "B", initialMode: "legend-in-the-mist", sources: [{ repository: "owner/repo", reference: { kind: "branch", value: "main" } }] },
	],
});
if (catalogue.length !== 2 || catalogue[0]?.sources[0]?.id !== "owner--repo") throw new Error("starter kit catalogue was not read");
if (readStarterKitCatalog({ manifestVersion: 1, kits: [{ id: "bad", label: "Bad", description: "", initialMode: "bad", sources: [] }] }).length !== 0) throw new Error("invalid starter kit was accepted");
console.log("starter kits: green");
