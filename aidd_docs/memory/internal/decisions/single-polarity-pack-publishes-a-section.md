# Un pack à une seule polarité publie le papier de ses sections

- Date: 2026-10-07
- Status: Accepted

## Context

`<!-- handbook-mode: alternate -->` … `<!-- /handbook-mode -->` peint une section
dans « l'autre papier du jeu ». Jusqu'ici cet autre papier ne pouvait être que
l'autre polarité : `isModeOffered` exigeait deux polarités et `buildGameStyle`
n'écrivait aucun bloc de section en dessous. Un jeu qui n'imprime qu'un thème —
son livre n'a qu'un papier, mais encadre certains passages sur un fond inversé —
n'avait donc aucun moyen de rendre ces passages, sauf à déclarer une polarité
qu'il n'a pas. Déclarer `dark` pour obtenir une section, c'est offrir au coffre
en thème sombre un jeu entier que personne n'a dessiné : la règle « un pack
déclare ses polarités, il n'en dérive aucune » existe pour l'interdire.

## Decision

Le contrat d'apparence gagne une couche optionnelle `style.section`, réduite à
des jetons `note`. Elle n'est lue que lorsque le jeu tient **exactement une**
polarité effective, surcharges de l'utilisateur comprises (`sectionTokens`,
`src/games/types.ts`). Dans ce cas `alternate` est offert et s'écrit sur
`.brumes--<id> .handbook-mode-alternate`, après les couches du `body`, avec le
même papier que `modeSectionBlock`. Les modes forcés `dark` et `light` restent
refusés à ce jeu : la couche est une valeur de son thème unique, pas une
polarité, et aucun `color-scheme` n'est écrit pour elle. À deux polarités la
couche n'est pas lue, `alternate` reste l'autre polarité, et le jeu le dit une
fois par pack dans le journal (`publishedSection`, `src/games/variants.ts`)
sans rien refuser.

À l'impression, la couche suit le sort d'une couche sombre : sous `@media screen`
tant que `printerFriendly` est actif, écrite nue sinon.

## Alternatives

Un marqueur neuf dupliquerait parseur, post-processeur, export et harnais pour
dire la même chose que `alternate`. Une troisième valeur de `GamePolarity`
contaminerait tout ce qui énumère les polarités (classes de `body`, schéma de
couleur, réglages) pour un besoin qui ne touche qu'une section. Refuser le pack
dont la couche devient illisible ferait perdre son jeu à un coffre qui ajoute
une polarité dans son `overrides.json`.

## Consequences

Le format reste gelé dans le sens qui compte : le champ s'ajoute, rien n'est
renommé, et un style qui ne nomme pas la couche n'en gagne pas — ni à la
lecture, ni à la fusion d'une surcharge, ni à la réécriture du document. Les
noms de jetons de la couche passent par `readPackTokens` comme les autres.

En revanche la couche **n'est pas rétrocompatible pour un pack distribué**. Un
lecteur antérieur tolère un champ inconnu dans un fichier plat `packs/*.json`
(avertissement, reste du pack conservé) mais refuse en entier un plugin de jeu
`packs/<id>/pack.json`, validé strictement. Un pack ne peut donc publier
`style.section` qu'en relevant sa version minimale de Handbook, ou après la
release qui la lit. `assert:custom-packs` tient les deux moitiés de ce constat
sur une couche fictive, pour qu'il se relise à la prochaine couche ajoutée.

Complète `forced-mode-section-paints-a-flat-paper.md` : la texture d'une section
reste le jeton `--brumes-section-texture`, qu'un pack pose désormais aussi bien
dans cette couche que dans celle d'une polarité.
