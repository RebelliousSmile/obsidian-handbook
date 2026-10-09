---
objective: "A Monster of the Week vault renders its playbook booklet, team sheet, monster sheet and threat page on a white page with free fonts, from a contract and an appearance published by schema-pbta."
status: implemented
---

# Plan: Monster of the Week — livret de PJ, fiche d'équipe, fiche de monstre, page de menace

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Étendre `monster-of-the-week-playbook`, créer `monster-of-the-week-team`, `monster-of-the-week-monster` et `monster-of-the-week-threat`, publier fond blanc, polices libres, jetons et libellés français du pack, puis rendre le tout dans Handbook d'après les captures de `Perso/RPG/monster-of-the-week/_sources/Design` |
| **Source** | Brainstorm du 2026-10-08 ; captures `playbook1`, `playbook2` (livret), `team`, `team2` (équipe), `creature.jpg` (monstre), `menace1`, `menace2` (menace) ; PDF de la même source pour le vocabulaire. Aucune issue Handbook n'existe encore : à créer à l'ouverture du train |
| **Mode**   | **Un seul train** du superviseur (`doc/supervisor.fr.md`), conduit par le skill `ship-train` : `schema-pbta` (fournisseur) → `obsidian-handbook` + `lantern` (épingle seule). Tout le code s'écrit avant d'ouvrir le train, comme pour le plan Masks |
| **Dépendance** | **Ce plan réutilise l'infrastructure du plan Masks** (`../2026_10_07_masks-2e-integration/`, phases 2 à 4) : règle d'appartenance `<pack.id>-<type>`, table `PLAYBOOK_LAYOUTS`, rangées de une à trois colonnes, corpus de refus de présentation, contrats générés par `npm run gen`, `presentation` du manifeste en liste. Si l'une de ces briques n'est pas sur `origin/main` au moment d'exécuter, elle se reprend de la phase correspondante de Masks au lieu d'être réécrite |
| **Ordre**  | **1. Écrire, sans train ni commit** : worktrees (phase 1, tâche 1), `schema-pbta` (phases 2 et 3), épingle locale du tarball et règle d'appartenance (phase 4, tâches 1 et 2), blocs et layout (phases 5 et 6), essai au coffre (phase 7, tâche 1). **2. Livrer** : restaurer l'épingle, préparer les versions, ouvrir le train (phase 1, tâche 2), poser le travail, valider le rendu, `ship` (phase 4, tâche 3, phase 7, tâches 2 à 4) |
| **Exécution** | Dans les worktrees du superviseur, dossier `<W>` libre au moment d'exécuter, créé par `pnpm supervise worktree <W>` (jamais `git worktree add`, jamais de branche). Ensuite tout chemin se lit sous `<W>/<dépôt>` et toute commande `pnpm supervise` se lance depuis `<W>/obsidian-handbook` avec `--root <W>` en chemin absolu. Aucun worktree n'est supprimé par ce plan |
| **Versions** | Aucune version écrite en dur : **v\<N>** est le contrat de `schema-pbta` publié au départ de la phase 2, **v\<N+1>** la majeure que le train ouvre. Rattachement à décider à l'ouverture, selon l'avancement de Masks : **même majeure que Masks** (un contrat v\<N+1> porteur des deux jeux, un train de plus à coordonner) ou **majeure d'après** (v\<N+2>, deux trains en file). Hypothèse de travail : ne pas retarder Masks, donc une majeure d'après si Masks est déjà ouvert. Le superviseur est juge et diffuseur des versions, pas leur auteur ; une finale publiée est immuable |
| **Skills** | `ship-train` invoqué une fois le code écrit : `board`, `prepare`, `preview`, `ship`, `repair` (phases 4 et 7). L'écriture se fait avant, sans train |

## Phases

| #   | Phase                                                        | File                         |
| --- | ------------------------------------------------------------ | ---------------------------- |
| 1   | Créer les worktrees, puis (code écrit) ouvrir le train       | [`phase-1.md`](./phase-1.md) |
| 2   | schema-pbta : contrat du livret, de l'équipe, du monstre et de la menace | [`phase-2.md`](./phase-2.md) |
| 3   | schema-pbta : présentation et apparence du pack (fond blanc, polices, jetons) | [`phase-3.md`](./phase-3.md) |
| 4   | Adoption par Handbook et Lantern (épingle locale), puis versions et pose du travail | [`phase-4.md`](./phase-4.md) |
| 5   | Handbook : blocs équipe, monstre et menace                   | [`phase-5.md`](./phase-5.md) |
| 6   | Handbook : layout du livret de PJ                            | [`phase-6.md`](./phase-6.md) |
| 7   | Essayer au coffre, puis valider le rendu et livrer le train  | [`phase-7.md`](./phase-7.md) |

Pas de phase de callouts : le jeu n'en a pas de propre, les quatre callouts génériques (`pbta-clock`, `pbta-move`, `pbta-npc-reaction`, `pbta-playbook-change`) suffisent et leur vérification est une tâche de la phase 3.

## Resources

| Source | Verified |
| ------ | -------- |
| https://openfontlicense.org/ofl-faq/ | Compression WOFF2 pure permise sous un nom réservé ; sous-ensemblage ou instanciation = version modifiée, à renommer |
| https://raw.githubusercontent.com/google/fonts/main/ofl/anton/OFL.txt | Candidate de titre (3rd Man) : à relire au moment d'exécuter |
| https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/OFL.txt | Candidate de titre, déjà évaluée pour Masks : à relire |
| https://raw.githubusercontent.com/google/fonts/main/ofl/crimsonpro/OFL.txt | Candidate de corps (Warnock Pro) : OFL 1.1, variable ; déjà retenue pour Masks |
| https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/OFL.txt | Candidate de sous-titres (Myriad Pro Condensed) : à relire |
| `Perso/RPG/monster-of-the-week/_sources/Monster_of_the_Week_Hardcover_Edition_EHP0060.pdf` | **Référence de rendu anglaise** (Handbook anglais) : titres 3rd Man 39/26/24/17 pt, corps Warnock Pro 10 pt, titres gras 12-13 pt, noir sur blanc, tableaux à règles noires sans zébrure, encarts en bandeau noir, cases Fate Core Glyphs. Les ratios (titre ≈ 4× le corps) se reprennent en `em` dans `pack.json` ; la mise en page est riche (bandeaux, colonnes, règles), jamais minimaliste |
| Polices d'origine : 3rd Man, Warnock Pro, Myriad Pro Condensed, Fate Core Glyphs | **Non libres, jamais redistribuées** ; remplacées. Licences de substitut à vérifier avant publication |

## Decisions

| Decision | Why |
| -------- | --- |
| Quatre cibles : le livret étend `monster-of-the-week-playbook` ; `-team`, `-monster`, `-threat` sont neuves, chacune un objet strict autonome | Règle `<pack.id>-<type>` du plan Masks ; un objet autonome empêche une cible d'accepter les témoins d'une autre (alias indétectable). Le monstre (`creature.jpg`) et la menace (`menace1`, `menace2`) partagent une sous-structure (nom, type, description, attaques, points faibles, mouvements), définie une fois dans un sous-schéma privé |
| Trois blocs Handbook : `pbta-team`, `pbta-monster`, `pbta-threat`, avec capacités `block:*` et gabarits d'insertion | Précédent `block:adrenaline-pnj` ; un bloc qui rendrait `null` sur un document valide est un piège |
| Tout en français, anglais seulement si l'i18n le gère | Décision de l'utilisateur. Lu : `labelDictionary` ne porte qu'une chaîne par clé et Handbook ne localise pas aujourd'hui ; aucun anglais n'est donc livré. Les libellés de l'équipe sont traduits de l'anglais (aucune fiche d'équipe française) : à relire par l'utilisateur au coffre |
| Fond blanc, clair seul ; le beige et le rouge d'origine disparaissent | Décision de l'utilisateur. Jeton de papier `#fff`, accent à régler au coffre ; aucune règle sombre statique |
| Polices libres de substitution (titre, corps, sous-titre) choisies au coffre sur un rendu côte à côte ; les glyphes de Fate Core Glyphs sont remplacés par des caractères Unicode ou des formes CSS | Les quatre polices d'origine ne sont pas redistribuables. Aucune embarquée dans Handbook : déclarées dans `pack.json` (`assets.fonts`) |
| La géométrie de chaque feuille est publiée par le pack (`layout.css`, `page.css`), Handbook n'écrit aucun SCSS pour MotW | Décision déjà prise pour Masks : un pack se corrige par un commit d'apparence ; `dist/styles.css` ne doit pas bouger |
| Accroches `data-region`, `data-primitive`, `data-face`, `data-row`, `data-column` aux valeurs du contrat publié | Contrat inter-dépôts, prouvé des deux côtés contre le contrat, jamais l'un contre l'autre |
| Le livret est A4 paysage recto/verso, trois colonnes ; l'équipe, le monstre et la menace sont des blocs sans faces | Lu sur les captures. La règle « une rangée = une face » ne vaut que pour le livret |
| Les gardes de Handbook lisent un rôle, jamais un chiffre ; cases à cocher en `align-items: flex-start` | Règles de `assert:guards-by-role` et leçon de #89 |
| Lantern n'adopte que l'épingle | Même raison que Masks : le gabarit d'édition ne traite que des sections fixes ; éditer les nouveaux champs est une issue Lantern distincte |
| Les contrats de présentation sont générés (`src/presentation/<cible>.ts` puis `npm run gen`), jamais édités | Leçon de #89 ; chaque contrainte a son refus dans `corpus/presentation/invalid/` |
| Tout le code s'écrit avant que le train s'ouvre ; épingle locale du tarball jamais commitée, restaurée ligne par ligne avant le commit | Décisions du plan Masks, reconduites |
| Majeure rattachée : v<N+1> (v12), ouverte sur `main` de `schema-pbta` après la livraison de Masks (v11) | Tranché le 2026-10-08 sur l'état réel de `origin/main` : Masks est publié (v11.0.0) et aucune majeure suivante n'était prise ; MotW prend la suivante |
| `luck` reste un entier plat (en plus de `luckMax`/`luckMarked`) ; `statChoices` est une liste de cases | Garde le contrat du livret lisible sans repli : une valeur et des cases, jamais un objet imbriqué |
| `motw-ratings` lie aussi `stats` ; le schéma ne publie pas de plage de caractéristiques pour MotW | Les caractéristiques se rendent en ligne clé + valeur signée, sans repli sémantique local dans Handbook |
| Monstre et menace ne sont pas fusionnés ; ils partagent seulement `motwShared`/`statBlockRegion` côté Handbook | Deux cibles, deux contrats, un sous-schéma privé en amont |
| Le livret est rendu en deux colonnes par face (contrat publié), pas trois | Le contrat de présentation publié fait foi sur la lecture des captures |
