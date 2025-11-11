import { R } from '@/lib/extract/regexFR';
import { normalizeNumberFR, normalizePercentFR, normalizeDateFR, checkTotals } from '@/lib/docai/normalize';

// Extraction par proximité pour formats tabulaires (derniers 30% du document)
function extractAmountsWithContext(text: string) {
  // ✅ Analyser SEULEMENT la section récapitulative (derniers 30% du document)
  const recapStartIndex = Math.floor(text.length * 0.7);
  const recapText = text.substring(recapStartIndex);
  
  console.log('[extractAmounts] Analyse de la section récapitulative (derniers 30%)');
  console.log('[extractAmounts] Position de départ:', recapStartIndex, '/', text.length);
  console.log('[extractAmounts] Texte analysé (premiers 300 chars):', recapText.substring(0, 300));
  
  const amountRegex = /([0-9\s]+[,\.]\d{2})\s*€/g;
  const amounts: Array<{value: string, index: number}> = [];
  let match;
  
  // ✅ Capturer les montants DANS la section récapitulative uniquement
  while ((match = amountRegex.exec(recapText)) !== null) {
    amounts.push({
      value: match[1],
      index: match.index + recapStartIndex // Ajuster l'index pour le document complet
    });
  }
  
  console.log('[extractAmounts] Montants trouvés dans section récap:', amounts.length);
  
  if (amounts.length === 0) return {};
  
  // Chercher HT/TTC/TVA DANS la section récapitulative
  const htIndex = recapText.search(/total\s*h\.?t\.?|total\s+hors\s+taxes?|base\s*h\.?t\.?|montant\s*h\.?t\.?/i);
  const ttcIndex = recapText.search(/total\s*t\.?t\.?c\.?/i);
  const tvaAmtIndex = recapText.search(/t\.?v\.?a\.?\s*(?:à|a)?\s*\d{1,2}\s*%/i);
  
  const result: any = {};
  const usedIndices = new Set<number>();
  
  if (htIndex >= 0) {
    const realHtIndex = htIndex + recapStartIndex;
    const availableAmounts = amounts.filter(a => !usedIndices.has(a.index));
    if (availableAmounts.length > 0) {
      const closest = availableAmounts.reduce((prev, curr) => 
        Math.abs(curr.index - realHtIndex) < Math.abs(prev.index - realHtIndex) ? curr : prev
      );
      result.ht = normalizeNumberFR(closest.value);
      usedIndices.add(closest.index);
      console.log('[extractAmounts] HT trouvé par proximité (section récap):', result.ht);
    }
  }
  
  if (ttcIndex >= 0) {
    const realTtcIndex = ttcIndex + recapStartIndex;
    const availableAmounts = amounts.filter(a => !usedIndices.has(a.index));
    if (availableAmounts.length > 0) {
      const closest = availableAmounts.reduce((prev, curr) => 
        Math.abs(curr.index - realTtcIndex) < Math.abs(prev.index - realTtcIndex) ? curr : prev
      );
      result.ttc = normalizeNumberFR(closest.value);
      usedIndices.add(closest.index);
      console.log('[extractAmounts] TTC trouvé par proximité (section récap):', result.ttc);
    }
  }
  
  if (tvaAmtIndex >= 0) {
    const realTvaIndex = tvaAmtIndex + recapStartIndex;
    const availableAmounts = amounts.filter(a => !usedIndices.has(a.index));
    if (availableAmounts.length > 0) {
      const closest = availableAmounts.reduce((prev, curr) => 
        Math.abs(curr.index - realTvaIndex) < Math.abs(prev.index - realTvaIndex) ? curr : prev
      );
      result.tvaAmt = normalizeNumberFR(closest.value);
      usedIndices.add(closest.index);
      console.log('[extractAmounts] TVA montant trouvé par proximité (section récap):', result.tvaAmt);
    }
  }
  
  return result;
}

export function parseFrenchDocument(
  text: string,
  module: 'factures' | 'frais' | 'ao' | 'devis'
): any {
  const fields: any = {};

  // Extraction factures/frais/devis
  if (module === 'factures' || module === 'frais' || module === 'devis') {
    // Extraction par proximité (formats tabulaires)
    const proximityExtraction = extractAmountsWithContext(text);
    console.log('[parseFR] Extraction par proximité:', proximityExtraction);

    // TVA % (extraire AVANT les montants pour la validation croisée)
    R.TVA_PCT.lastIndex = 0;
    const tvaPctMatch = R.TVA_PCT.exec(text)?.[1];
    if (tvaPctMatch) fields.tvaPct = normalizePercentFR(tvaPctMatch);

    // HT : priorité 1 = proximité, priorité 2 = dernier match regex
    R.HT.lastIndex = 0;
    const allHtMatches = [...text.matchAll(R.HT)].map(m => normalizeNumberFR(m[1])).filter(n => n != null);
    const htRegexFallback = allHtMatches.length > 0 ? allHtMatches[allHtMatches.length - 1] : null;
    fields.ht = proximityExtraction.ht ?? htRegexFallback;

    console.log('[parseFR] HT matches trouvés:', allHtMatches.length);
    if (fields.ht) {
      console.log('[parseFR] HT final extrait:', fields.ht, '(source:', proximityExtraction.ht ? 'proximité' : 'regex dernier match', ')');
    }

    // NET à payer
    R.NET.lastIndex = 0;
    const netMatch = R.NET.exec(text)?.[1];
    if (netMatch) fields.net = normalizeNumberFR(netMatch);

    // TTC : priorité 1 = proximité, priorité 2 = dernier match regex
    R.TTC.lastIndex = 0;
    const allTtcMatches = [...text.matchAll(R.TTC)].map(m => normalizeNumberFR(m[1])).filter(n => n != null);
    const ttcRegexFallback = allTtcMatches.length > 0 ? allTtcMatches[allTtcMatches.length - 1] : null;
    fields.ttc = proximityExtraction.ttc ?? ttcRegexFallback;

    console.log('[parseFR] TTC matches trouvés:', allTtcMatches.length);
    if (fields.ttc) {
      console.log('[parseFR] TTC final extrait:', fields.ttc, '(source:', proximityExtraction.ttc ? 'proximité' : 'regex dernier match', ')');
    }

    // TVA montant : NE PAS extraire ici, sera recalculé plus tard pour garantir cohérence
    // L'extraction directe du montant TVA cause souvent des erreurs (réutilisation de montants HT/TTC)
    // On laisse ce champ null pour forcer le recalcul
    fields.tvaAmt = null;

    // SIRET
    R.SIRET.lastIndex = 0;
    const siretMatch = R.SIRET.exec(text)?.[0];
    if (siretMatch) fields.siret = siretMatch;

    // Fournisseur : recherche dans les 500 premiers caractères
    const headerText = text.substring(0, 500);
    R.FOURNISSEUR.lastIndex = 0;
    const fournisseurMatch = R.FOURNISSEUR.exec(headerText)?.[1];
    if (fournisseurMatch) {
      const blacklist = ['france', 'avenue', 'rue', 'boulevard', 'chemin', 'bis', 'ter', 'quartier'];
      const isValid = !blacklist.some(word => 
        fournisseurMatch.toLowerCase().includes(word)
      );
      
      if (isValid) {
        fields.fournisseur = fournisseurMatch.trim();
      }
    }

    // Fallback fournisseur : chercher après "Facture"
    if (!fields.fournisseur) {
      const invoiceHeaderMatch = text.match(/facture[^\n]*\n+([A-Z][A-Za-z\s&]+)/i);
      if (invoiceHeaderMatch) {
        fields.fournisseur = invoiceHeaderMatch[1].trim();
      }
    }

    // N° facture
    R.NUM_FACT.lastIndex = 0;
    const numFactMatch = R.NUM_FACT.exec(text)?.[1];
    if (numFactMatch) fields.numFacture = numFactMatch;

    // Date
    R.DATE.lastIndex = 0;
    const dateMatch = R.DATE.exec(text)?.[1];
    if (dateMatch) fields.dateDoc = normalizeDateFR(dateMatch);

    // Validation croisée et recalcul si nécessaire
    if (fields.ht && fields.tvaPct && !fields.ttc) {
      fields.ttc = fields.ht * (1 + fields.tvaPct / 100);
      console.log('[parseFR] TTC recalculé:', fields.ttc);
    }

    if (fields.ht && fields.ttc && !fields.tvaPct) {
      fields.tvaPct = ((fields.ttc / fields.ht) - 1) * 100;
      console.log('[parseFR] TVA% recalculée:', fields.tvaPct);
    }

    if (fields.ttc && fields.tvaPct && !fields.ht) {
      fields.ht = fields.ttc / (1 + fields.tvaPct / 100);
      console.log('[parseFR] HT recalculé:', fields.ht);
    }

    // ✅ Validation stricte du ratio TTC/HT
    if (fields.ht && fields.ttc) {
      const ratio = fields.ttc / fields.ht;
      
      console.log('[parseFR] Ratio TTC/HT:', ratio.toFixed(3));
      
      // ✅ Validation stricte : ratio doit être entre 1.0 et 1.5 (TVA max ~50%)
      if (ratio < 1.0 || ratio > 1.5) {
        console.warn('[parseFR] ⚠️ Ratio TTC/HT anormal:', ratio.toFixed(3), '- Probable confusion HT/TTC');
        
        if (fields.ht >= fields.ttc) {
          console.log('[parseFR] Inversion HT ↔ TTC détectée');
          [fields.ht, fields.ttc] = [fields.ttc, fields.ht];
        } else {
          console.warn('[parseFR] Ratio > 1.5, extraction probablement incorrecte - Réinitialisation TTC');
          fields.ttc = null; // Forcer le recalcul
        }
      }
    }

    // ✅ CALCUL OBLIGATOIRE du montant de TVA (APRÈS inversion HT/TTC)
    // On ne se fie JAMAIS à l'extraction OCR pour le montant TVA car elle est souvent incorrecte
    if (fields.ht && fields.tvaPct) {
      fields.tvaAmt = fields.ht * (fields.tvaPct / 100);
      console.log('[parseFR] ✅ Montant TVA calculé:', fields.tvaAmt, '(HT:', fields.ht, '× TVA%:', fields.tvaPct, '%)');
      
      // ✅ CALCUL OBLIGATOIRE du TTC = HT + montant TVA
      fields.ttc = fields.ht + fields.tvaAmt;
      console.log('[parseFR] ✅ TTC recalculé:', fields.ttc, '(HT:', fields.ht, '+ TVA:', fields.tvaAmt, ')');
    } else {
      console.warn('[parseFR] ⚠️ Impossible de calculer TVA montant:', { ht: fields.ht, tvaPct: fields.tvaPct });
    }

    // Vérification cohérence finale
    const totalsOk = checkTotals(
      fields.ht ?? null,
      fields.tvaPct ?? null,
      fields.tvaAmt ?? null,
      (fields.net ?? fields.ttc ?? null)
    );

    fields.totalsOk = totalsOk;
  }

  // Extraction AO
  if (module === 'ao') {
    R.AO_DEADLINE.lastIndex = 0;
    const deadlineMatch = R.AO_DEADLINE.exec(text)?.[1];
    if (deadlineMatch) fields.aoDeadline = normalizeDateFR(deadlineMatch);

    R.AO_BUDGET.lastIndex = 0;
    const budgetMatch = R.AO_BUDGET.exec(text)?.[1];
    if (budgetMatch) fields.aoBudget = normalizeNumberFR(budgetMatch);

    R.AO_REF.lastIndex = 0;
    const refMatch = R.AO_REF.exec(text)?.[1];
    if (refMatch) fields.aoRef = refMatch;

    R.AO_ORGA.lastIndex = 0;
    const orgaMatch = R.AO_ORGA.exec(text)?.[1];
    if (orgaMatch) fields.aoOrga = orgaMatch.trim();

    R.AO_CP.lastIndex = 0;
    const cpMatch = R.AO_CP.exec(text)?.[0];
    if (cpMatch) fields.aoCP = cpMatch;
  }

  return fields;
}
