---
status: pending
---

# Instruction: Polarités déclarées et skin

> **Cette phase ne dépend pas d'un dépôt tiers**, pour la même raison que la
> phase 5 : `fromSchema.ts` peut lire une déclaration de polarité avant que
> `game-pack.schema.json` la décrive. L'issue de publication reste à ouvrir, elle
> ne bloque rien ici.

## Architecture projection

```txt
.
├── src/games/
│   ├── types.ts                       ✏️ GamePack déclare les polarités qu'il supporte
│   ├── fromSchema.ts                  ✏️ lit la déclaration, n'en dérive aucune
│   ├── city-of-mist.ts                ✏️ déclare clair et sombre : les deux sont sourcées
│   ├── legend-in-the-mist.ts          ✏️ déclare ce qui est sourcé, rien de plus
│   └── otherscape.ts                  ✏️ idem
├── src/features/modes/
│   └── styleElement.ts                ✏️ n'écrit une couche que si le pack la déclare
├── src/settings/
│   └── index.ts                       ✏️ l'onglet dit ce que le jeu actif supporte
└── src/styles/*/                      ✏️ chaque échappatoire SCSS gagne son motif écrit
```

## User Journey

```mermaid
flowchart TD
  A[Le pack déclare ses polarités] --> B{Combien ?}
  B -->|deux sourcées| C[Le réglage Obsidian tranche, tout le coffre suit]
  B -->|une seule| D[Elle s'applique quel que soit le réglage]
  B -->|aucune| E[Seule la couche base est écrite]
  C --> F[Sélecteur composé : .brumes--jeu.theme-dark]
  D --> F
  E --> F
```

## Tasks to do

### `1)` Déclarer les polarités

1. `GamePack` gagne la liste des polarités supportées.
2. City of Mist déclare clair **et** sombre : les pages de maquette blanches et
   noires les sourcent toutes les deux.
3. Les autres packs déclarent ce qui est réellement sourcé — **rien n'est dérivé,
   rien n'est inventé**.
4. `fromSchema.ts` lit la déclaration ; un pack muet ne se voit attribuer aucune
   polarité par défaut.

### `2)` Faire respecter la déclaration à `buildGameStyle`

1. Une couche non déclarée n'est **pas écrite**, plutôt qu'écrite en copie de `base`.
2. Une seule polarité déclarée : elle s'applique quel que soit le réglage du thème.
3. **Garder les sélecteurs composés** — `.brumes--<jeu>.theme-dark`, jamais
   `.theme-dark` seul. Les deux classes sont sur le même `body` : à spécificité
   égale seul l'ordre des feuilles trancherait, et rien ne garantit que la nôtre
   passe après celle du thème actif.
4. `sanitizeValue` continue de nettoyer `{};<>` sur toute valeur venue d'un pack.
5. Vérifier que `GameStyleWriter` nettoie toujours les fenêtres Obsidian détachées.

### `3)` Dire au réglage ce que le jeu supporte

1. L'onglet vit dans `src/settings/index.ts` — il n'y a pas de `tab.ts` ; le
   dossier tient `canvasSnippets.ts`, `index.ts` et `types.ts`.
2. Il indique les polarités du jeu actif, comme il liste déjà les illustrations
   manquantes.
3. Un jeu à polarité unique le dit, pour qu'un thème sans effet ne passe pas pour
   un bug.
4. **Sentence case** sur les chaînes d'interface ; ne pas y placer de nom propre
   de jeu — `eslint-plugin-obsidianmd` veut l'abaisser, autant écrire la phrase
   autrement que désactiver la règle.

### `4)` Déclarer les échappatoires SCSS

1. Parcourir les partials par jeu et repérer ce qui ne passe pas par un jeton.
2. Chaque échappatoire gagne un commentaire en tête disant **pourquoi un jeton ne
   suffisait pas** — un partial muet est une dette invisible.
3. Ce qui peut devenir un jeton le devient ; ce qui ne le peut pas se justifie.
4. Lire ces fichiers par `grep -n … -A n` ou `sed -n`, **jamais par `cat`**.

### `5)` Vérifier

1. `rm -f src/__assert_*.ts __assert_*.cjs`, puis `rtk proxy pnpm build`.
2. `./node_modules/.bin/eslint src --ext .ts` à zéro erreur, **et** `pnpm lint`
   (soit `eslint .`) vert.
3. `pnpm assert:corpus` vert.
4. Basculer le thème d'Obsidian dans chaque coffre et observer les trois jeux.
5. Déployer sans écraser le `data.json` de chaque coffre.

## Test acceptance criteria

| Task | Acceptance criteria                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | Chaque pack déclare ses polarités, et aucune n'a été inventée pour combler un trou                                            |
| 2    | Basculer le thème change le rendu de City of Mist ; un pack à polarité unique reste stable au lieu de dégrader vers `base`     |
| 3    | Le réglage dit ce que le jeu actif supporte, sans qu'on ait à ouvrir le code pour le savoir                                    |
| 4    | Aucun partial ne contourne les jetons sans dire pourquoi                                                                      |
| 5    | Build vert, les deux portées de lint à zéro, corpus vert, les trois jeux corrects dans les deux thèmes, `data.json` intact     |
