# Séparer le contrat hôte des schémas de jeu sans cycle de publication

- Date: 2026-09-15
- Status: Accepted

## Context

Handbook doit rester publiable sans embarquer ni épingler chaque dépôt de jeu,
tandis qu'un schéma externe doit pouvoir prouver sa compatibilité avec une
version immuable de l'hôte. Dupliquer palettes, assets ou géométrie entre les
dépôts rendrait leur propriété ambiguë.

## Decision

Les dépôts de schéma possèdent valeurs, fontes, textures et motifs ; Handbook
possède comportement, sélecteurs et géométrie. `npm run check` reste indépendant
des jeux optionnels. Les assertions croisées reçoivent explicitement le checkout
du schéma, et la CI du schéma teste le tag Handbook dérivé de
`minimumHandbookVersion`. Une évolution coordonnée publie d'abord un hôte
rétrocompatible, puis relève le minimum et publie le schéma.

## Alternatives

Un SHA de schéma stocké dans Handbook recrée une dépendance spécifique et un
cycle de mise à jour. Inclure les assertions externes dans le check core bloque
la release de l'hôte lorsque le dépôt optionnel manque. Mettre la géométrie dans
le pack reviendrait à distribuer du CSS ou du code exécutable externe.

## Consequences

Chaque dépôt conserve un pipeline autonome et la compatibilité croisée reste
testable contre des révisions concrètes. Les nouvelles propriétés visuelles
doivent garder des fallbacks côté hôte jusqu'à la publication ordonnée de la
nouvelle paire de versions.
