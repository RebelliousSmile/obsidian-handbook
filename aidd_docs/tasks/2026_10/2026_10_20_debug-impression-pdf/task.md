---
name: task
description: Débogage — l'export PDF non « printer friendly » se crée mais échoue à l'impression
---

# Task [debug-impression-pdf]

Symptôme rapporté : l'export PDF (réglage `printerFriendly` à `false`, coffre `zombiology`, mode `adrenaline`) est créé, mais l'impression échoue, « il a du mal à réunir toutes les couches ».
Pièce : `~/Downloads/07-pretires-2.pdf` (13 pages, Skia/PDF m126, Letter 612×792), note `zombiology/2026/09/prochain-arret-japon/3. viventes-te-salutant/scenario/07-pretires-2.md` (six blocs `adrenaline-pj`, aucune section de mode).

## Banc d'essai

- Imprimante : HP LaserJet MFP M426dw, pilote **Microsoft IPP Class Driver** (port WSD), `V4_DocumentFormat: application/pdf` → Windows transmet le PDF tel quel, l'interpréteur PDF de l'imprimante le dessine. Bacs en A4, recto verso désactivé par défaut (Windows et imprimante).
- Variantes (réécrites par PyMuPDF, pages 2–3 de l'original : une fiche PJ puis une page de texte) : `A-original`, `B-fond-blanc`, `C-sans-degrades`, `D-sans-degrades-ni-opacites`.
- Résultat rapporté le 2026-10-20 : A et B impriment la première feuille (la fiche PJ) puis échouent ; C et D n'impriment rien ; A signalé « fichier endommagé ». Les quatre travaux finissent en « Erreur ; Envoyé vers l'imprimante » ; Windows (événement 307) les dit tous imprimés : l'erreur est levée par l'imprimante.
- Journal de l'imprimante : dernier événement `13.0304 Bourrage papier` au compteur 74032 (total 74036, donc pendant les essais du jour) ; plus ancien `20.0000 Mémoire d'imprimante insuffisante` (73856), `41.3000 Format de papier inattendu` (70894) ; 49 bourrages au total.
- Un travail `PAJ1.pdf` (9 pages, 15/10 21:44, 0 imprimée) reste en tête de file Windows.

## H1 — Dégradé à arrêts transparents de la fiche PJ (confiance 8 → 2)

- [x] `.brumes-adrenaline-pj__wound-write` (`src/styles/adrenaline/_pj.scss:608`) : `repeating-linear-gradient(transparent 0 15px, … 15px 16px)`.
- [x] Skia l'écrit en motif de pavage pleine page contenant une `ShadingType 1` à fonction PostScript (`FunctionType 4`) sous un masque doux de luminance. 16 motifs, 16 `/SMask`, 32 fonctions de type 4.
- [x] Retirés (avec H2), la page n'est plus rastérisée par `pdftops`. Les lignes sont quasi invisibles dans le PDF : coût maximal pour un gain nul.
- [x] Validation imprimante : **contredite**. La page de fiche, celle qui porte toute la transparence, est la seule qui sort (A, B) ; c'est la feuille suivante, une page de texte sans dégradé, qui échoue. C et D n'impriment rien du tout, ce qui désigne la réécriture PyMuPDF (motifs vidés) plutôt que le dégradé.

## H2 — Opacités constantes (texture 0,32, lignes barrées 0,5) (confiance 5 → 1)

- [x] `.brumes-adrenaline-pj--surface-paper-sheet::before` (`_pj.scss:82`) : image 512×512 en motif, `/ca .32` ; `ref-row--struck` `/ca .5` ; un `/ca 0`.
- [x] Validation imprimante : **invalidée** pour la même raison que H1 (la page qui les porte s'imprime).

## H3 — Fond de page plein cadre propre au mode non imprimable (confiance 3 → 0)

- [x] `_print.scss:29` : aplat `--background-primary` sous toute la page en mode non imprimable.
- [x] Validation imprimante : **invalidée**, `B-fond-blanc` échoue exactement comme `A-original`.

## H4 — Format Letter sur une imprimante chargée en A4 (confiance 2 → 7)

- [x] Toutes les pages font 612×792 pt (Letter). Réglage « Taille de page » de l'export PDF d'Obsidian, pas de Handbook.
- [x] Le symptôme colle : première feuille sortie, échec sur la suivante, bourrage 13.0304 enregistré pendant les essais, antécédent `41.3000 Format de papier inattendu`. Le PDF étant transmis brut à l'interpréteur de l'imprimante (pilote IPP), aucune mise à l'échelle Windows ne corrige le format.
- [x] Validation imprimante : témoins sans Handbook, `E-temoin-letter.pdf` (2 pages Letter) et `F-temoin-a4.pdf` (2 pages A4). Travaux 9 (12:01) et 10 (12:02) sortis de la file sans erreur, compteur 74036 → 74040 (4 pages), aucun nouvel événement dans le journal. **Invalidée** : un PDF Letter de 2 pages s'imprime (à confirmer de visu).

## H5 — Sections de mode forcées par `printModeSections` (invalidée)

- [x] Le traitement ne s'applique qu'en mode non imprimable, mais la note ne contient aucune section de mode : rien n'est ajouté.

## H6 — Bourrage mécanique indépendant du fichier (confiance 4)

- [x] 49 bourrages au compteur, dont trois 13.09xx (unité recto verso / sortie) récents.
- [x] Départagée par les témoins : E et F passent sans bourrage. **Invalidée** comme cause unique ; le bourrage 13.0304 (compteur 74032) reste non daté.

## H7 — Polices variables du pack écrites en Type3 par Skia (confiance 7)

- [x] L'original compte 47 polices Type3 ; seules RubikDirt et SegoeUISymbol sont incorporées (Type0). Page de fiche : 26 Type3 ; page de texte : 4 Type3.
- [x] Polices du pack `schema-adrenaline/handbook/adrenaline` : `adrenaline-body.woff2` (EB Garamond) et `adrenaline-handwriting.ttf` (Caveat) sont **variables** (`fvar`) ; `adrenaline-display.woff2` (Rubik Dirt) est statique, et c'est justement la seule incorporée normalement.
- [x] Reproduction hors Obsidian (Chrome sans tête, Skia m155), même texte, A4, 2 pages : `G-polices-variables.pdf` → 11 polices Type3 par page ; `H-polices-statiques.pdf` (instances statiques 400/700 tirées par `fontTools.varLib.instancer`) → 4 polices Type0 incorporées. Chaque graisse ou taille d'une police variable devient une police Type3 distincte, dessinée glyphe par glyphe en procédures.
- [x] Cohérent avec l'antécédent `20.0000 Mémoire d'imprimante insuffisante` et avec `PAJ1.pdf` (85 Type3, 0 page imprimée sur 9) : l'interpréteur PDF de la M426dw reçoit le fichier brut (pilote IPP).
- [x] Indépendant de `printerFriendly` : les polices sont les mêmes dans les deux modes.
- [x] Validation imprimante : **confirmée**. Interrogation IPP de l'imprimante (`Get-Jobs`, `which-jobs=completed`) : travaux 454 à 459 (A, B, C, D, A, B) et 462 (G) → `job-state 8` (aborted), `document-format-error`, **0 feuille** ; travaux 460, 461 (E, F) et 463 (H, travail Windows 12 à 12:06:29) → `job-completed-successfully`, 2 feuilles. G et H ne diffèrent que par les polices (même texte, même Chrome, même A4).
- [x] Corollaire : A et B n'ont imprimé aucune feuille selon l'imprimante ; la « première feuille » observée n'en vient pas.
- [x] Portée : polices variables publiées par les packs — `schema-adrenaline` (body EB Garamond, handwriting Caveat), `schema-pbta/monsterhearts` (`el-messiri-latin-400-700-normal.woff2`), `schema-pbta/urban-shadows` (`source-serif-4-latin-wght-normal.woff2`), et, relevé à l'implémentation, `schema-pbta/masks` (Josefin Sans, Crimson Pro), `schema-pbta/monster-of-the-week` (Crimson Pro) et `schema-pbta/the-sprawl` (Jura, Exo 2). Les packs `schema-in-the-mist` n'ont que des polices statiques.
- [x] Correction (train `static-pack-fonts`, issue #116) : forme hybride, sans changement du contrat `GamePack` — la face 400 de chaque famille reste dans `assets.fonts`, les autres graisses sont déclarées dans `fonts/faces.css` (`stylesheets`) et leurs fichiers dans `assets.resources` (motif des packs Mist). Une instance statique par pas de 100, reprise telle quelle de l'amont (Fontsource 5.3.0, sous-ensemble latin, pour EB Garamond et les packs PbtA ; Caveat Regular de googlefonts/caveat) plutôt qu'instanciée localement. Gardes : `validate-handbook-pack(s).ts` refusent une police `fvar` déclarée ou en resource ; Handbook `assert:static-pack-fonts` refuse un paquet `schema-*` qui en livre une.

## Conclusion

Cause confirmée : H7. L'interpréteur PDF de la HP M426dw (atteint directement par le pilote IPP) rejette en `document-format-error` les PDF Skia qui contiennent les polices Type3 issues de polices variables. Ni la transparence (H1, H2), ni le fond (H3), ni le format Letter (H4), ni le réglage `printerFriendly` n'y sont pour quelque chose.

## Prémisse non vérifiée

- [ ] Rien ne montre que l'export **imprimable** de cette note s'imprime : la fiche PJ a la même structure dans les deux modes, et l'export reste en Letter. Le lien avec `printerFriendly: false` vient de ce que seul le coffre `zombiology` l'a désactivé.

## Vérification après le train `static-pack-fonts` (2026-10-20)

Releases : schema-adrenaline v6.2.0, schema-pbta v13.1.0, Lantern v0.29.1, Handbook v2.46.2 (#116 clos).

- [x] Les 17 fichiers de police publiés (schema-adrenaline 6.2.0 : EB Garamond 400 à 800, Rubik Dirt, Caveat ; schema-pbta 13.1.0 : Monsterhearts et Urban Shadows), chargés en `@font-face` dans une page A4 imprimée par Chrome sans tête : `pdffonts` ne liste que du **CID TrueType**, aucune Type3.
- [x] Ce PDF envoyé à la HP M426dw par IPP Print-Job (`application/pdf`) : travail 470, `job-completed-successfully`, 1 page.
- [ ] Reste à faire par l'utilisateur : l'export Obsidian de `07-pretires-2` en A4, puis son impression. C'est un geste d'interface qu'aucun harnais ne reproduit. La page de test vérifie les polices, pas la composition de la note.
