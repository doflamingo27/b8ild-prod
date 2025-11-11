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
  const usedIndices = new Set<number>(); // Tracker les montants déjà utilisés
  
  if (htIndex >= 0) {
    const closest = amounts.reduce((prev, curr) => 
      Math.abs(curr.index - htIndex) < Math.abs(prev.index - htIndex) ? curr : prev
    );
    result.ht = normalizeNumberFR(closest.value);
    usedIndices.add(closest.index);
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

    // TTC : extraction prioritaire (montant final, généralement plus fiable)
    R.TTC.lastIndex = 0;
    const ttcMatch = R.TTC.exec(text)?.[1];
    const extractedTTC = proximityExtraction.ttc ?? (ttcMatch ? normalizeNumberFR(ttcMatch) : null);

    // HT : extraction comme fallback
    R.HT.lastIndex = 0;
    const htMatch = R.HT.exec(text)?.[1];
    const extractedHT = proximityExtraction.ht ?? (htMatch ? normalizeNumberFR(htMatch) : null);

    // NET à payer
    R.NET.lastIndex = 0;
    const netMatch = R.NET.exec(text)?.[1];
    if (netMatch) fields.net = normalizeNumberFR(netMatch);

    console.log('[parseFR] === EXTRACTION BRUTE ===', {
      proximityTTC: proximityExtraction.ttc,
      proximityHT: proximityExtraction.ht,
      proximityTVAAmt: proximityExtraction.tvaAmt,
      regexTTC: ttcMatch,
      regexHT: htMatch,
      regexTVAPct: tvaPctMatch,
      extractedTTC,
      extractedHT,
      extractedTVAPct: fields.tvaPct,
    });

    // ✅ STRATÉGIE PRIORITAIRE : Rétro-calcul depuis TTC (plus fiable que HT)
    if (extractedTTC && fields.tvaPct) {
      fields.ttc = extractedTTC;
      fields.ht = extractedTTC / (1 + fields.tvaPct / 100);
      fields.tvaAmt = fields.ht * (fields.tvaPct / 100);
      
      console.log('[parseFR] ✅ Rétro-calcul prioritaire depuis TTC:', {
        ttc: fields.ttc,
        ht: fields.ht,
        tvaAmt: fields.tvaAmt
      });
    } 
    // ⚠️ FALLBACK : Calcul avant depuis HT si TTC non disponible
    else if (extractedHT && fields.tvaPct) {
      fields.ht = extractedHT;
      fields.tvaAmt = fields.ht * (fields.tvaPct / 100);
      fields.ttc = fields.ht * (1 + fields.tvaPct / 100);
      
      console.log('[parseFR] ⚠️ Calcul avant depuis HT (fallback):', {
        ht: fields.ht,
        tvaAmt: fields.tvaAmt,
        ttc: fields.ttc
      });
    }
    // ⚠️ FALLBACK FINAL : Extraction brute si aucun calcul possible
    else {
      if (extractedTTC) fields.ttc = extractedTTC;
      if (extractedHT) fields.ht = extractedHT;
      
      // Essayer de recalculer les valeurs manquantes
      if (fields.ht && fields.ttc && !fields.tvaPct) {
        fields.tvaPct = ((fields.ttc / fields.ht) - 1) * 100;
        fields.tvaAmt = fields.ttc - fields.ht;
        console.log('[parseFR] TVA% et montant recalculés depuis HT/TTC:', {
          tvaPct: fields.tvaPct,
          tvaAmt: fields.tvaAmt
        });
      }
      
      if (fields.ht && fields.tvaPct && !fields.ttc) {
        fields.ttc = fields.ht * (1 + fields.tvaPct / 100);
        fields.tvaAmt = fields.ht * (fields.tvaPct / 100);
        console.log('[parseFR] TTC et TVA montant recalculés depuis HT:', {
          ttc: fields.ttc,
          tvaAmt: fields.tvaAmt
        });
      }
      
      if (fields.ttc && fields.tvaPct && !fields.ht) {
        fields.ht = fields.ttc / (1 + fields.tvaPct / 100);
        fields.tvaAmt = fields.ht * (fields.tvaPct / 100);
        console.log('[parseFR] HT et TVA montant recalculés depuis TTC:', {
          ht: fields.ht,
          tvaAmt: fields.tvaAmt
        });
      }
    }

    // ✅ VALIDATION CROISÉE STRICTE : Vérifier cohérence HT/TTC et corriger automatiquement
    if (fields.ht && fields.ttc) {
      if (fields.ht > fields.ttc) {
        console.warn('[parseFR] ❌ HT > TTC détecté, inversion automatique');
        [fields.ht, fields.ttc] = [fields.ttc, fields.ht];
        
        // Recalculer TVA% et montant TVA basé sur HT et TTC corrigés
        if (fields.tvaPct) {
          fields.tvaAmt = fields.ht * (fields.tvaPct / 100);
        } else {
          fields.tvaPct = ((fields.ttc / fields.ht) - 1) * 100;
          fields.tvaAmt = fields.ttc - fields.ht;
        }
        
        console.log('[parseFR] Montants corrigés après inversion:', {
          ht: fields.ht,
          ttc: fields.ttc,
          tvaPct: fields.tvaPct,
          tvaAmt: fields.tvaAmt
        });
      }
    }

    console.log('[parseFR] === VALEURS FINALES (APRÈS RECALCUL) ===', {
      ht: fields.ht,
      tvaPct: fields.tvaPct,
      tvaAmt: fields.tvaAmt,
      ttc: fields.ttc,
      calculManuel: fields.ht && fields.tvaPct 
        ? `${fields.ht?.toFixed(2)} × ${(1 + (fields.tvaPct || 0) / 100).toFixed(2)} = ${(fields.ht * (1 + (fields.tvaPct || 0) / 100)).toFixed(2)}` 
        : 'N/A'
    });

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
