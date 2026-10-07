/**
 * Gestion des repas — Google Apps Script
 * Feuille attendue : colonnes A..G =
 * CODE | NATURE | LIBELLES | INGREDIENT PRINCIPAL | INGREDIENT FACULTATIF | ASTUCE | REMARQUE
 */

const NOM_FEUILLE = 'Feuille 1';
const COLONNES = ['code', 'nature', 'libelle', 'principal', 'facultatif', 'astuce', 'remarque'];

/** Ajoute un menu "Repas" à l'ouverture du classeur. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍽️ Repas')
    .addItem('Ouvrir le gestionnaire', 'ouvrirGestionnaire')
    .addItem('Ouvrir dans le panneau latéral', 'ouvrirPanneau')
    .addToUi();
}

function ouvrirGestionnaire() {
  const html = HtmlService.createHtmlOutputFromFile('Index').setWidth(1200).setHeight(780);
  SpreadsheetApp.getUi().showModalDialog(html, 'Gestionnaire de repas');
}

function ouvrirPanneau() {
  const html = HtmlService.createHtmlOutputFromFile('Index').setTitle('Gestionnaire de repas');
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Permet aussi de déployer le script en application Web (Déployer > Application Web). */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Gestionnaire de repas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function feuille_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(NOM_FEUILLE);
  if (!sh) throw new Error('Feuille "' + NOM_FEUILLE + '" introuvable.');
  return sh;
}

/** Renvoie tous les repas sous forme d'objets. */
function getRepas() {
  const sh = feuille_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, COLONNES.length).getDisplayValues()
    .map((ligne, i) => {
      const r = { ligne: i + 2 };
      COLONNES.forEach((c, j) => (r[c] = String(ligne[j]).trim()));
      return r;
    })
    .filter(r => r.code || r.libelle);
}

/** Calcule le prochain code libre : R001, R002, ... */
function prochainCode_(repas) {
  const max = repas.reduce((m, r) => {
    const n = parseInt(String(r.code).replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return 'R' + String(max + 1).padStart(3, '0');
}

/** Ajoute ou met à jour un repas. Renvoie la liste à jour. */
function enregistrerRepas(repas) {
  if (!repas || !String(repas.libelle || '').trim()) throw new Error('Le nom du repas est obligatoire.');
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const sh = feuille_();
    const tous = getRepas();
    const existant = repas.code ? tous.find(r => r.code === repas.code) : null;
    const code = existant ? existant.code : prochainCode_(tous);
    const valeurs = [COLONNES.map(c => (c === 'code' ? code : String(repas[c] || '').trim().toUpperCase()))];
    const ligne = existant ? existant.ligne : sh.getLastRow() + 1;
    sh.getRange(ligne, 1, 1, COLONNES.length).setValues(valeurs);
  } finally {
    lock.releaseLock();
  }
  return getRepas();
}

/** Supprime un repas par son code. Renvoie la liste à jour. */
function supprimerRepas(code) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const r = getRepas().find(x => x.code === code);
    if (!r) throw new Error('Repas ' + code + ' introuvable.');
    feuille_().deleteRow(r.ligne);
  } finally {
    lock.releaseLock();
  }
  return getRepas();
}
