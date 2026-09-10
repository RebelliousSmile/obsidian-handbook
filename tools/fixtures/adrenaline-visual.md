# Dossier 17 — Station Aurore

Ce témoin est un contenu fictif créé pour contrôler la composition Adrenaline.
Il ne reproduit ni texte ni page d’un ouvrage publié. Il couvre le corps courant,
un [lien de contrôle](https://example.com), du `code en ligne` et #signal-test.

## Situation

La station est silencieuse. Le groupe doit sécuriser trois zones avant la nuit :

- vérifier les accès ;
- remettre la radio en service ;
- consigner chaque incident.

### Relevé

| Zone | État | Priorité |
| --- | --- | ---: |
| Quai | ouvert | 2 |
| Atelier | incertain | 1 |

```txt
canal: AURORE-7
statut: surveillance
```

> [!info] Information
> Le plan de ronde est affiché près de l’entrée.

> [!success] Succès
> La liaison avec l’équipe extérieure est rétablie.

> [!question] Question
> Qui a déplacé la caisse de balises ?

> [!warning] Avertissement
> La passerelle nord ne supporte qu’une personne à la fois.

> [!danger] Danger
> Une alarme silencieuse vient de se déclencher.

> [!example] Exemple
> Une balise orange signifie que la zone reste à inspecter.

> [!quote] Transmission
> « Équipe Aurore, confirmez votre position. »

## Personnage

```adrenaline-pj
nom = "Mara Veld"
[caracteristiques]
for = 30
con = 40
dex = 50
rap = 40
log = 50
vol = 40
per = 60
cha = 30
[sante.physique.superficiel]
base = 6
[sante.physique.leger]
base = 13
[sante.physique.grave]
base = 18
[sante.physique.profond]
base = 23
[sante.mental.superficiel]
base = 6
[sante.mental.leger]
base = 13
[sante.mental.grave]
base = 18
[sante.mental.profond]
base = 23
[protections.physiques]
solidite = 6
[protections.mentales]
solidite = 6
```

## Contact

```adrenaline-pnj
nom = "Jonas Kerl"
niveauDeDanger = 2
description = "Responsable de quart, précis et peu loquace."
[narratif]
role = "Contact de la station"
attitude = "Coopère si le protocole est respecté."
```

## Menace

```adrenaline-monstre
nom = "Écho de maintenance"
typeDeCorps = "silhouette artificielle"
instinct = "isoler"
niveauDeDanger = 4
zoneDeDetection = "30 m"
deplacement = "8 m par action"
actionsParRound = 2
comportement = ["Coupe les lumières.", "Suit la source sonore la plus proche."]
traitsSpeciaux = ["Ignore les portes non verrouillées."]
[caracteristiques]
for = 45
con = 55
dex = 50
rap = 60
```
