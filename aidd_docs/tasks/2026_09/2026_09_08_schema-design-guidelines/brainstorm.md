# Le schéma comme dépositaire du design

> Idée affinée, approuvée le 2026-09-08. Source du plan voisin.

## Le constat qui déclenche tout

L'assert du 2026-09-08 a mesuré six blocs fencés. Deux lisent le TOML du schéma
(`litm-challenge`, `com-danger`), trois savent l'écrire (les deux précédents plus
`theme-card`), et `com-theme-card` ne fait ni l'un ni l'autre — alors qu'il a été
ajouté dans le même lot que `com-danger`, qui, lui, a la chaîne complète.

La cause n'est pas la négligence : c'est **l'absence de règle écrite**. Rien dans
le dépôt ne dit ce qu'un bloc doit au schéma. Deux blocs voisins écrits le même
jour divergent donc sans que personne ne l'ait décidé.

## Ce que le schéma porte aujourd'hui

Deux familles, volontairement disjointes :

- **le contenu** — `com-danger`, `challenge`, `theme-card` : ce qui est joué ;
- **l'apparence** — `appearance/game-pack.schema.json` : jetons de style, assets,
  et *rien* de ce qui est joué. Pas même un `meta` partagé.

`game-pack` décrit des **valeurs** (couleurs, polices, images par rôle). Il ne
décrit aucune **forme**. La forme vit dans le SCSS, donc dans le plugin, donc
hors du schéma : un consommateur qui n'est pas Handbook ne peut pas dessiner une
carte de thème de City of Mist, il ne peut que la repeindre.

## Ce qui est décidé

### 1. Vocabulaire de zones nommées

La forme d'un bloc s'exprime en **zones nommées, leur ordre, le rôle d'image que
chacune porte**. Le SCSS garde les pixels ; le schéma garde le squelette et le
sens.

Le **même vocabulaire décrit une page entière** : une maquette de note est un
bloc plus grand. Pas de second vocabulaire pour le skin d'Obsidian.

### 2. Forme par défaut sur le bloc, override par le pack

Le bloc porte sa forme par défaut. Un pack de jeu peut la surcharger **zone par
zone**, comme `overrides.json` surcharge déjà les jetons. Un pack qui ne dit rien
hérite de la forme du bloc.

### 3. Zéro exemption

Tout bloc a un schéma, une lecture TOML et une commande de copie — y compris
`litm-journey` et `litm-theme-kit`, dont la forme n'existe pas en amont. Pour
ceux-là **on invente la forme** plutôt que de leur accorder une dispense : une
dispense est exactement ce qui a produit l'écart mesuré.

### 4. Polarités déclarées

Un pack déclare **quelles polarités il supporte**.

- Deux polarités sourcées (City of Mist : pages de maquette blanches *et* noires)
  → le réglage Obsidian / Handbook tranche, tout le coffre suit.
- Une seule sourcée → elle s'applique quel que soit le réglage.
- Aucune n'est dérivée, aucune n'est inventée.

**Pas d'attribut de polarité par gabarit.** Une page noire du livre alimente la
variante sombre du jeu ; elle ne devient pas un « type de page noire ».

### 5. Skin d'Obsidian : jetons d'abord, SCSS déclaré ensuite

L'essentiel du skin passe par des jetons. Les cas tordus gardent une échappatoire
SCSS, mais **déclarée et motivée** — un partial muet est une dette invisible.

### 6. Le schéma d'apparence prend son propre dépôt

`game-pack` ne partage rien avec les schémas de contenu et sert désormais des
jeux qui ne sont pas de Son of Oak. Il n'a plus sa place dans
`schema-in-the-mist`.

### 7. Les guidelines couvrent tous les dépôts de schéma

`schema-in-the-mist`, `schema-adrenaline`, `schema-pbta` partagent déjà le même
modèle (Zod → JSON Schema généré → validation ajv, mêmes devDeps, mêmes scripts).
Ce n'est pas une convergence de cultures à négocier, c'est une **pollinisation
croisée de trois outillages** : `audit-schemas.ts` n'existe que chez adrenaline,
`validate:refs` que chez pbta.

### 8. Corpus de test généralisé, consommé des deux côtés

Le corpus (refus + témoins) sert aux **schémas** et aux **consommateurs**. La
tension à tenir : le schéma **rejette**, le plugin **dégrade volontairement**.
Les mêmes documents doivent donc alimenter deux assertions opposées.

Le motif d'adrenaline vaut d'être gardé mot pour mot :

> Sans le témoin, une série de refus ne prouve rien — un schéma qui rejette tout
> les passerait tous.

### 9. Langue

Pas de migration. Ce qui existe en anglais reste en anglais ; le nouveau contenu
est français d'abord. La règle s'applique **par schéma**, pas par champ.
