# Gestionnaire de repas (Google Apps Script)

Interface pour chercher, consulter, ajouter, modifier et supprimer les repas de la feuille **Idee Repas**.

## Installation

1. Ouvrir le Google Sheet **Idee Repas**.
2. Menu **Extensions > Apps Script**.
3. Remplacer le contenu de `Code.gs` par celui du fichier `Code.gs` d'ici.
4. Cliquer sur **+ > HTML**, nommer le fichier `Index` (exactement), et coller le contenu de `Index.html`.
5. Enregistrer (💾), puis recharger le Google Sheet.
6. Un menu **🍽️ Repas** apparaît : **Ouvrir le gestionnaire** (la première fois, Google demande l'autorisation).

> Si l'onglet ne s'appelle pas `Feuille 1`, changer la constante `NOM_FEUILLE` en haut de `Code.gs`.

## Fonctions

- Recherche par **nom de repas** et/ou **ingrédient** (sans tenir compte des accents ni des majuscules, plusieurs mots possibles : `tomate poulet`).
- Filtre par **nature** (REPAS, FAST FOOD…).
- Fiche détaillée : ingrédients principaux / facultatifs, astuce, remarque.
- Ajout (code `R00x` généré automatiquement), modification, suppression.
- Bouton **🎲 Idée au hasard** pour choisir un repas.

## Option : utiliser sur téléphone

Dans Apps Script : **Déployer > Nouveau déploiement > Application Web** (exécuter en tant que : moi ; accès : moi). Le lien obtenu ouvre la même interface dans le navigateur du téléphone.
