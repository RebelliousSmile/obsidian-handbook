---
objective: "Handbook propose le game Adrenaline System, rend ses fiches PJ, PNJ et monstre depuis les trois schémas publiés, et applique les maquettes light et dark attestées par le livre de base de Zombiology."
status: in-progress
---

# Plan: Adrenaline System — game pack et trois fiches

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Ajouter un game Adrenaline générique avec trois blocs TOML interopérables et deux polarités visuelles sourcées. |
| **Source** | Brainstorm validé dans la conversation du 2026-09-09 ; replan après intégration de :Otherscape au snapshot `badea2f` ; dépôt frère `schema-adrenaline` adjacent au checkout principal ; livre `Z1L01_Zombiology__1_Contamination_Ldb.pdf` sous `/home/tnn/Documents/Perso/RPG/zombiology/_sources/regles/`. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1 | Sources visuelles et pack Adrenaline | [`phase-1.md`](./phase-1.md) |
| 2 | Socle documentaire commun | [`phase-2.md`](./phase-2.md) |
| 3 | Fiche PJ | [`phase-3.md`](./phase-3.md) |
| 4 | Fiche PNJ | [`phase-4.md`](./phase-4.md) |
| 5 | Monstre, cohérence et livraison | [`phase-5.md`](./phase-5.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le pack porte l'identité `adrenaline`, pas `zombiology`. | Zombiology publie actuellement le moteur avec son univers, mais les schémas et le rendu doivent servir les futurs jeux Adrenaline. |
| Les identifiants de blocs sont `adrenaline-pj`, `adrenaline-pnj` et `adrenaline-monstre`. | Ils correspondent exactement aux trois cibles publiées tout en évitant les collisions avec des formats génériques futurs. |
| Le TOML conforme à `schema-adrenaline` est l'unique syntaxe des trois nouveaux blocs. | Aucun format historique n'est à préserver et le dépôt frère doit rester la source de vérité des valeurs. |
| Les trois blocs restent séparés et partagent seulement leurs lecteurs et composants réellement communs. | Le PJ, le PNJ et le monstre n'ont ni les mêmes champs requis ni les mêmes zones ; une union affaiblirait le contrat publié. |
| Chaque bloc Adrenaline porte sa forme finale ; le pack n'en répète pas les libellés dans `shapes`. | Ces blocs n'ont pas de forme antérieure à adapter pour un autre game : un override identique au défaut créerait deux vérités sans capacité supplémentaire. |
| Les polarités `light` et `dark` sont toutes deux déclarées et sourcées dans le PDF. | Le livre alterne des pages claires et des registres rouge-noir complets ; aucune polarité n'a besoin d'être dérivée. |
| Le pack porte les couleurs, fontes et tokens de page ; les partials SCSS portent uniquement la géométrie des trois fiches. | Cette frontière respecte l'architecture « un jeu est une donnée » et laisse `overrides.json` personnaliser le game sans dupliquer la forme. |
| Aucune illustration, page ou fonte propriétaire n'est extraite du PDF pour être distribuée. | Le rendu peut reproduire la hiérarchie, la palette et des textures en CSS tout en restant léger et en évitant de publier des actifs Zombiology. |
| Le plugin lit les documents localement sans charger le dépôt frère à l'exécution. | L'interopérabilité vient de la conformité au schéma publié ; le game doit fonctionner hors ligne et dans un coffre autonome. |
| Adrenaline est une entrée simple de `DECLARED_GAMES`, sans `variants` ni `defaultVariantId`. | Les variantes sont des univers propres à :Otherscape ; les polarités light/dark d'Adrenaline appartiennent directement à son pack et `resolveGameVariant` doit donc rendre `null`. |
| La provenance Adrenaline garde ses clés françaises `typeDePublication`, `auteurs` et `licence`. | Le helper `SchemaMeta` existant décrit un autre contrat en snake_case ; le réutiliser renommerait ou perdrait des données publiées. |
| Le total affiché d'une compétence est recalculé lorsque sa caractéristique est disponible ; le total stocké est seulement préservé à la copie. | Draft-7 ne peut pas vérifier cette dépendance et le schéma demande explicitement aux consommateurs de ne pas croire aveuglément la valeur dérivée. |
| Une incohérence sémantique non exprimable en draft-7 est signalée une fois mais ses données restent lisibles et copiables. | Handbook rend une note en cours d'édition : il ne doit ni faire passer une contradiction sous silence, ni détruire une valeur que le schéma publié accepte. |
| La conformité stricte des TOML réémis est vérifiée par un harnais Handbook qui exécute les cibles Zod du dépôt frère `schema-adrenaline`. | Le dépôt source reste l'unique contrat et la vérification croisée ne crée ni dépendance réseau, ni modification du dépôt frère, ni second exemplaire susceptible de dériver. |
