/**
 * Gestion des repas — Google Apps Script
 * Feuille attendue : colonnes A..G =
 * CODE | NATURE | LIBELLES | INGREDIENT PRINCIPAL | INGREDIENT FACULTATIF | ASTUCE | REMARQUE
 *
 * Onglet "Ingrédients" (créé et pré-rempli automatiquement) : colonnes A..D =
 * INGREDIENT | FAMILLE | SYNONYMES | ICONE
 */

const NOM_FEUILLE = 'Feuille 1';
const NOM_FEUILLE_INGR = 'Ingrédients';
const ENTETE_INGR = ['INGREDIENT', 'FAMILLE', 'SYNONYMES', 'ICONE'];

// Synonymes connus (dialecte -> nom de référence), utilisés pour pré-remplir l'onglet
const SYNONYMES_DEFAUT = { BSAL: 'OIGNON', FILFIL: 'POIVRON', DJEJ: 'POULET', HOUT: 'POISSON', ADHAM: 'OEUF', JBEN: 'FROMAGE', BATATA: 'POMME DE TERRE' };

// Famille proposée pour un nouvel ingrédient (le premier motif qui correspond gagne).
// Sans correspondance, la famille reste vide et l'ingrédient apparaît dans "À classer".
const FAMILLES_AUTO = [
  [/poulet|dinde|escalope|viande|steak|boeuf|agneau|mouton|kefta|merguez|poisson|thon|sardine|crevette|calamar|oeuf|burger|foie/, 'PROTÉINES'],
  [/concentr|harissa|hrous|piment|epice|cumin|poivre\b|\bsel\b|sauce|ketchup|mayonnaise|moutarde|huile|\bail\b|tabel|karouia/, 'ÉPICES & SAUCES'],
  [/fromage|lait|creme|yaourt|beurre|mozzarella|gruyere|ricotta/, 'PRODUITS LAITIERS'],
  [/pate|spaghetti|macaroni|riz|couscous|pain|baguette|pomme de terre|patate|frite|semoule|farine|mlewi|tabouna|feuille de brik/, 'FÉCULENTS'],
  [/citron|pomme\b|orange|banane|fraise|raisin|datte/, 'FRUITS'],
  [/tomate|oignon|poivron|carotte|courgette|aubergine|salade|laitue|epinard|champignon|mais|concombre|persil|coriandre|menthe|petit pois|haricot|pois chiche|lentille|feve|navet|chou|celeri|olive/, 'LÉGUMES']
];
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

// ---------- Ingrédients ----------

function norm_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function decouper_(s) {
  return String(s || '').split(/\s*[\/\-,;]\s*/).map(x => x.trim().toUpperCase()).filter(Boolean);
}

function devinerFamille_(nom) {
  const n = norm_(nom);
  const f = FAMILLES_AUTO.find(([re]) => re.test(n));
  return f ? f[1] : '';
}

/** Renvoie l'onglet "Ingrédients", en le créant s'il n'existe pas. */
function feuilleIngredients_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(NOM_FEUILLE_INGR);
  if (!sh) {
    sh = ss.insertSheet(NOM_FEUILLE_INGR);
    sh.getRange(1, 1, 1, ENTETE_INGR.length).setValues([ENTETE_INGR]).setFontWeight('bold').setBackground('#ead1dc');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 200).setColumnWidth(2, 170).setColumnWidth(3, 200);
  }
  return sh;
}

function lireIngredients_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, ENTETE_INGR.length).getDisplayValues()
    .map((l, i) => ({
      ligne: i + 2,
      nom: String(l[0]).trim().toUpperCase(),
      famille: String(l[1]).trim().toUpperCase(),
      synonymes: decouper_(l[2]),
      icone: String(l[3]).trim()
    }))
    .filter(i => i.nom);
}

/**
 * Ajoute dans l'onglet "Ingrédients" les ingrédients des repas qui n'y sont pas encore
 * (avec une famille proposée), et renvoie la liste complète.
 */
function synchroniserIngredients_(repas) {
  const sh = feuilleIngredients_();
  let liste = lireIngredients_(sh);
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return liste; // un autre enregistrement est en cours : on lit seulement
  try {
    const connus = {};
    liste.forEach(i => { connus[i.nom] = i; i.synonymes.forEach(s => (connus[s] = i)); });
    const nouveaux = {};      // nom de référence -> synonymes trouvés
    const synAjoutes = {};    // ligne existante -> nouveaux synonymes
    repas.forEach(r => decouper_(r.principal + ' / ' + r.facultatif).forEach(brut => {
      if (connus[brut]) return;
      const ref = SYNONYMES_DEFAUT[brut] || brut;
      if (connus[ref]) {
        // Synonyme d'un ingrédient déjà présent : on le complète
        const i = connus[ref];
        (synAjoutes[i.ligne] = synAjoutes[i.ligne] || { i, liste: [] }).liste.push(brut);
        connus[brut] = i;
        return;
      }
      nouveaux[ref] = nouveaux[ref] || [];
      if (brut !== ref && !nouveaux[ref].includes(brut)) nouveaux[ref].push(brut);
    }));

    Object.values(synAjoutes).forEach(({ i, liste: l }) =>
      sh.getRange(i.ligne, 3).setValue(i.synonymes.concat(l).join(' / ')));
    const lignes = Object.keys(nouveaux).sort().map(n => [n, devinerFamille_(n), nouveaux[n].join(' / '), '']);
    if (lignes.length) sh.getRange(sh.getLastRow() + 1, 1, lignes.length, ENTETE_INGR.length).setValues(lignes);
    if (lignes.length || Object.keys(synAjoutes).length) liste = lireIngredients_(sh);
  } finally {
    lock.releaseLock();
  }
  return liste;
}

/** Repas + ingrédients (avec familles, synonymes et icônes) pour l'interface. */
function getDonnees() {
  const repas = getRepas();
  return { repas: repas, ingredients: synchroniserIngredients_(repas) };
}

/** Calcule le prochain code libre : R001, R002, ... */
function prochainCode_(repas) {
  const max = repas.reduce((m, r) => {
    const n = parseInt(String(r.code).replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return 'R' + String(max + 1).padStart(3, '0');
}

/** Ajoute ou met à jour un repas. Renvoie les données à jour. */
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
  return getDonnees();
}

/** Supprime un repas par son code. Renvoie les données à jour. */
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
  return getDonnees();
}
