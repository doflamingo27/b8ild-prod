import { extractPdfText } from './pdf';
import { multiPassOCR } from './ocr';
import { normalizeNumberFR, normalizeDateFR, checkTotals, scoreConfidence } from './normalize';
import { R } from './regexFR';
import { getTemplateFor } from './templates';
import { addCandidate, pickBest, boostConcordance, type Candidate, type FieldCandidates } from './candidates';
import type { ExtractionResult, DocType } from './types';

function classifyDoc(text: string): DocType {
  const s = text.toLowerCase();
  if (/appel d'offres|appel d'offres|ao|dce|date limite|acheteur|procédure/.test(s)) return 'ao';
  if (/facture|invoice|net à payer|n° facture|n o facture|n°facture/.test(s)) return 'invoice';
  if (/(qte|quantité|prix unitaire|total)/i.test(s)) return 'table';
  return 'unknown';
}

export async function extractFromFile(file: File, entrepriseId?: string): Promise<ExtractionResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  let pagesText: string[] = [];
  let hasText = false;
  const debug: any = { steps: [] };

  if (isPdf) {
    const pdf = await extractPdfText(file);
    pagesText = pdf.pages;
    hasText = pdf.hasTextLayer;
    debug.steps.push({ step:'pdfText', hasText });
  }

  if (!hasText) {
    const imgBlob = new Blob([await file.arrayBuffer()], { type: file.type || 'image/png' });
    const texts = await multiPassOCR([imgBlob]);
    pagesText = texts;
    debug.steps.push({ step:'ocr', pages: texts.length });
  }

  const allText = pagesText.join('\n');
  const type = classifyDoc(allText);
  const candidatesMap = new Map<string, Candidate[]>();
  
  // ========== ÉTAPE 1: REGEX (source:'regex', score base 0.10) ==========
  const htMatch = allText.match(R.HT);
  if (htMatch?.[1]) {
    addCandidate(candidatesMap, 'ht', normalizeNumberFR(htMatch[1]), 'regex', 0.10);
  }
  
  const ttcMatch = allText.match(R.TTC);
  if (ttcMatch?.[1]) {
    addCandidate(candidatesMap, 'ttc', normalizeNumberFR(ttcMatch[1]), 'regex', 0.10);
  }
  
  const netMatch = allText.match(R.NET);
  if (netMatch?.[1]) {
    addCandidate(candidatesMap, 'net', normalizeNumberFR(netMatch[1]), 'regex', 0.10);
  }
  
  const tvaPctMatch = allText.match(R.TVA_PCT);
  if (tvaPctMatch?.[1]) {
    addCandidate(candidatesMap, 'tvaPct', normalizeNumberFR(tvaPctMatch[1]), 'regex', 0.10);
  }
  
  const tvaAmtMatch = allText.match(R.TVA_AMT);
  if (tvaAmtMatch?.[1]) {
    addCandidate(candidatesMap, 'tvaAmt', normalizeNumberFR(tvaAmtMatch[1]), 'regex', 0.10);
  }
  
  const siretMatch = allText.match(R.SIRET);
  if (siretMatch?.[0]) {
    addCandidate(candidatesMap, 'siret', siretMatch[0], 'regex', 0.10);
  }
  
  const sirenMatch = allText.match(R.SIREN);
  if (!siretMatch && sirenMatch?.[0]) {
    addCandidate(candidatesMap, 'siren', sirenMatch[0], 'regex', 0.10);
  }
  
  const numMatch = allText.match(R.NUM_FACT);
  if (numMatch?.[2]) {
    addCandidate(candidatesMap, 'numFacture', numMatch[2].trim(), 'regex', 0.10);
  }
  
  const dateMatches = [...allText.matchAll(R.DATE)];
  if (dateMatches.length > 0) {
    addCandidate(candidatesMap, 'dateDoc', normalizeDateFR(dateMatches[0][1]), 'regex', 0.10);
  }
  
  const eurMatch = R.EUR.test(allText);
  if (eurMatch) {
    addCandidate(candidatesMap, 'currency', 'EUR', 'regex', 0.10);
  }
  
  // AO
  const aoDeadlineMatch = allText.match(R.AO_DEADLINE);
  if (aoDeadlineMatch?.[1]) {
    addCandidate(candidatesMap, 'aoDeadline', normalizeDateFR(aoDeadlineMatch[1]), 'regex', 0.10);
  }
  
  const aoBudgetMatch = allText.match(R.AO_BUDGET);
  if (aoBudgetMatch?.[3]) {
    addCandidate(candidatesMap, 'aoBudget', normalizeNumberFR(aoBudgetMatch[3]), 'regex', 0.10);
  }
  
  const aoRefMatch = allText.match(R.AO_REF);
  if (aoRefMatch?.[2]) {
    addCandidate(candidatesMap, 'aoRef', aoRefMatch[2], 'regex', 0.10);
  }
  
  const aoOrgaMatch = allText.match(R.AO_ORGA);
  if (aoOrgaMatch?.[2]) {
    addCandidate(candidatesMap, 'aoOrga', aoOrgaMatch[2].trim(), 'regex', 0.10);
  }
  
  const aoCPMatches = [...allText.matchAll(R.AO_CP)];
  if (aoCPMatches.length > 0) {
    const cp = aoCPMatches[0][0];
    addCandidate(candidatesMap, 'aoCP', cp, 'regex', 0.10);
    
    // Ville via heuristique (voisinage du CP)
    const idx = allText.indexOf(cp);
    const slice = allText.slice(Math.max(0, idx - 40), idx);
    const tokens = slice.trim().split(/\s+/);
    const ville = tokens.slice(-2).join(' ').replace(/[^\p{L}\-]/gu, '').toUpperCase();
    if (ville) {
      addCandidate(candidatesMap, 'aoVille', ville, 'heur', 0.15);
    }
  }
  
  // ========== ÉTAPE 2: HEURISTIQUES (source:'heur', score 0.15) ==========
  // Dernier bloc HT→TVA→TTC (priorité au Net à payer si présent)
  if (netMatch?.[1]) {
    addCandidate(candidatesMap, 'net', normalizeNumberFR(netMatch[1]), 'heur', 0.15);
  }
  
  // ========== ÉTAPE 3: TEMPLATES FOURNISSEURS (source:'tmpl', score 0.25) ==========
  if (entrepriseId) {
    const siretCand = pickBest(candidatesMap.get('siret') || []);
    const template = await getTemplateFor(entrepriseId, {
      siret: siretCand?.value || null,
      nom: null
    });
    
    if (template && template.field_positions) {
      debug.steps.push({ step: 'template', found: true, template: template.fournisseur_nom });
      
      // Appliquer les positions du template (simplifié: on boost les candidats existants)
      // Dans un vrai système, on rechercherait les valeurs aux positions enregistrées
      for (const [field, _positions] of Object.entries(template.field_positions)) {
        const existing = candidatesMap.get(field);
        if (existing && existing.length > 0) {
          // Boost le meilleur candidat existant comme s'il venait du template
          existing[0].score = Math.max(existing[0].score, 0.25);
          existing[0].source = 'tmpl';
        }
      }
    }
  }
  
  // ========== ÉTAPE 4: PONDÉRATION & CONCORDANCE ==========
  const candidatesObj: FieldCandidates = {};
  candidatesMap.forEach((value, key) => {
    candidatesObj[key] = value;
  });
  
  boostConcordance(candidatesObj);
  
  // ========== ÉTAPE 5: SÉLECTION MEILLEURE VALEUR PAR CHAMP ==========
  const fields: any = {};
  
  const bestHt = pickBest(candidatesMap.get('ht') || []);
  fields.ht = bestHt?.value || null;
  
  const bestTtc = pickBest(candidatesMap.get('ttc') || []);
  fields.ttc = bestTtc?.value || null;
  
  const bestNet = pickBest(candidatesMap.get('net') || []);
  fields.net = bestNet?.value || null;
  
  const bestTvaPct = pickBest(candidatesMap.get('tvaPct') || []);
  fields.tvaPct = bestTvaPct?.value || null;
  
  const bestTvaAmt = pickBest(candidatesMap.get('tvaAmt') || []);
  fields.tvaAmt = bestTvaAmt?.value || null;
  
  const bestSiret = pickBest(candidatesMap.get('siret') || []);
  fields.siret = bestSiret?.value || null;
  
  const bestSiren = pickBest(candidatesMap.get('siren') || []);
  fields.siren = bestSiren?.value || null;
  
  const bestNumFacture = pickBest(candidatesMap.get('numFacture') || []);
  fields.numFacture = bestNumFacture?.value || null;
  
  const bestDateDoc = pickBest(candidatesMap.get('dateDoc') || []);
  fields.dateDoc = bestDateDoc?.value || null;
  
  const bestCurrency = pickBest(candidatesMap.get('currency') || []);
  fields.currency = bestCurrency?.value || 'OTHER';
  
  const bestAoDeadline = pickBest(candidatesMap.get('aoDeadline') || []);
  fields.aoDeadline = bestAoDeadline?.value || null;
  
  const bestAoBudget = pickBest(candidatesMap.get('aoBudget') || []);
  fields.aoBudget = bestAoBudget?.value || null;
  
  const bestAoRef = pickBest(candidatesMap.get('aoRef') || []);
  fields.aoRef = bestAoRef?.value || null;
  
  const bestAoOrga = pickBest(candidatesMap.get('aoOrga') || []);
  fields.aoOrga = bestAoOrga?.value || null;
  
  const bestAoCP = pickBest(candidatesMap.get('aoCP') || []);
  fields.aoCP = bestAoCP?.value || null;
  
  const bestAoVille = pickBest(candidatesMap.get('aoVille') || []);
  fields.aoVille = bestAoVille?.value || null;
  
  // ========== ÉTAPE 6: VÉRIFICATION TOTAUX & SCORE ==========
  const totalsOk = checkTotals(fields.ht, fields.tvaPct, fields.tvaAmt, fields.net ?? fields.ttc ?? null);
  
  const confidence = scoreConfidence(0.5, {
    totalsOk,
    hasSiret: !!fields.siret,
    hasDate: !!fields.dateDoc || !!fields.aoDeadline,
    eur: fields.currency === 'EUR',
  });
  
  const result: ExtractionResult = {
    type,
    rawText: pagesText,
    fields,
    confidence,
    candidates: candidatesObj,
    debug
  };
  
  return result;
}
