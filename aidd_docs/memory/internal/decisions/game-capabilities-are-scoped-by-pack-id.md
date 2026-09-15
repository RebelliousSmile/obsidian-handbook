# Rattacher chaque capacité à l'identifiant du jeu

- Date: 2026-09-15
- Status: Accepted

## Context

La présence d'une capacité dans un catalogue global ne prouve pas que le mode
qui la réclame active réellement son renderer ou son style. Un pack pouvait
ainsi emprunter une capacité implémentée pour un autre jeu.

## Decision

Le support est indexé par `pack.id`. Toute capacité non vide doit appartenir à
ce jeu précis ; un jeu inconnu reste accepté uniquement avec `requires: []`.
La cohérence avec les blocs enregistrés est vérifiée par les harnais afin de ne
pas créer de cycle d'initialisation dans le runtime.

## Alternatives

Un tableau global de capacités autorise les emprunts inter-jeux. Dériver le
registre directement des renderers crée un couplage d'initialisation. Refuser
tous les packs inconnus empêcherait les thèmes purement déclaratifs.

## Consequences

Un manifeste ne peut annoncer que les comportements réellement activables sous
son propre mode, avec un diagnostic qui distingue capacité inconnue et capacité
possédée par un autre jeu. L'ajout d'un renderer ou d'un style impose de mettre
à jour le registre et son assertion de cohérence.
