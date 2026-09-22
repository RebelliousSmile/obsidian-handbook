# External bundled fonts (#40)

1. Extract each embedded face from the licensed SCSS into WOFF2 files and a declarative stylesheet per game. Preserve family, weight, style, display and Unicode range. Carry the upstream font notices with the assets.
2. Publish the files and stylesheets in the owning schema game packs. Validate every declared file and URL, then release the schema package before Handbook adopts it. The standard Obsidian installer fetches only `main.js`, `manifest.json` and `styles.css`, so extra plugin release files would not reliably reach users.
3. Upgrade Handbook to the released schema package, then remove the global font imports from `styles.css`. Let the existing active-pack style writer install only that game's face rules, using Obsidian vault resource URLs.
4. Verify all games retain their intended families, `dist/styles.css` is below 150 kB, and a fresh Obsidian install and game switch load the face files without an additional flash of unstyled text.
