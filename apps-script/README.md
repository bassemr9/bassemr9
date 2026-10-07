# Gestionnaire de repas (Google Apps Script)

Interface pour chercher, consulter, ajouter, modifier et supprimer les repas de la feuille **Idee Repas**.

## Installation

1. Ouvrir le Google Sheet **Idee Repas**.
2. Menu **Extensions > Apps Script**.
3. Remplacer le contenu de `Code.gs` par celui du fichier `Code.gs` d'ici.
4. Cliquer sur **+ > HTML**, nommer le fichier `Index` (exactement), et coller le contenu de `Index.html`.
5. Enregistrer (💾), puis recharger le Google Sheet.
6. Un menu **🍽️ Repas** apparaît : **Ouvrir le gestionnaire** (la première fois, Google demande l'autorisation).

> Si l'onglet des repas ne s'appelle pas `Feuille 1`, changer la constante `NOM_FEUILLE` en haut de `Code.gs`.

## Onglet « Ingrédients »

Au premier chargement, le script crée un onglet **Ingrédients** et le remplit avec les ingrédients de vos repas :

| INGREDIENT | FAMILLE | SYNONYMES | ICONE |
|---|---|---|---|
| POULET | PROTÉINES | DJEJ | |
| OIGNON | LÉGUMES | BSAL | |

- **FAMILLE** : le groupe affiché dans l'interface (PROTÉINES, LÉGUMES, FÉCULENTS, PRODUITS LAITIERS, ÉPICES & SAUCES, FRUITS, ou toute autre famille que vous inventez). Vide = « À classer ».
- **SYNONYMES** : autres noms du même ingrédient, séparés par `/` (ex. `BSAL`). Ils sont regroupés avec l'ingrédient.
- **ICONE** : facultatif, un emoji pour remplacer l'icône automatique.

Quand un repas contient un ingrédient qui n'est pas encore dans l'onglet, il y est ajouté automatiquement avec une famille proposée (ou vide s'il n'est pas reconnu).

## Fonctions

- Recherche par **nom de repas** et/ou **ingrédient** (sans tenir compte des accents ni des majuscules).
- Filtre par **catégorie** de repas (REPAS, FAST FOOD…) et par **ingrédients**, rangés par **famille** (onglets Protéines, Légumes…), avec le nombre de repas pour chaque ingrédient.
- Fiche détaillée, ajout (code `R00x` automatique), modification, suppression.
- Bouton **Idée au hasard**.

## Option : utiliser sur téléphone

Dans Apps Script : **Déployer > Nouveau déploiement > Application Web** (exécuter en tant que : moi ; accès : moi). Après chaque modification du code : **Déployer > Gérer les déploiements > ✏️ > Nouvelle version > Déployer**.
