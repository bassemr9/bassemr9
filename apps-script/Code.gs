/**
 * Gestion des repas — Google Apps Script
 * Feuille attendue : colonnes A..G =
 * CODE | NATURE | LIBELLES | INGREDIENT PRINCIPAL | INGREDIENT FACULTATIF | ASTUCE | REMARQUE
 *
 * Onglet "Ingrédients" (créé et pré-rempli automatiquement) : colonnes A..F =
 * INGREDIENT | FAMILLE | SYNONYMES | ICONE | QTE / PERS | UNITE
 *
 * Onglet "Planning" (créé automatiquement) : colonnes A..D =
 * DATE | SERVICE (MIDI ou SOIR) | CODE du repas | PERSONNES (vide = valeur par défaut)
 */

const NOM_FEUILLE = 'Feuille 1';
const NOM_FEUILLE_INGR = 'Ingrédients';
const ENTETE_INGR = ['INGREDIENT', 'FAMILLE', 'SYNONYMES', 'ICONE', 'QTE / PERS', 'UNITE'];
const NOM_FEUILLE_PLAN = 'Planning';
const ENTETE_PLAN = ['DATE', 'SERVICE', 'CODE', 'PERSONNES'];
const SERVICES = ['MIDI', 'SOIR'];
const PERSONNES_DEFAUT = 4;

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

// Quantité approximative PAR PERSONNE proposée pour un nouvel ingrédient (le premier motif gagne).
// À corriger dans l'onglet "Ingrédients". Sans correspondance, la quantité reste vide ("à définir").
const QUANTITES_AUTO = [
  [/concentr/, 20, 'g'],
  [/tomate/, 100, 'g'], [/oignon/, 50, 'g'], [/\bail\b/, 5, 'g'], [/poivron/, 60, 'g'],
  [/piment|harissa|hrous|tabel|karouia/, 5, 'g'],
  [/poulet|dinde|escalope/, 150, 'g'], [/thon/, 50, 'g'], [/sardine/, 100, 'g'], [/poisson|dorade|merou/, 180, 'g'],
  [/crevette|calamar|fruits de mer/, 100, 'g'], [/burger/, 1, 'pièce'],
  [/steak|viande|boeuf|agneau|mouton|kefta|merguez|foie/, 150, 'g'], [/oeuf/, 1, 'pièce'],
  [/fromage|mozzarella|gruyere|ricotta/, 40, 'g'], [/lait|creme/, 100, 'ml'], [/yaourt/, 1, 'pièce'], [/beurre/, 15, 'g'],
  [/pomme de terre|patate|frite/, 200, 'g'], [/carotte/, 70, 'g'], [/courgette|aubergine/, 100, 'g'],
  [/salade|laitue|epinard/, 50, 'g'], [/champignon/, 60, 'g'], [/mais/, 40, 'g'], [/concombre/, 60, 'g'],
  [/persil|coriandre|menthe|basilic/, 5, 'g'], [/olive/, 30, 'g'], [/huile/, 15, 'ml'],
  [/pain|baguette|khobz|mlewi|tabouna|feuille de brik/, 80, 'g'], [/riz/, 80, 'g'],
  [/pate|spaghetti|macaroni|nouille/, 90, 'g'], [/couscous|semoule/, 100, 'g'], [/farine/, 30, 'g'],
  [/citron/, 0.25, 'pièce'], [/pois chiche|lentille|haricot|feve/, 60, 'g'], [/\bsel\b|epice|cumin|poivre\b/, 2, 'g']
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

/** Renvoie [quantité, unité] proposées pour un ingrédient, ou ['', ''] si on ne sait pas. */
function devinerQuantite_(nom) {
  const n = norm_(nom);
  const q = QUANTITES_AUTO.find(([re]) => re.test(n));
  return q ? [q[1], q[2]] : ['', ''];
}

/** Renvoie l'onglet "Ingrédients", en le créant (ou en le complétant) si besoin. */
function feuilleIngredients_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(NOM_FEUILLE_INGR);
  if (!sh) {
    sh = ss.insertSheet(NOM_FEUILLE_INGR);
    sh.getRange(1, 1, 1, ENTETE_INGR.length).setValues([ENTETE_INGR]).setFontWeight('bold').setBackground('#ead1dc');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 200).setColumnWidth(2, 170).setColumnWidth(3, 200);
  } else if (!String(sh.getRange(1, 5, 1, 1).getDisplayValues()[0][0]).trim()) {
    // Ancienne version de l'onglet : on ajoute les colonnes de quantités, remplies avec des estimations (une seule fois)
    sh.getRange(1, 5, 1, 2).setValues([[ENTETE_INGR[4], ENTETE_INGR[5]]]).setFontWeight('bold').setBackground('#ead1dc');
    lireIngredients_(sh).forEach(i => {
      const [q, u] = devinerQuantite_(i.nom);
      if (q !== '') sh.getRange(i.ligne, 5, 1, 2).setValues([[q, u]]);
    });
  }
  return sh;
}

function parseQte_(v) {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
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
      icone: String(l[3]).trim(),
      qte: parseQte_(l[4]),
      unite: String(l[5]).trim().toLowerCase()
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
    const lignes = Object.keys(nouveaux).sort().map(n => [n, devinerFamille_(n), nouveaux[n].join(' / '), ''].concat(devinerQuantite_(n)));
    if (lignes.length) sh.getRange(sh.getLastRow() + 1, 1, lignes.length, ENTETE_INGR.length).setValues(lignes);
    if (lignes.length || Object.keys(synAjoutes).length) liste = lireIngredients_(sh);
  } finally {
    lock.releaseLock();
  }
  return liste;
}

/** Repas, ingrédients (familles, synonymes, icônes, quantités), planning et nombre de personnes pour l'interface. */
function getDonnees() {
  const repas = getRepas();
  return { repas: repas, ingredients: synchroniserIngredients_(repas), planning: lirePlanning_(), personnes: personnesDefaut_() };
}

/** Change la quantité par personne d'un ingrédient depuis l'interface. Renvoie les données à jour. */
function changerQuantite(nom, qte, unite) {
  const n = String(nom || '').trim().toUpperCase();
  if (!n) throw new Error('Ingrédient manquant.');
  const q = qte === '' || qte === null || qte === undefined ? '' : Number(qte);
  if (q !== '' && (isNaN(q) || q < 0)) throw new Error('Quantité invalide.');
  const u = String(unite || '').trim().toLowerCase();
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const sh = feuilleIngredients_();
    const i = lireIngredients_(sh).find(x => x.nom === n || x.synonymes.includes(n));
    if (i) sh.getRange(i.ligne, 5, 1, 2).setValues([[q, u]]);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, ENTETE_INGR.length).setValues([[n, devinerFamille_(n), '', '', q, u]]);
  } finally {
    lock.releaseLock();
  }
  return getDonnees();
}

// ---------- Planning de la semaine ----------

/** Renvoie l'onglet "Planning", en le créant s'il n'existe pas. */
function feuillePlanning_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(NOM_FEUILLE_PLAN);
  if (!sh) {
    sh = ss.insertSheet(NOM_FEUILLE_PLAN);
    sh.getRange(1, 1, 1, ENTETE_PLAN.length).setValues([ENTETE_PLAN]).setFontWeight('bold').setBackground('#d9ead3');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1000, 1).setNumberFormat('@'); // dates gardées en texte AAAA-MM-JJ
    sh.setColumnWidth(1, 110);
  }
  return sh;
}

/** Accepte AAAA-MM-JJ ou JJ/MM/AAAA et renvoie AAAA-MM-JJ ('' si illisible). */
function dateIso_(v) {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
}

function lirePlanning_() {
  const sh = feuillePlanning_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, ENTETE_PLAN.length).getDisplayValues()
    .map((l, i) => ({
      ligne: i + 2,
      date: dateIso_(l[0]),
      service: String(l[1]).trim().toUpperCase(),
      code: String(l[2]).trim().toUpperCase(),
      personnes: parseInt(l[3], 10) || ''
    }))
    .filter(e => e.date && SERVICES.includes(e.service) && e.code);
}

function ecrirePlan_(sh, ligne, valeurs) {
  sh.getRange(ligne, 1, 1, 1).setNumberFormat('@');
  sh.getRange(ligne, 1, 1, ENTETE_PLAN.length).setValues([valeurs]);
}

function personnesDefaut_() {
  const n = parseInt(PropertiesService.getDocumentProperties().getProperty('PERSONNES'), 10);
  return n > 0 ? n : PERSONNES_DEFAUT;
}

/** Nombre de personnes par défaut (modifiable par repas dans le planning). */
function definirPersonnes(n) {
  const v = Math.min(30, Math.max(1, parseInt(n, 10) || PERSONNES_DEFAUT));
  PropertiesService.getDocumentProperties().setProperty('PERSONNES', String(v));
  return v;
}

/** Met un repas dans un créneau (remplace celui qui y était). personnes vide = valeur par défaut. Renvoie le planning. */
function planifierRepas(date, service, code, personnes) {
  const d = dateIso_(date);
  const srv = String(service || '').toUpperCase();
  const c = String(code || '').trim().toUpperCase();
  if (!d || !SERVICES.includes(srv)) throw new Error('Date ou service invalide.');
  if (!getRepas().some(r => r.code === c)) throw new Error('Repas ' + c + ' introuvable.');
  const p = personnes === '' || personnes === null || personnes === undefined ? '' : Math.min(30, Math.max(1, parseInt(personnes, 10) || 1));
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const sh = feuillePlanning_();
    const e = lirePlanning_().find(x => x.date === d && x.service === srv);
    ecrirePlan_(sh, e ? e.ligne : sh.getLastRow() + 1, [d, srv, c, p]);
  } finally {
    lock.releaseLock();
  }
  return lirePlanning_();
}

/** Vide un créneau. Renvoie le planning. */
function retirerPlanning(date, service) {
  const d = dateIso_(date);
  const srv = String(service || '').toUpperCase();
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const e = lirePlanning_().find(x => x.date === d && x.service === srv);
    if (e) feuillePlanning_().deleteRow(e.ligne);
  } finally {
    lock.releaseLock();
  }
  return lirePlanning_();
}

/** Déplace un repas vers un autre créneau (échange les deux s'il est déjà occupé). Renvoie le planning. */
function deplacerPlanning(date1, service1, date2, service2) {
  const d1 = dateIso_(date1), s1 = String(service1 || '').toUpperCase();
  const d2 = dateIso_(date2), s2 = String(service2 || '').toUpperCase();
  if (!d2 || !SERVICES.includes(s2)) throw new Error('Date ou service invalide.');
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const sh = feuillePlanning_();
    const plan = lirePlanning_();
    const a = plan.find(x => x.date === d1 && x.service === s1);
    const b = plan.find(x => x.date === d2 && x.service === s2);
    if (a && b) {
      ecrirePlan_(sh, a.ligne, [a.date, a.service, b.code, b.personnes]);
      ecrirePlan_(sh, b.ligne, [b.date, b.service, a.code, a.personnes]);
    } else if (a) {
      ecrirePlan_(sh, a.ligne, [d2, s2, a.code, a.personnes]);
    }
  } finally {
    lock.releaseLock();
  }
  return lirePlanning_();
}

/**
 * Écrit la famille de plusieurs ingrédients dans l'onglet "Ingrédients".
 * familles = { 'COURGETTE': 'LÉGUMES', ... } ; une famille vide = "À classer".
 * Un ingrédient absent de l'onglet y est ajouté.
 */
function ecrireFamilles_(familles) {
  const noms = Object.keys(familles || {});
  if (!noms.length) return;
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const sh = feuilleIngredients_();
    const liste = lireIngredients_(sh);
    const nouvelles = [];
    noms.forEach(brut => {
      const nom = String(brut).trim().toUpperCase();
      if (!nom) return;
      const famille = String(familles[brut] || '').trim().toUpperCase();
      const i = liste.find(x => x.nom === nom || x.synonymes.includes(nom));
      if (i) sh.getRange(i.ligne, 2).setValue(famille);
      else nouvelles.push([nom, famille, '', ''].concat(devinerQuantite_(nom)));
    });
    if (nouvelles.length) sh.getRange(sh.getLastRow() + 1, 1, nouvelles.length, ENTETE_INGR.length).setValues(nouvelles);
  } finally {
    lock.releaseLock();
  }
}

/** Change la famille d'un ingrédient depuis l'interface. Renvoie les données à jour. */
function changerFamille(nom, famille) {
  ecrireFamilles_({ [nom]: famille });
  return getDonnees();
}

// ---------- Doublons ----------

// Petits mots ignorés quand on compare deux noms de repas
const MOTS_VIDES = ['a', 'au', 'aux', 'la', 'le', 'les', 'l', 'de', 'du', 'des', 'd', 'avec', 'et', 'en', 'sauce'];

/**
 * Clé de comparaison d'un nom de repas : sans accents, sans petits mots, au singulier,
 * synonymes remplacés, mots triés. "Couscous au poulet" et "COUSCOUS DJEJ" donnent la même clé.
 */
function cleRepas_(libelle, synonymes) {
  const mots = norm_(libelle).replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter(m => m && !MOTS_VIDES.includes(m))
    .map(m => {
      const syn = synonymes[m.toUpperCase()];
      if (syn && syn.indexOf(' ') < 0) m = norm_(syn);
      return m.length > 3 ? m.replace(/[sx]$/, '') : m;
    });
  return [...new Set(mots)].sort().join(' ');
}

/** Renvoie un repas existant dont le nom est identique une fois nettoyé (hors le repas lui-même). */
function trouverDoublon_(repas, tous) {
  const synonymes = Object.assign({}, SYNONYMES_DEFAUT);
  lireIngredients_(feuilleIngredients_()).forEach(i => i.synonymes.forEach(s => (synonymes[s] = i.nom)));
  const cle = cleRepas_(repas.libelle, synonymes);
  return tous.find(r => r.code !== repas.code && cleRepas_(r.libelle, synonymes) === cle);
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
// repas.familles : familles choisies pour les nouveaux ingrédients ;
// repas.forcer : enregistrer même si un repas au nom identique existe déjà.
function enregistrerRepas(repas) {
  if (!repas || !String(repas.libelle || '').trim()) throw new Error('Le nom du repas est obligatoire.');
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const sh = feuille_();
    const tous = getRepas();
    if (!repas.forcer) {
      const doublon = trouverDoublon_(repas, tous);
      // Message lu par l'interface pour proposer « Enregistrer quand même »
      if (doublon) throw new Error('DOUBLON|' + doublon.code + '|' + doublon.libelle);
    }
    const existant = repas.code ? tous.find(r => r.code === repas.code) : null;
    const code = existant ? existant.code : prochainCode_(tous);
    const valeurs = [COLONNES.map(c => (c === 'code' ? code : String(repas[c] || '').trim().toUpperCase()))];
    const ligne = existant ? existant.ligne : sh.getLastRow() + 1;
    sh.getRange(ligne, 1, 1, COLONNES.length).setValues(valeurs);
  } finally {
    lock.releaseLock();
  }
  ecrireFamilles_(repas.familles);
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
    // Le repas disparaît aussi du planning
    const sp = feuillePlanning_();
    lirePlanning_().filter(e => e.code === code).map(e => e.ligne).sort((x, y) => y - x).forEach(l => sp.deleteRow(l));
  } finally {
    lock.releaseLock();
  }
  return getDonnees();
}
