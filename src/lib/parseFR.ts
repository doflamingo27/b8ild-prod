import { R } from '@/lib/extract/regexFR';
import { normalizeNumberFR, normalizePercentFR, normalizeDateFR, checkTotals } from '@/lib/docai/normalize';

// Extraction par proximité pour formats tabulaires
function extractAmountsWithContext(text: string) {
  const amountRegex = /([0-9\s]+[,\.]\d{2})\s*€/g;
  const amounts: Array<{value: string, index: number}> = [];
  let match;
  
  while ((match = amountRegex.exec(text)) !== null) {
    amounts.push({
      value: match[1],
      index: match.index
    });
  }
  
  if (amounts.length === 0) return {};
  
  // Amélioration : détecter HT dans formats tabulaires et variantes
  const htIndex = text.search(/total\s*h\.?t\.?|total\s+hors\s+taxes?|base\s*h\.?t\.?|montant\s*h\.?t\.?/i);
  const ttcIndex = text.search(/total\s*t\.?t\.?c\.?/i);
  const tvaAmtIndex = text.search(/t\.?v\.?a\.?\s*(?:à|a)?\s*\d{1,2}\s*%/i);
  
  const result: any = {};
  const usedIndices = new Set<number>();
  
  if (htIndex >= 0) {
    const availableAmounts = amounts.filter(a => !usedIndices.has(a.index));
    if (availableAmounts.length > 0) {
      const closest = availableAmounts.reduce((prev, curr) => 
        Math.abs(curr.index - htIndex) < Math.abs(prev.index - htIndex) ? curr : prev
      );
      result.ht = normalizeNumberFR(closest.value);
      usedIndices.add(closest.index);
    }
  }
  
  if (ttcIndex >= 0) {
    const availableAmounts = amounts.filter(a => !usedIndices.has(a.index));
    if (availableAmounts.length > 0) {
      const closest = availableAmounts.reduce((prev, curr) => 
        Math.abs(curr.index - ttcIndex) < Math.abs(prev.index - ttcIndex) ? curr : prev
      );
      result.ttc = normalizeNumberFR(closest.value);
      usedIndices.add(closest.index);
    }
  }
  
  if (tvaAmtIndex >= 0) {
    const availableAmounts = amounts.filter(a => !usedIndices.has(a.index));
    if (availableAmounts.length > 0) {
      const closest = availableAmounts.reduce((prev, curr) => 
        Math.abs(curr.index - tvaAmtIndex) < Math.abs(prev.index - tvaAmtIndex) ? curr : prev
      );
      result.tvaAmt = normalizeNumberFR(closest.value);
      usedIndices.add(closest.index);
    }
  }
  
  return result;
}

export function parseFrenchDocument(text: string, module: 'factures' | 'frais' | 'ao') {
  const fields: any = {};

  // Extraction factures/frais
  if (module === 'factures' || module === 'frais') {
    // Extraction par proximité (formats tabulaires)
    const proximityExtraction = extractAmountsWithContext(text);
    console.log('[parseFR] Extraction par proximité:', proximityExtraction);

    // TVA % (extraire AVANT les montants pour la validation croisée)
    R.TVA_PCT.lastIndex = 0;
    const tvaPctMatch = R.TVA_PCT.exec(text)?.[1];
    if (tvaPctMatch) fields.tvaPct = normalizePercentFR(tvaPctMatch);

    // HT : priorité à la proximité, fallback regex
    R.HT.lastIndex = 0;
    const htMatch = R.HT.exec(text)?.[1];
    fields.ht = proximityExtraction.ht ?? (htMatch ? normalizeNumberFR(htMatch) : null);

    // NET à payer
    R.NET.lastIndex = 0;
    const netMatch = R.NET.exec(text)?.[1];
    if (netMatch) fields.net = normalizeNumberFR(netMatch);

    // TTC : stratégie multi-match avec proximité
    R.TTC.lastIndex = 0;
    const ttcMatches = [...text.matchAll(R.TTC)].map(m => normalizeNumberFR(m[1])).filter(n => n != null);
    
    if (proximityExtraction.ttc) {
      fields.ttc = proximityExtraction.ttc;
    } else if (ttcMatches.length > 0) {
      if (fields.ht && fields.tvaPct) {
        const expectedTTC = fields.ht * (1 + fields.tvaPct / 100);
        const closestMatch = ttcMatches.reduce((prev, curr) =>
          Math.abs(curr - expectedTTC) < Math.abs(prev - expectedTTC) ? curr : prev
        );
        fields.ttc = closestMatch;
      } else {
        fields.ttc = ttcMatches[0];
      }
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

    // Vérifier cohérence HT/TTC (si HT >= TTC, probable erreur) - AVANT le calcul de TVA
    if (fields.ht && fields.ttc && fields.ht >= fields.ttc) {
      console.warn('[parseFR] HT >= TTC détecté, inversion probable !');
      [fields.ht, fields.ttc] = [fields.ttc, fields.ht];
      console.log('[parseFR] Montants inversés:', { ht: fields.ht, ttc: fields.ttc });
    }

    // ✅ CALCUL OBLIGATOIRE du montant de TVA (APRÈS inversion HT/TTC)
    // On ne se fie JAMAIS à l'extraction OCR pour le montant TVA car elle est souvent incorrecte
    if (fields.ht && fields.tvaPct) {
      fields.tvaAmt = fields.ht * (fields.tvaPct / 100);
      console.log('[parseFR] ✅ Montant TVA calculé:', fields.tvaAmt, '(HT:', fields.ht, '× TVA%:', fields.tvaPct, '%)');
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
