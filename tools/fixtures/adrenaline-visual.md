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
[[formations]]
nom = "Survie urbaine"
type = "Terrain"
pourcentage = 55
[[formations.competences]]
nom = "Escalade"
pourcentage = 45
caracteristique = "dex"
[equipement]
possessions = ["Radio", "Trousse de secours"]
equipementFavori = "Multitool"
[[equipement.armesPhysiques]]
nom = "Pied-de-biche"
pourcentage = 55
desDeDegats = 2
```

## Contact

```adrenaline-pnj
nom = "Jonas Kerl"
niveauDeDanger = 2
description = "Responsable de quart, précis et peu loquace."
[narratif]
role = "Contact de la station"
attitude = "Coopère si le protocole est respecté."
[caracteristiques]
for = 35
con = 40
dex = 45
rap = 40
log = 55
vol = 50
per = 45
cha = 60
[sante.physique.superficiel]
base = 5
[sante.physique.leger]
base = 10
[sante.physique.grave]
base = 15
[sante.physique.profond]
base = 20
[protections.physiques]
solidite = 3
[[competences]]
nom = "Mécanique"
pourcentage = 60
caracteristique = "log"
[equipement]
possessions = ["Trousseau de clés"]
equipementFavori = "Lampe d'atelier"
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
per = 55
[[competences]]
nom = "Discrétion"
pourcentage = 70
caracteristique = "dex"
[etatAlternatif]
nom = "Surchargé"
declencheurs = ["Entend une alarme"]
zoneDeDetection = "80 m"
deplacement = "12 m par action"
actionsParRound = 3
[equipement]
possessions = ["Harnais de grimpe"]
[[equipement.armesPhysiques]]
nom = "Griffes"
pourcentage = 80
desDeDegats = 3
[contagion]
agent = "Souche A-7"
delaiAvantEffet = "6 à 12 heures"
issue = "La victime devient un rôdeur."
[[contagion.vecteurs]]
nom = "Morsure"
probabilite = 80
[narratif]
role = "Prédateur de maintenance"
attitude = "Hostile mais territorial."
personnalite = ["Patient", "Territorial"]
```
