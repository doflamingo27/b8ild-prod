import { readPdfWithCoords } from './pdfTextCoords';
import { pairsFromLayout } from './layoutPairs';
import { normalizeNumberFR, normalizeDateFR, checkTotals, scoreConfidence } from './normalize';
import { R } from './regexFR';
import { ocrImageBlob } from './ocrLocal';
import { choose, Cand } from './vote';
import { parseCSV, parseXLSX, inferTotals } from './tableDetect';

export async function extractAuto(file: File, entrepriseId?: string) {
  console.log('[EXTRACT] Starting extraction for:', file.name, 'Type:', file.type, 'Size:', file.size);
  
  const ext = file.name.toLowerCase();
  let textPages: string[] = [];
  let layoutPairs: any[] = [];
  const candidates: Record<string, Cand<any>[]> = {};

  // 1) CSV/XLSX direct
  if (ext.endsWith('.csv')) {
    console.log('[EXTRACT] Processing CSV file');
    const rows = await parseCSV(file);
    const { ht, ttc } = inferTotals(rows);
    
    if (ht != null) candidates.ht = [{ value: ht, score: 0.8, source: 'layout' }];
    if (ttc != null) candidates.ttc = [{ value: ttc, score: 0.8, source: 'layout' }];
    textPages = [JSON.stringify(rows)];
  } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
    console.log('[EXTRACT] Processing XLSX file');
    const rows = await parseXLSX(file);
    const { ht, ttc } = inferTotals(rows);
    
    if (ht != null) candidates.ht = [{ value: ht, score: 0.8, source: 'layout' }];
    if (ttc != null) candidates.ttc = [{ value: ttc, score: 0.8, source: 'layout' }];
    textPages = [JSON.stringify(rows)];
  } else if (ext.endsWith('.pdf')) {
    // 2) PDF texte + coords
    console.log('[EXTRACT] Processing PDF file');
    const { pages, hasText } = await readPdfWithCoords(file);
    
    if (hasText) {
      console.log('[EXTRACT] PDF has text layer, using coordinates');
      layoutPairs = pairsFromLayout(pages);
      textPages = pages.map(pageItems => pageItems.map(i => i.str).join(' '));
    } else {
      console.log('[EXTRACT] PDF has no text, using OCR');
      // PDF sans texte → OCR sur le fichier
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const t = await ocrImageBlob(blob);
      textPages = [t];
    }
  } else {
    // 3) Image → OCR
    console.log('[EXTRACT] Processing image file');
    const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'image/png' });
    const t = await ocrImageBlob(blob);
    textPages = [t];
  }

  const all = textPages.join('\n');
  console.log('[EXTRACT] Text extracted, length:', all.length);

  // Regex candidats (source 'regex')
  function push(name: string, val: any, sc = 0.6) {
    if (val != null) {
      candidates[name] ||= [];
      candidates[name].push({ value: val, score: sc, source: 'regex' });
    }
  }

  // Extraction regex
  const htMatch = R.HT.exec(all);
  if (htMatch?.[1]) push('ht', normalizeNumberFR(htMatch[1]));
  
  const ttcMatch = R.TTC.exec(all);
  if (ttcMatch?.[1]) push('ttc', normalizeNumberFR(ttcMatch[1]));
  
  const netMatch = R.NET.exec(all);
  if (netMatch?.[1]) push('net', normalizeNumberFR(netMatch[1]), 0.75);
  
  const tvaPctMatch = R.TVA_PCT.exec(all);
  if (tvaPctMatch?.[1]) push('tvaPct', normalizeNumberFR(tvaPctMatch[1]));
  
  const tvaAmtMatch = R.TVA_AMT.exec(all);
  if (tvaAmtMatch?.[1]) push('tvaAmt', normalizeNumberFR(tvaAmtMatch[1]));
  
  const numFactMatch = R.NUM_FACT.exec(all);
  if (numFactMatch?.[1]) push('numFacture', numFactMatch[1].trim(), 0.65);
  
  const siret = (all.match(R.SIRET) || [])[0] ?? null;
  if (siret) push('siret', siret.replace(/\s/g, ''), 0.7);
  
  const dateMatches = [...all.matchAll(R.DATE)];
  if (dateMatches.length > 0) {
    const dateDoc = normalizeDateFR(dateMatches[0][1]);
    if (dateDoc) push('dateDoc', dateDoc, 0.6);
  }
  
  const eur = R.EUR.test(all);

  // Extraction fournisseur
  const fournisseurMatch = R.FOURNISSEUR.exec(all);
  if (fournisseurMatch?.[1]) push('fournisseur', fournisseurMatch[1].trim(), 0.65);

  // AO spécifique
  const aoDeadlineMatch = R.AO_DEADLINE.exec(all);
  if (aoDeadlineMatch?.[1]) {
    const aoDeadline = normalizeDateFR(aoDeadlineMatch[1]);
    if (aoDeadline) push('aoDeadline', aoDeadline, 0.65);
  }
  
  const aoBudgetMatch = R.AO_BUDGET.exec(all);
  if (aoBudgetMatch?.[1]) push('aoBudget', normalizeNumberFR(aoBudgetMatch[1]), 0.65);
  
  const aoRefMatch = R.AO_REF.exec(all);
  if (aoRefMatch?.[1]) push('aoRef', aoRefMatch[1].trim(), 0.65);
  
  const aoOrgaMatch = R.AO_ORGA.exec(all);
  if (aoOrgaMatch?.[1]) push('aoOrga', aoOrgaMatch[1].trim(), 0.65);
  
  const aoCPMatches = [...all.matchAll(R.AO_CP)];
  if (aoCPMatches.length > 0) {
    const cp = aoCPMatches[0][0];
    push('aoCP', cp, 0.7);
    
    // Ville via heuristique
    const idx = all.indexOf(cp);
    const slice = all.slice(Math.max(0, idx - 40), idx);
    const tokens = slice.trim().split(/\s+/);
    const ville = tokens.slice(-2).join(' ').replace(/[^\p{L}\-]/gu, '').toUpperCase();
    if (ville) push('aoVille', ville, 0.6);
  }

  // Layout pairs (source 'layout')
  console.log('[EXTRACT] Processing', layoutPairs.length, 'layout pairs');
  for (const p of layoutPairs) {
    const key = mapLabelToField(p.label);
    if (!key) continue;
    
    const v = valueNormalizeForKey(key, p.value);
    if (v != null) {
      candidates[key] ||= [];
      candidates[key].push({ value: v, score: 0.8, source: 'layout' });
    }
  }

  // Vote par champ
  function pick(key: string) {
    const c = candidates[key];
    const ch = c ? choose(c) : null;
    return ch?.value ?? null;
  }

  const fields = {
    ht: pick('ht'),
    tvaPct: pick('tvaPct'),
    tvaAmt: pick('tvaAmt'),
    ttc: pick('ttc'),
    net: pick('net'),
    siret: pick('siret'),
    fournisseur: pick('fournisseur'),
    numFacture: pick('numFacture'),
    dateDoc: pick('dateDoc'),
    aoDeadline: pick('aoDeadline'),
    aoBudget: pick('aoBudget'),
    aoRef: pick('aoRef'),
    aoOrga: pick('aoOrga'),
    aoCP: pick('aoCP'),
    aoVille: pick('aoVille'),
  };

  // Fallback : calculer HT si manquant
  if (!fields.ht && fields.ttc && fields.tvaPct) {
    fields.ht = fields.ttc / (1 + fields.tvaPct / 100);
    console.log('[EXTRACT] Calculated HT from TTC:', fields.ht);
  }

  const totalsOk = checkTotals(fields.ht, fields.tvaPct, fields.tvaAmt, fields.net ?? fields.ttc);
  const confidence = scoreConfidence(0.5, {
    totalsOk,
    siret: !!fields.siret,
    date: !!(fields.dateDoc || fields.aoDeadline),
    eur,
  });

  console.log('[EXTRACT] Confidence:', (confidence * 100).toFixed(1) + '%', 'Totals OK:', totalsOk);

  return {
    textPages,
    fields,
    confidence,
    debug: { eur, totalsOk, candidates }
  };
}

// Helpers
function mapLabelToField(lbl: string): string | null {
  const s = lbl.toLowerCase();
  if (s.includes('total ht') || s.includes('montant ht') || s.includes('sous total ht')) return 'ht';
  if (s.startsWith('tva')) return s.includes('%') ? 'tvaPct' : 'tvaAmt';
  if (s.includes('total ttc')) return 'ttc';
  if (s.includes('net à payer')) return 'net';
  if (s.includes('n° facture') || s.includes('no facture') || s.includes('numéro facture')) return 'numFacture';
  if (s.includes('siret')) return 'siret';
  if (s === 'date') return 'dateDoc';
  if (s.includes('date limite')) return 'aoDeadline';
  if (s.includes('organisme') || s.includes('acheteur')) return 'aoOrga';
  if (s.includes('référence')) return 'aoRef';
  if (s.includes('montant estimé') || s.includes('budget')) return 'aoBudget';
  return null;
}

function valueNormalizeForKey(key: string, raw: string): any {
  if (['ht', 'tvaPct', 'tvaAmt', 'ttc', 'net', 'aoBudget'].includes(key)) {
    return normalizeNumberFR(raw.replace('€', ''));
  }
  if (['dateDoc', 'aoDeadline'].includes(key)) {
    return normalizeDateFR(raw);
  }
  return raw?.trim() || null;
}
