---
objective: "A The Sprawl vault renders its playbook booklet, player matrix, mission sheet and MC cards (threat, corporation, resource) on a white page with free fonts, from a contract and an appearance published by schema-pbta."
status: implemented
---

# Plan: The Sprawl — livret de PJ, matrice, fiche de mission et cartes de MC

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Étendre `the-sprawl-playbook`, créer `the-sprawl-matrix`, `the-sprawl-mission`, `the-sprawl-threat`, `the-sprawl-corporation` et `the-sprawl-resource`, publier fond blanc, polices libres, jetons et libellés français du pack, puis rendre le tout dans Handbook d'après les captures de `Perso/RPG/the-sprawl/_sources/design` |
| **Source** | Brainstorm du 2026-10-08 ; captures `livret1`, `livret2` (livret « Le Limier »), `matrice-pj`, `mission`, `menaces`, `corpos`, `mc` ; PDF de `_sources/vf` et `_sources/vo` pour le vocabulaire. Aucune issue Handbook n'existe encore : à créer à l'ouverture du train |
| **Hors périmètre** | Texte de règle, qu'on ne reproduit pas : `implants`, `etiquettes`, `matrice` (Glaces et sécurité, dont la carte « Système et Trace » reste une structure possible plus tard), principes et objectifs du MC. Les titres chromés des PDF sont des images, non reproductibles |
| **Mode**   | **Un seul train** du superviseur (`doc/supervisor.fr.md`), conduit par `ship-train` : `schema-pbta` → `obsidian-handbook` + `lantern` (épingle seule). Tout le code s'écrit avant d'ouvrir le train |
| **Dépendance** | **Ce plan réutilise l'infrastructure du plan Masks** (`../2026_10_07_masks-2e-integration/`, phases 2 à 4) et partage avec le plan Monster of the Week (`../2026_10_08_motw-2e-integration/`) la façon d'ajouter des cibles neuves. Brique absente de `origin/main` au moment d'exécuter : la reprendre de Masks, pas la réécrire. Si Monster of the Week est déjà passé, ses blocs et sa sous-structure partagée servent de modèle |
| **Ordre**  | **1. Écrire, sans train ni commit** : worktrees (phase 1, tâche 1), `schema-pbta` (phases 2 et 3), épingle locale (phase 4, tâches 1 et 2), blocs et layout (phases 5 et 6), essai au coffre (phase 7, tâche 1). **2. Livrer** : restaurer l'épingle, préparer les versions, ouvrir le train, poser le travail, valider le rendu, `ship` |
| **Exécution** | Dans les worktrees du superviseur, dossier `<W>` libre au moment d'exécuter, créé par `pnpm supervise worktree <W>` (jamais `git worktree add`, jamais de branche). Tout chemin se lit sous `<W>/<dépôt>`, toute commande `pnpm supervise` part de `<W>/obsidian-handbook` avec `--root <W>`. Aucun worktree n'est supprimé |
| **Versions** | Aucune version écrite en dur : **v\<N>** est le contrat publié au départ de la phase 2, **v\<N+1>** la majeure que le train ouvre. Rattachement à décider à l'ouverture : même majeure que Masks et Monster of the Week (un seul contrat porteur de trois jeux, si leurs trains sont encore à ouvrir) ou majeure d'après. Hypothèse de travail : ne pas retarder Masks, passer après lui. Une finale publiée est immuable |
| **Skills** | `ship-train` invoqué une fois le code écrit (`board`, `prepare`, `preview`, `ship`, `repair`) ; l'écriture se fait avant, sans train |

## Phases

| #   | Phase                                                        | File                         |
| --- | ------------------------------------------------------------ | ---------------------------- |
| 1   | Créer les worktrees, puis (code écrit) ouvrir le train       | [`phase-1.md`](./phase-1.md) |
| 2   | schema-pbta : contrat du livret et des cinq cibles neuves    | [`phase-2.md`](./phase-2.md) |
| 3   | schema-pbta : présentation et apparence du pack (fond blanc, polices, jetons, primitives) | [`phase-3.md`](./phase-3.md) |
| 4   | Adoption par Handbook et Lantern (épingle locale), puis versions et pose du travail | [`phase-4.md`](./phase-4.md) |
| 5   | Handbook : blocs matrice, mission et cartes de MC            | [`phase-5.md`](./phase-5.md) |
| 6   | Handbook : layout du livret de PJ                            | [`phase-6.md`](./phase-6.md) |
| 7   | Essayer au coffre, puis valider le rendu et livrer le train  | [`phase-7.md`](./phase-7.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| https://openfontlicense.org/ofl-faq/ | Compression WOFF2 pure permise sous un nom réservé ; sous-ensemblage ou instanciation = version modifiée |
| https://raw.githubusercontent.com/google/fonts/main/ofl/michroma/OFL.txt | Candidate de titre (Microgramma) : à relire au moment d'exécuter |
| https://raw.githubusercontent.com/google/fonts/main/ofl/jura/OFL.txt | Candidate de corps (Eurostile) : à relire |
| https://raw.githubusercontent.com/google/fonts/main/ofl/exo2/OFL.txt | Candidate de corps ou de chiffres : à relire |
| Polices d'origine du VF : Eurostile, Microgramma | **Non libres, jamais redistribuées** ; remplacées. Relevées par `pdffonts` sur les PDF de `_sources/vf` |

## Decisions

| Decision | Why |
| -------- | --- |
| Six cibles au total : le livret étend `the-sprawl-playbook` ; `-matrix`, `-mission`, `-threat`, `-corporation`, `-resource` sont neuves, chacune un objet strict autonome | Règle `<pack.id>-<type>` du plan Masks ; un objet autonome interdit à une cible d'accepter les témoins d'une autre. Une cible à trois variantes aurait un schéma à champs conditionnels, que `z.strictObject` sans `.refine()` ne sait pas dire. Les trois cartes de MC partagent un sous-schéma privé (nom, piste horaire, description) |
| Deux blocs pour la matrice et la mission (`sprawl-matrix`, `sprawl-mission`), **un seul bloc `sprawl-card`** qui lit les trois cartes de MC selon la cible | Une carte de MC n'a pas d'autre usage qu'être une carte ; trois blocs de plus chargeraient les menus. Capacités `block:*` et gabarits d'insertion par cible. À confirmer à l'écriture si la lecture des captures montre trois rendus trop différents |
| Primitive « piste horaire » (six segments 15h, 18h, 21h, 22h, 23h, 24h) définie une fois, partagée entre le livret (Blessure), les menaces et les corporations ; primitive hexagone partagée entre stats, liens, console cybernétique et Cred/XP | Précédent du plan Masks pour les primitives de présentation ; le contrat nomme la primitive (`data-primitive`), la feuille du pack en porte la forme. Une seule définition par primitive dans `layout.css` |
| Habillage « blanc + substituts libres » : fond blanc, accent bleu glace et orange du VF à la place du magenta et du sarcelle actuels, clair seul | Décision de l'utilisateur (2026-10-08). Teintes réglées au coffre |
| Polices : substituts SIL OFL (famille Michroma, Jura, Exo pour Microgramma et Eurostile) choisis au coffre sur un rendu côte à côte | Eurostile et Microgramma ne sont pas redistribuables ; déclarées dans `pack.json` (`assets.fonts`), aucune embarquée dans Handbook |
| Tout en français, anglais seulement si l'i18n le gère | Même décision que pour Monster of the Week ; `labelDictionary` ne porte qu'une chaîne par clé |
| La géométrie (cartes à coins coupés, hexagones, pistes, cadres) est publiée par le pack (`layout.css`, `page.css`) ; Handbook n'écrit aucun SCSS pour The Sprawl | Décision déjà prise pour Masks ; `dist/styles.css` ne doit pas bouger. Les coins coupés et les hexagones passent par `clip-path`, jamais par des images |
| Livret A4 paysage recto/verso : illustration pleine hauteur à gauche du recto, c'est une image de la note, hors du bloc | Lu sur `livret1` ; la règle « une rangée = une face » ne vaut que pour le livret |
| Aucun callout propre | Aucun callout n'est visible dans les captures ; vérifier les callouts génériques sur fond blanc (phase 3) |
| Accroches `data-region`, `data-primitive`, `data-face`, `data-row`, `data-column` aux valeurs du contrat publié | Contrat inter-dépôts, prouvé des deux côtés contre le contrat |
| Gardes de Handbook : un rôle, jamais un chiffre ; cases à cocher en `align-items: flex-start` | `assert:guards-by-role`, leçon de #89 |
| Lantern écrit un vrai gabarit du livret (aperçu + éditeur) en plus de l'épingle | **Corrigé à l'exécution (2026-10-09)** : `assert:presentation-coverage` impose que chaque région et chaque champ d'un contrat de présentation soit dessiné et éditable ; modèle : gabarit Monster of the Week. Les cinq cibles de MC et la matrice restent non éditables dans Lantern |
| Contrats de présentation générés, jamais édités ; tout le code avant le train ; épingle locale jamais commitée | Décisions du plan Masks, reconduites |
| Rattachement de majeure : le code est écrit sur la majeure v12 que porte Monster of the Week (non publiée) ; The Sprawl s'y rattache. À trancher à l'ouverture du train, une fois Monster of the Week livré (même majeure ou majeure d'après) | Masks v11 est publié ; MotW v12 ne l'est pas. Le contrat local de travail est donc v12 |
| Les cinq cartes partagent un squelette (`sprawlCardPresentationSchema` : rangées de 1 à 3 colonnes, `outsideCard` = régions `context`) ; le livret a son schéma propre à faces recto/verso, avec l'en-tête `sprawl-header` commun aux deux faces | Écrit en phases 2 et 3 ; le rendu des cartes réutilise `section()`/`renderCard()` de `motwShared.ts` |
| Polices : Michroma, Jura et Exo 2 en sous-ensemble latin (Fontsource), publiées par le pack ; aucune embarquée dans Handbook | `dist/styles.css` reste sous la limite (158 161 octets) |
| Le bloc `sprawl-card` essaie threat, corporation puis resource : une corporation et une resource vierges sont ambiguës mais se dessinent pareil | Prouvé par `assert:sprawl-layout` |
