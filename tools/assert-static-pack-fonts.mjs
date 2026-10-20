// No schema package publishes a variable font (obsidian-handbook#116). Chromium writes
// a variable font into a PDF export as Type3 glyph procedures, and printers refuse
// such files; a pack ships one static file per weight. The providers are the
// `schema-*` dependencies of package.json, read in the installed package (the one
// `present` links in place of the pin during a train).
import assert from "node:assert/strict";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf"]);

// WOFF2 known-table index (WOFF2 specification, table 1).
const WOFF2_KNOWN_TAGS = (
	"cmap head hhea hmtx maxp name OS/2 post cvt_ fpgm glyf loca prep CFF_ VORG EBDT EBLC gasp "
	+ "hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL "
	+ "SVG_ sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx "
	+ "opbd prop trak Zapf Silf Glat Gloc Feat Sill"
).split(" ").map((tag) => tag.replace("_", " "));

/** Table tags of a font file, read from its directory: sfnt (TTF/OTF), WOFF and WOFF2. */
export function fontTables(bytes) {
	const signature = bytes.toString("latin1", 0, 4);
	const tags = [];
	if (signature === "wOF2") {
		let offset = 48;
		const readBase128 = () => {
			for (let index = 0; index < 5; index += 1) {
				const byte = bytes[offset];
				offset += 1;
				if ((byte & 0x80) === 0) return;
			}
			throw new Error("malformed WOFF2 table directory");
		};
		for (let table = 0; table < bytes.readUInt16BE(12); table += 1) {
			const flags = bytes[offset];
			offset += 1;
			const known = flags & 0x3f;
			let tag;
			if (known === 63) {
				tag = bytes.toString("latin1", offset, offset + 4);
				offset += 4;
			} else tag = WOFF2_KNOWN_TAGS[known] ?? `#${known}`;
			readBase128();
			const transform = flags >> 6;
			const glyphData = tag === "glyf" || tag === "loca";
			if ((glyphData && transform === 0) || (!glyphData && transform !== 0)) readBase128();
			tags.push(tag);
		}
		return tags;
	}
	const woff = signature === "wOFF";
	const count = bytes.readUInt16BE(woff ? 12 : 4);
	const start = woff ? 44 : 12;
	const size = woff ? 20 : 16;
	for (let table = 0; table < count; table += 1) {
		tags.push(bytes.toString("latin1", start + table * size, start + table * size + 4));
	}
	return tags;
}

function fontFiles(directory) {
	const files = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name === "node_modules") continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...fontFiles(path));
		else if (FONT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
	}
	return files;
}

// The reader must see an fvar table where there is one: the smallest sfnt directory that carries it.
const synthetic = Buffer.alloc(28);
synthetic.writeUInt32BE(0x00010000, 0);
synthetic.writeUInt16BE(1, 4);
synthetic.write("fvar", 12, "latin1");
assert.ok(fontTables(synthetic).includes("fvar"), "the font reader misses an fvar table");

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const providers = Object.keys(packageJson.dependencies ?? {}).filter((name) => name.startsWith("schema-")).sort();
assert.ok(providers.length > 0, "package.json declares no schema-* provider");

const variable = [];
const counts = [];
for (const provider of providers) {
	const directory = realpathSync(resolve(root, "node_modules", provider));
	const files = fontFiles(directory);
	for (const file of files) {
		const tables = fontTables(readFileSync(file));
		assert.ok(tables.includes("head") || tables.includes("CFF ") || tables.includes("cmap"), `${provider}: ${relative(directory, file)} is not a font`);
		if (tables.includes("fvar")) variable.push(`${provider}/${relative(directory, file).split("\\").join("/")}`);
	}
	counts.push(`${provider} ${files.length}`);
}

assert.deepEqual(variable, [], `variable fonts reach a PDF export as Type3 and printers refuse them; publish one static file per weight:\n  ${variable.join("\n  ")}`);
console.log(`Static pack fonts: ${counts.join(", ")} font file(s), none variable.`);
