# Brumes complet sur les trois jeux

Brumes rend aujourd'hui Legend in the Mist en entier — thème visuel et quatre blocs fencés — tandis que City of Mist n'a qu'un thème sans aucun bloc et que :Otherscape n'a rien du tout, son `index.scss` se réduisant à un commentaire TODO. L'objectif est de fermer les deux trous : donner à City of Mist les blocs qui lui manquent, puis construire :Otherscape de zéro, thème et blocs. Le fork sert à préparer et tester localement ; les changements remontent ensuite en PR chez 4rtamis, une branche par sujet.

Contrainte de tête : le thème City of Mist existant doit continuer à fonctionner à l'identique. Tout ce qui s'ajoute est additif — nouveaux partials, nouveaux `@use`, nouvelles clés `features.*` — et aucune clé de réglage existante n'est renommée, puisqu'elles sont écrites dans le `data.json` des utilisateurs.

## Ce qui est clair

- Quatre blocs neufs : `com-theme-card` et `com-danger` pour City of Mist, `os-theme-card` et `os-challenge` pour :Otherscape. Les variantes Crew, et Loadout côté :Otherscape, sont des valeurs de la première ligne du bloc, pas des blocs séparés.
- La première ligne d'une carte de thème porte le themebook, et ce seul mot type tout le reste : Mythos ou Logos côté City of Mist (donc Mystery ou Identity, Fade ou Crack), Self, Mythos ou Noise côté :Otherscape (donc Identity, Ritual ou Itch).
- Les conventions d'écriture existantes sont reprises telles quelles : `{tag}` pour un power tag, `{!tag}` pour une weakness, `>` pour une conséquence, `:` pour une description. Une seule notation nouvelle, `~{tag}` pour un tag brûlé — City of Mist et :Otherscape en ont besoin, Legend in the Mist non.
- Les pistes — Fade, Crack, Decay, Upgrade — sont purement décoratives. Leur état s'écrit dans le texte du bloc (`fade: 2/3`). Le plugin ne réécrit jamais une note.
- `os-challenge` reprend l'essentiel du parser `litm-challenge` : mêmes Limits à progression, mêmes tags, mêmes menaces ; seuls les mots-clés de section changent.
- `com-danger` calque la même forme sur les Danger profiles : description, spectrums (tag descriptif plus un maximum de 1 à 6), et moves soft, hard ou custom.
- Les cartes City of Mist se dessinent en CSS pur, avec les fontes et la palette déjà présentes. Pas d'illustrations inlinées, contrairement aux cartes Legend in the Mist qui pèsent 2,5 Mo de data URI.
- Le thème :Otherscape reçoit des fontes libres sous licence OFL, choisies et inlinées comme pour les deux autres jeux — la licence doit rester propre pour une PR sur un dépôt public.
- L'ordre de travail : les deux blocs City of Mist d'abord, complets et testés dans le vault, avant d'ouvrir :Otherscape.

## Encore ouvert

- La carte de personnage :Otherscape — Essence, Evolution, Moments of Evolution, relations d'équipage — est écartée pour l'instant : c'est la fiche entière, sans équivalent dans les deux autres jeux, et elle se tient mieux en Markdown entourant plusieurs cartes de thème. À rouvrir sur demande.
- Le rendu d'un `litm-challenge` laisse des vides dans sa grille (`repeat(auto-fit, minmax(15rem, 1fr))`). Piste : passer en multi-colonnes avec `break-inside: avoid`. Vaut aussi pour `com-danger` et `os-challenge`, qui hériteront de la même mise en page.
- Le découpage exact en PR côté :Otherscape : le thème en une seule branche, ou séparé entre la typographie et le reste.
- Combien des 14 themebooks de chaque jeu méritent une couleur ou un ornement propre, plutôt que le seul contraste de catégorie.

## Prochaine étape

Écrire le parser, le rendu, le partial de style et le réglage de `com-theme-card`, le vérifier sur une vraie carte dans le vault, puis enchaîner sur `com-danger`.
