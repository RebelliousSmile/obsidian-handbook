# Inventaire des écarts — fiche PJ Zombiology

> Phase 1, tâche 2. Référence : `pj.jpg` (fait foi), puis `schema-adrenaline/aidd_docs/tasks/2026_09/2026_09_24_contrat-presentation-fiches/preview.html` (noté `H:<ligne>`).
> Sources lues : `schema-adrenaline` v2.6.0 (`src/presentation.ts`, `handbook/adrenaline/pack.json`, pack 0.5.0) ; Handbook `src/features/adrenalinePj/renderer.ts` (R), `src/styles/adrenaline/_pj.scss` (S) ; Lantern `src/templates/adrenaline/pj/preview/PjPreview.tsx`, `shared/preview/*`.

## Constat général

- **Aucun type manquant.** Les douze formes utilisées par le PJ (`name-card`, `game-parameters`, `formation-columns`, `identity-fields`, `characteristic-rows`, `ruled-list`, `weapon-lines`, `protection-lines`, `stress-dice`, `threshold-rows`, `status-frames`, `fatigue-circles`) existent en v2.6.0. Rien n'est à signaler à l'utilisateur au titre des types.
- **Handbook** distribue sur `block.id` (R:57), ne lit ni `form` ni `layout` ni `appearance` ; seul `section.columns` est lu (R:177). Ignorés : `valueSuffix: "PX"`, `formationFields`, `weapon-die` (d10 en dur), `protection-units` (PP/PM en dur).
- **Lantern** code tout en dur dans `PjPreview.tsx` (titres, libellés, ordre) ; couleurs locales dans `adrenalineTheme.css` (`--adr-paper #f4eee2`, `--adr-burgundy #6a2434`…), polices PT Serif / Bebas Neue, pas de `paper-grain`. Sélecteur `.adr-doc .adr-sheet` descendant alors que les deux classes sont sur le même élément.
- Correction d'un relevé antérieur : `--adrenaline-section-band-ink` **est publié** (light `#3A211C`, dark `#FFF4E9`). Ce n'est pas un jeton manquant.

## Par élément de `pj.jpg`

| Élément de `pj.jpg` | `preview.html` | v2.6.0 publie | Handbook rend | Lantern rend | Manque attribué à |
| --- | --- | --- | --- | --- | --- |
| Fond de page papier grainé | `H:169-176` papier `#f4f0e8` + `paper-grain.webp` voilé à 90 % | `--background-primary #F4F0E8`, `--adrenaline-page-texture` = `paper-grain`, opacité 0.32 ; asset présent | surface `--adrenaline-card-surface` (S:9), texture non posée sur la fiche | `#f4eee2` local, sans grain | Handbook, Lantern |
| Cartouche : nom du personnage | `H:185-207` boîte, bandeau `#74170f`, nom manuscrit | forme `name-card` ; `band`, `bandInk`, `handwrittenInk` | bandeau (S:21-22) et encre (S:53), sans la boîte à trois cases | `AdrenalineHeader` en dur | Handbook, Lantern |
| Cartouche : marque ☣ Zombiology | `H:208-211` titre + « Feuille de personnage » entre filets | aucun élément de contenu : c'est de la décoration du gabarit | absent | absent | Handbook, Lantern (décor CSS/texte statique, pas de schéma) |
| Cartouche : paramètres + case PX | `H:212-218` lignes pointillées, case PX à droite | forme `game-parameters`, `valueSuffix: "PX"` | `valueSuffix` ignoré, pas de case PX | en dur | Handbook, Lantern |
| Bandeaux de section (Compétence, Caractéristique, Équipement, Santé) | `H:221-231` bandeau plein `#74170f`, texte clair, centré | `band` / `bandInk` ; `appearance.sectionTitles {align center, font heading}` | bandeau gris `section-band` (S:46-47, S:93-94) | boutons `openSection` | Handbook, Lantern |
| Sous-titres (Formation, Compétences, Carac. physiques…) + `%` | `H:232-242` capitales, filet `#c55c50`, `%` à droite | pas de jeton pour le filet `#c55c50` | sous-titres sans filet coloré | en dur | **schéma** (`--adrenaline-track-mark`), Handbook, Lantern |
| Compétences en trois colonnes avec valeur % | `H:266-270` lignes à case bordée `#d29a92`, valeur manuscrite | forme `formation-columns`, `formationFields` ; `values {align end, font handwritten}` | trois colonnes par `section.columns`, `formationFields` ignoré | `AdrenalineStatGrid` en dur | **schéma** (`--adrenaline-field-border`), Handbook, Lantern |
| Identité : deux colonnes à lignes pointillées | `H:244`, `H:256-261` `write-line`, pointillés `#a99b91` | forme `identity-fields` ; `--background-modifier-border #B8ADA4` réutilisable | champs sans pointillés | en dur | Handbook, Lantern (jeton réutilisé) |
| Caractéristiques : libellé en bandeau + Création/Actuel | `H:249-254` libellé, deux cases `#d29a92`, suffixe `%` | forme `characteristic-rows` | lignes « 0 %30 % » (texte collé), sans colonne Actuel dessinée | en dur | **schéma** (`field-border`), Handbook, Lantern |
| Équipement : possessions, favori | `H:256-261` lignes pointillées | forme `ruled-list` | liste réglée | en dur | Handbook, Lantern |
| Armes physiques / mentales + dé | `H:262-264` champ pointillé + dé manuscrit à droite | forme `weapon-lines`, `weapon-die` | `d10` en dur | en dur | Handbook, Lantern |
| Protections physiques / mentales PP / PM | `H:256-261` `write-line` + unité | forme `protection-lines`, `protection-units` | PP/PM en dur | en dur | Handbook, Lantern |
| Dés de stress Adrénaline / Panique (+1d100 Favorable…) | `H:116-120` carte à bandeau, lignes `#d29a92` | forme `stress-dice` | bandeau (S:109-125), options en bordure `rule` | en dur | **schéma** (`field-border`), Handbook, Lantern |
| Seuils physiques / mentaux (+Armure / +Caractère) | `H:272-275` libellé en bandeau `#74170f`, cases `#d29a92` | forme `threshold-rows` ; `band`, `bandInk` | bandeau (S:120-121) | en dur | **schéma** (`field-border`), Handbook, Lantern |
| Malus : libellé vertical, cercles de fatigue, Froid / Faim, Vie 1-10 | `H:121-132` piste bordée `#a72b20` ; fatigue jaune vif `#e2b620`/`#d8a617` ; points `#c55c50` | formes `fatigue-circles`, `status-frames` ; `status-yellow` (`#A6781F`) trop sombre face au jaune vif de `pj.jpg` | bloc plein `status-yellow` (S:126) | en dur | **schéma** (`--adrenaline-fatigue`, `--adrenaline-fatigue-ink`, `track-mark`), Handbook, Lantern |
| États encaissés Blessé / Malade / Traumatisé / Répulsion, Heure / Jour / Semaine / Mois | `H:134-140` carte corail `#ed6c63`, libellé vertical `#d84036`, pointillés | forme `status-frames` ; `status-red` (`#9D2416`) trop sombre face au corail | bordure `status-red-bg` (S:127) | en dur | **schéma** (`--adrenaline-condition`, `--adrenaline-condition-border`), Handbook, Lantern |
| Encre manuscrite | `H:215`, `H:252`… `#2d6c78` (sarcelle) en « Segoe Print » | `--adrenaline-handwritten-ink #285C94` (bleu), police « Adrenaline Handwriting » (asset présent) | encre et police du pack (S:53-54) | PT Serif | Lantern |
| Polices | « Adrenaline Display » / « Adrenaline Body » | `appearance.fonts` + assets `fonts/*` | `--font-*-theme` en dur (S) | Bebas Neue / PT Serif | Handbook (lecture de `appearance`), Lantern |

## Couleurs : réutiliser ou ajouter

Règle de la phase 2 : réutiliser un jeton existant si l'écart ne se voit pas.

| Couleur `preview.html` | Usage | Décision |
| --- | --- | --- |
| `#74170f` | bandeaux, libellés | réutilise `--adrenaline-band` (`#71170F`) |
| `#fff8ef` | texte des bandeaux | réutilise `--adrenaline-band-ink` |
| `#a72b20` | bordures de régions et de cartouche | réutilise `--adrenaline-rule` (`#9D2416`) |
| `#8b2115` | libellés de piste, périodes, localisation | réutilise `--adrenaline-band` (fond) / `--adrenaline-rule` (texte) |
| `#f4f0e8` | papier | réutilise `--background-primary` |
| blancs translucides | surfaces de cases | réutilise `--adrenaline-card-surface` |
| `#a99b91`, `#b8ada4`, `#cbbdb4` | pointillés | réutilise `--background-modifier-border` (`#B8ADA4`) |
| `#271a17`, `#2f211e`, `#3a2b27` | texte | réutilise `--text-normal` |
| `#6d5d56`, `#655a55` / `#8f7f77` | petits en-têtes / durées | réutilise `--text-muted` / `--text-faint` |
| `#2d6c78` | encre manuscrite | **arbitré par `pj.jpg`** : `--adrenaline-handwritten-ink` bleu `#285C94` |
| `#d29a92` | bordure des cases de valeur | **nouveau** `--adrenaline-field-border` — light `#D29A92`, dark `#7A3F36` |
| `#c55c50` | filet des sous-titres, points de piste | **nouveau** `--adrenaline-track-mark` — light `#C55C50`, dark `#E78463` |
| `#e2b620`, `#d8a617` | fatigue (fond du libellé, bordure, points) | **nouveau** `--adrenaline-fatigue` — light `#E2B620`, dark `#D9B03A` |
| `#271a17` sur jaune | texte du libellé fatigue | **nouveau** `--adrenaline-fatigue-ink` — light `#271A17`, dark `#160D0B` |
| `#d84036` | libellé vertical des états | **nouveau** `--adrenaline-condition` — light `#D84036`, dark `#E0564B` |
| `#ed6c63` | bordure et cercles des états | **nouveau** `--adrenaline-condition-border` — light `#ED6C63`, dark `#B8473F` |

Six jetons nouveaux, tous de couleur, noms conformes à `^--[a-zA-Z0-9-]+$`. Les valeurs sombres sont une proposition, à juger à l'œil en phase 3.

## Désaccords `preview.html` ↔ `pj.jpg`

| Point | `preview.html` | `pj.jpg` | Arbitrage |
| --- | --- | --- | --- |
| Encre manuscrite | sarcelle `#2d6c78`, « Segoe Print » | bleu stylo | bleu du pack `#285C94`, police « Adrenaline Handwriting » |
| Bandeaux de section | `H:93` gris pour les autres pages, surchargé en bordeaux `H:221` pour le PJ | bordeaux plein | bordeaux (`band`) — Handbook doit quitter `section-band` pour le PJ |
| Marque au centre du cartouche | texte « Zombiology » | logo avec ☣ | texte stylé + glyphe ☣ ; pas d'image nouvelle dans le pack |

## Exécution des validations (tâche 3) — constaté le 2026-09-29

- Garde `tools/supervisor/guard/{gh,git}` : `i/lf w/lf attr/text eol=lf`. OK.
- **Sous Windows natif**, `status` passe en quelques secondes : cinq dépôts alignés, épingles `schema-adrenaline` v2.6.0 chez Handbook et Lantern. `open`, `link`, `sync`, `next`, `publish`, `close` n'ont besoin que de `git` et `gh`, et tournent sous Windows.
- **`present` et `converge` ne sont pas portables aujourd'hui** :
  - le garde est fait de scripts `sh` sans extension : Windows ne les exécute pas, le vrai `gh.exe` passe, et les validations tournent sans protection, sans message ;
  - `runGuarded` (`tools/supervisor/present.mjs:64`) appelle `spawnSync(command[0])` sans shell : `npm` sort `ENOENT` sous Windows, donc `npm run check` (Lantern) échoue ; `pnpm`, `gh` et `git` passent ;
  - `pnpm check` échoue à `assert:supervisor` (scénarios TTY montés sur `sh` et util-linux `script`).
- **Sous WSL**, `status` bloque sur `git fetch` : aucune clé GitHub, aucun `known_hosts` pour github.com, pas de `gh`. Parade vérifiée : `GIT_SSH_COMMAND=ssh.exe` et `gh.exe` de Windows par l'interop (compte authentifié par le keyring). Non retenue : l'utilisateur préfère rendre le superviseur indépendant de l'OS (décision du 2026-09-29), sujet séparé à traiter avant la phase 5.

## Train ouvert (tâche 4) — 2026-09-29

- Coordination : obsidian-handbook#68.
- schema-adrenaline#39 (prêt), obsidian-handbook#69 et lantern#48 (bloqués par #39).
- Portabilité de `present` / `converge` : obsidian-handbook#70, hors train, à traiter avant la phase 5 ; remplace le critère « tout tourne sous WSL » de la tâche 3.
