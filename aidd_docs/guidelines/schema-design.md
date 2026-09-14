# Le schéma dépositaire du design

> Ce que doit un format au schéma, et ce que doit un pack de jeu.
> Écrit le 2026-09-08, puis aligné sur les contrats externes v1 le 2026-09-14.

## Le constat

La règle est née quand six blocs fencés lisaient et écrivaient leurs schémas de
façons différentes. Elle couvre désormais plusieurs propriétaires de contrat :
Mist Engine publie 14 cibles canoniques dont Handbook rend 12, tandis
qu’Adrenaline et PbtA gardent leurs propres intégrations. La question n’est donc
plus seulement « ce bloc a-t-il un schéma ? », mais aussi « quel dépôt possède
ce schéma et son corpus ? ».

## La checklist d'un format

Un format fencé neuf porte **quatre obligations**. Aucune n'est facultative,
aucune ne dépend de l'existence d'un amont.

1. **Un schéma publié.** La forme du document est décrite dans un dépôt de
   schéma, pas seulement dans un type TypeScript. Un consommateur qui n'est pas
   Handbook doit pouvoir lire et écrire le format sans lire notre code.
2. **Une lecture TOML tolérante.** `parse<Format>Document(source)` est tenté
   avant la grammaire terse. Il rend `null` sur le moindre échec, ce qui laisse
   la grammaire reprendre la main. Rien ne jette, rien ne valide.
3. **Une commande de copie.** `loadCopyAsTomlCommand` expose « copier comme
   TOML » pour le bloc sous le curseur. C'est ce qui rend un bloc transportable
   vers Lantern ou vers un autre outil.
4. **Une forme en zones nommées.** Le bloc déclare la liste ordonnée de ses
   zones et le rôle d'image que chacune porte. Le renderer pose les zones, le
   SCSS les habille.

Les quatre sont vérifiées par les harnais de corpus (`pnpm assert:corpus` et,
pour Mist, `pnpm assert:mist-contract`), pas seulement écrites ici. Une règle
que rien ne contrôle reproduit d'un cran plus haut la défaillance qu'elle
corrige.

## Zéro exemption

**Un format sans amont invente sa forme ; il n'est pas dispensé.**

`litm-journey` et `litm-theme-kit` n'ont aucune forme publiée en amont. C'est
exactement pour ça qu'ils doivent en publier une : le premier à décrire un
format en devient l'auteur, et un format que personne ne décrit reste
inutilisable hors de Handbook.

La dispense accordée hier — « un voyage et un kit n'ont pas de forme en amont,
donc rien à copier » — est précisément ce qui a produit l'écart mesuré.

## La frontière : valeurs, forme, pixels

Trois couches, et rien ne traverse.

| Couche      | Tenue par                    | Dit                                     |
| ----------- | ---------------------------- | --------------------------------------- |
| **Valeurs** | le schéma de contenu         | ce qu'il y a dans le bloc               |
| **Forme**   | le schéma, en zones nommées  | quelles zones, dans quel ordre, quel rôle d'image |
| **Pixels**  | le SCSS                      | où, de quelle taille, de quelle couleur |

Conséquences pratiques :

- **Le schéma ne sérialise jamais de CSS.** Une zone porte un nom et un rôle,
  pas une déclaration `grid-template-areas`. Sérialiser du CSS rendrait le
  schéma dépendant d'un moteur de rendu, donc inutilisable par un consommateur
  qui dessine autrement.
- **Le SCSS ne lit rien.** C'est le renderer qui pose la classe dérivée du nom
  de la zone ; le partial la cible. Le sens de la dépendance est à sens unique.
- **Un rôle d'image absent dégrade.** La zone se rend à plat
  (`missingAssetClass`), elle ne réserve pas une boîte vide pour une image qui
  ne viendra pas.

## Polarité : un pack déclare, il ne dérive pas

Un pack de jeu déclare **quelles polarités il supporte**.

- **Deux polarités sourcées** (City of Mist : des fonds de maquette blancs, des
  noirs) → le réglage d'Obsidian ou de Handbook tranche, et tout le coffre suit.
- **Une seule polarité sourcée** → elle s'applique quel que soit le réglage.
- **Aucune** → aucune n'est dérivée, aucune n'est inventée.

Il n'y a **pas d'attribut de polarité par gabarit** : la polarité est une
propriété du pack, pas d'un bloc.

La variante manquante ne dégrade pas vers `base`. Un pack dont le `base` est
fortement clair casserait un coffre en thème sombre.

Rappel qui mord : les variantes s'écrivent en **sélecteur composé**
(`.brumes--<jeu>.theme-dark`), jamais `.theme-dark` seul. Les deux classes sont
sur le même `body` ; à spécificité égale, seul l'ordre des feuilles trancherait,
et rien ne garantit que la nôtre passe après celle du thème actif.

## Strict d'un côté, tolérant de l'autre

Les deux camps ne font pas le même travail, et c'est voulu :

- **Le schéma rejette.** Un document qui ne respecte pas la forme est refusé par
  la validation ajv du dépôt de schéma.
- **Le consommateur dégrade.** `schemaValues.ts` ne valide rien : un document
  qui se trompe de champ **perd ce champ** plutôt que d'échouer à se rendre.
  `fromSchema.ts` fait pareil pour un pack : un champ inconnu laisse un
  avertissement **une fois par session**, une valeur fautive se perd elle-même,
  le reste s'applique.

**Le même corpus alimente les deux assertions.** Un cas de refus prouve que le
schéma rejette ; le même document prouve que le consommateur dégrade sans
casser. Deux corpus séparés dériveraient l'un de l'autre.

Le corpus vit chez le propriétaire du contrat. Pour Mist Engine, Handbook lit
directement `corpus/contract/cases.json` depuis le package immuable
`schema-in-the-mist` v1.0.0 : `canonical` porte le verdict strict et `handbook`
le verdict tolérant. Handbook ne conserve aucune copie de ces cas. Un format
possédé ici, ou dont l’intégration ne publie pas encore de manifeste partagé,
utilise le corpus local sous `corpus/`.

Un package distribué comme asset GitHub Release garde dans chaque lockfile
l’URL publique immuable et une intégrité ; une URL de redirection signée sous
`release-assets.githubusercontent.com` n’est jamais un verrou, car son jeton
expire. L’assertion du contrat contrôle `specifier`, `version`, `tarball` et
intégrité hors ligne. Une installation figée depuis un store vide prouve
séparément que ce verrou sait encore télécharger l’asset.

Le corpus a deux moitiés, et les deux sont nécessaires :

- **refus** : des documents qui doivent être rejetés ;
- **témoins** : des documents qui doivent passer.

> « Sans le témoin, une série de refus ne prouve rien — un schéma qui rejette
> tout les passerait tous. » (`schema-adrenaline`, `tools/audit-schemas.ts`)

## Langue

- **L'anglais existant reste.** Le code, les commentaires, le README et les
  schémas déjà écrits en anglais ne sont pas migrés.
- **Le nouveau contenu est français d'abord.** Ce sont des outils français ; le
  multilingue n'est pas au programme.
- **La règle s'applique par schéma, pas par champ.** Un schéma est en anglais ou
  en français, jamais moitié-moitié.

## Une couleur : au pack ou au SCSS ?

Depuis que les packs possèdent le rendu, une couleur a **deux maisons** et une
seule est la bonne. La règle générale est écrite en tête de
`src/styles/styles.scss`, et elle tient en une ligne de partage :

- **ce qui habille la page** — le papier, l'encre, les liens, une marque de
  surligneur sur un mot, une table, une case à cocher — appartient au **pack**,
  parce que chaque note le porte quoi qu'on y écrive, que ça change d'un jeu à
  l'autre et d'une polarité à l'autre, et qu'un lecteur peut vouloir le changer
  dans `overrides.json` ;
- **ce qui tient à l'anatomie d'un bloc** — l'accent d'une carte Mythos, la
  teinte d'un panneau de danger — reste dans le **SCSS**, parce qu'un pack
  atteint déjà un bloc par `shapes` : deux portes vers le même bloc seraient
  deux vérités sur lui.

Trois familles échappent des deux côtés, et c'est mesuré, pas supposé :

- un vocabulaire qu'**Obsidian possède** et qu'un pack ne peut pas énumérer
  (`data-callout`) : un jeton par type serait vingt noms pour rien ;
- une **texture accordée au fond derrière elle** — un bord pressé sur du
  parchemin : la scinder en deux jetons ferait flotter le liseré ;
- un document que les propriétés du pack **n'atteignent pas**. Une carte de
  canvas ouvre sa note dans une iframe : une règle qui cible
  `.canvas-node-iframe-body[…]` ne lit aucun jeton, alors qu'une règle qui cible
  `.canvas-node[…]` seul est un descendant ordinaire de `body` et les lit tous.
  Dans le premier cas, la duplication est le prix à payer, et il se dit.

Ce qui peut devenir un jeton **le devient**. La phase 6 du plan
`2026_09_08_schema-design-guidelines` a fait sortir trois défauts rien qu'en
posant la question fichier par fichier : des tables écrites en aveugle dans un
jeu qui déclare deux polarités (coffre sombre = en-tête beige à encre noire), et
deux valeurs écrites à la main qui ratent de peu un jeton déjà déclaré et lu par
personne.

## L'échappatoire SCSS

Certains cas ne se laissent pas exprimer en jetons : une découpe, un masque, une
géométrie qui n'a pas de nom. L'échappatoire est **autorisée**, à deux
conditions :

1. elle est **déclarée** — le partial dit qu'il sort du modèle de jetons ;
2. elle est **motivée** — le partial dit pourquoi le jeton ne suffisait pas.

Une échappatoire silencieuse redevient de la dette de forme. Le motif se met
**en tête du partial**, pas à côté de la valeur : un lecteur doit savoir avant de
lire le fichier pourquoi il n'y trouvera pas que des `var()`.

Et jamais de recopie de géométrie entre partials : extraire un `@mixin`, puis
l'`@include`. Jamais dupliquer les valeurs, jamais dupliquer l'image.

## Ajouter un bloc, concrètement

1. une entrée dans `BRUMES_BLOCKS` (`src/features/blocks/registry.ts`) ;
2. un booléen dans `BrumesFeatureSettings` + un `Setting` dans l'onglet ;
3. un partial SCSS ;
4. **les quatre obligations de la checklist ci-dessus** ;
5. un témoin et un cas de refus dans le corpus du **propriétaire du contrat** :
   dans le package externe quand il publie un manifeste partagé, sinon dans le
   corpus local de Handbook.

Deux règles de compatibilité qui ne souffrent pas d'exception :

- renommer un bloc = garder l'ancien id dans `aliases` (le registre logue la
  dépréciation **une fois par session**, pas une par rendu) ;
- **ne jamais renommer une clé de `features.*`** : elle est écrite dans le
  `data.json` de l'utilisateur. `theme-card` garde donc `flag:
  "storyThemeParser"`.

## Ce que cette page ne tranche pas

`isBlockEnabled` exige `settings.mode === block.mode` : **un bloc appartient à
exactement un jeu.** Partager un format entre gammes demande un refactor que
cette guideline ne porte pas, mais qu'Adrenaline et PbtA rendront nécessaire.
