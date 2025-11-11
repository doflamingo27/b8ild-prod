import { R } from '@/lib/extract/regexFR';
import { normalizeNumberFR, normalizePercentFR, normalizeDateFR, checkTotals } from '@/lib/docai/normalize';

// Extraction par proximité pour formats tabulaires (PRIORISATION SECTION RÉCAPITULATIVE)
function extractAmountsWithContext(text: string) {
  const result: any = {};
  
  // 1. Chercher d'abord dans la section récapitulative (après "Sous-total" ou dans les derniers 30% du texte)
  const recapSectionIndex = text.search(/sous[\-\s]?total\s*h\.?t\.?|total\s*h\.?t\.?.*remise/i);
  const recapText = recapSectionIndex >= 0 
    ? text.substring(recapSectionIndex) 
    : text.substring(Math.floor(text.length * 0.7)); // Derniers 30% du texte
  
  console.log('[extractAmounts] Section récapitulative détectée à partir de:', recapSectionIndex);
  console.log('[extractAmounts] Texte analysé (premiers 300 chars):', recapText.substring(0, 300));
  
  // 2. Trouver tous les montants avec € UNIQUEMENT dans la section récapitulative
  const amountRegex = /([0-9\s]+[,\.]\d{2})\s*€/g;
  const amounts: Array<{value: string, index: number, used: boolean}> = [];
  let match;
  
  while ((match = amountRegex.exec(recapText)) !== null) {
    const adjustedIndex = recapSectionIndex >= 0 ? recapSectionIndex + match.index : match.index;
    amounts.push({
      value: match[1],
      index: adjustedIndex,
      used: false
    });
  }
  
  console.log('[extractAmounts] Montants détectés dans section récapitulative:', amounts.map(a => a.value));
  
  if (amounts.length === 0) return {};
  
  // 3. Chercher "Total HT" et "Total TTC" UNIQUEMENT dans la section récapitulative
  const htIndex = recapText.search(/total\s*h\.?t\.?|h\.?t\.?(?=\s*[:\|])|hors\s*taxes?/i);
  const ttcIndex = recapText.search(/total\s*t\.?t\.?c\.?|t\.?t\.?c\.?(?=\s*[:\|])|toutes?\s*taxes\s*comprises?/i);
  
  // Ajuster les indices au texte complet
  const htIndexInFullText = htIndex >= 0 && recapSectionIndex >= 0 ? recapSectionIndex + htIndex : htIndex;
  const ttcIndexInFullText = ttcIndex >= 0 && recapSectionIndex >= 0 ? recapSectionIndex + ttcIndex : ttcIndex;
  
  // 4. Trouver le montant le plus proche de "HT" dans la section récapitulative
  if (htIndexInFullText >= 0) {
    let closestHT = null;
    let minDistance = Infinity;
    
    for (const amount of amounts) {
      if (!amount.used) {
        const distance = Math.abs(amount.index - htIndexInFullText);
        if (distance < minDistance && distance < 150) { // Augmenter la distance pour tableaux
          minDistance = distance;
          closestHT = amount;
        }
      }
    }
    
    if (closestHT) {
      result.ht = normalizeNumberFR(closestHT.value);
      closestHT.used = true;
      console.log('[extractAmounts] HT trouvé par proximité:', result.ht, 'distance:', minDistance);
    }
  }
  
  // 5. Trouver le montant le plus proche de "TTC" dans la section récapitulative
  if (ttcIndexInFullText >= 0) {
    let closestTTC = null;
    let minDistance = Infinity;
    
    for (const amount of amounts) {
      if (!amount.used) {
        const distance = Math.abs(amount.index - ttcIndexInFullText);
        if (distance < minDistance && distance < 150) { // Augmenter la distance pour tableaux
          minDistance = distance;
          closestTTC = amount;
        }
      }
    }
    
    if (closestTTC) {
      result.ttc = normalizeNumberFR(closestTTC.value);
      closestTTC.used = true;
      console.log('[extractAmounts] TTC trouvé par proximité:', result.ttc, 'distance:', minDistance);
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
    // ✅ Extraction par proximité (formats tabulaires) avec logs détaillés
    const proximityExtraction = extractAmountsWithContext(text);
    console.log('[parseFR] ===== EXTRACTION PAR PROXIMITÉ =====');
    console.log('[parseFR] Extraction par proximité:', proximityExtraction);
    console.log('[parseFR] ========================================');

    // ✅ Priorité 1 : Format tableau récapitulatif avec pipes
    R.RECAP_HT.lastIndex = 0;
    const recapHtMatch = R.RECAP_HT.exec(text);
    if (recapHtMatch?.[1]) {
      fields.ht = normalizeNumberFR(recapHtMatch[1]);
      console.log('[parseFR] ✅ HT extrait depuis tableau récapitulatif:', fields.ht);
    }

    R.RECAP_TTC.lastIndex = 0;
    const recapTtcMatch = R.RECAP_TTC.exec(text);
    if (recapTtcMatch?.[1]) {
      fields.ttc = normalizeNumberFR(recapTtcMatch[1]);
      console.log('[parseFR] ✅ TTC extrait depuis tableau récapitulatif:', fields.ttc);
    }

    R.RECAP_TVA.lastIndex = 0;
    const recapTvaMatch = R.RECAP_TVA.exec(text);
    if (recapTvaMatch) {
      fields.tvaPct = normalizePercentFR(recapTvaMatch[1]);
      console.log('[parseFR] ✅ TVA% extrait depuis tableau récapitulatif:', fields.tvaPct);
    }

    // ✅ Priorité 2 : Extraction par proximité (si pas trouvé en tableau)
    if (!fields.ht) {
      fields.ht = proximityExtraction.ht;
    }
    if (!fields.ttc) {
      fields.ttc = proximityExtraction.ttc;
    }

    // ✅ Priorité 3 : Extraction TVA % par regex générique (si pas trouvé en tableau)
    if (!fields.tvaPct) {
      R.TVA_PCT.lastIndex = 0;
      const tvaPctMatch = R.TVA_PCT.exec(text);
      if (tvaPctMatch?.[1]) {
        fields.tvaPct = normalizePercentFR(tvaPctMatch[1]);
      }
    }

    // ✅ Priorité 4 : Extraction HT par regex générique (fallback final)
    if (!fields.ht) {
      R.HT.lastIndex = 0;
      const htMatch = R.HT.exec(text);
      if (htMatch?.[1]) {
        fields.ht = normalizeNumberFR(htMatch[1]);
        console.log('[parseFR] HT extrait par regex générique:', fields.ht);
      }
    }

    // ✅ Extraction TTC par regex générique (fallback final)
    if (!fields.ttc) {
      R.TTC.lastIndex = 0;
      const ttcMatch = R.TTC.exec(text);
      if (ttcMatch?.[1]) {
        fields.ttc = normalizeNumberFR(ttcMatch[1]);
        console.log('[parseFR] TTC extrait par regex générique:', fields.ttc);
      }
    }

    // NET à payer (fallback pour TTC)
    R.NET.lastIndex = 0;
    const netMatch = R.NET.exec(text)?.[1];
    if (netMatch) fields.net = normalizeNumberFR(netMatch);

    // TVA montant : FORCER à null pour éviter les valeurs OCR incorrectes
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

    // ✅ VALIDATION DE COHÉRENCE STRICTE : Détecter les extractions aberrantes
    if (fields.ht && fields.ttc) {
      const ratio = fields.ttc / fields.ht;
      
      // Validation : TTC doit être entre 1.0x et 1.5x HT (TVA française entre 0% et 50%)
      if (ratio < 1.0 || ratio > 1.5) {
        console.error(`[parseFR] ⚠️ INCOHÉRENCE DÉTECTÉE : HT=${fields.ht}, TTC=${fields.ttc}, ratio=${ratio.toFixed(2)}`);
        console.error(`[parseFR] → Ratio TTC/HT anormal (doit être entre 1.0 et 1.5), réinitialisation TTC`);
        
        // Recalculer TTC depuis HT + TVA% si disponible
        if (fields.tvaPct) {
          fields.tvaAmt = Math.round(fields.ht * (fields.tvaPct / 100) * 100) / 100;
          fields.ttc = Math.round((fields.ht + fields.tvaAmt) * 100) / 100;
          console.log(`[parseFR] ✅ TTC recalculé depuis HT+TVA : ${fields.ttc}`);
        } else {
          fields.ttc = null; // Invalider le TTC extrait
        }
      }
    }

    // Vérifier cohérence HT/TTC (si HT >= TTC, probable inversion)
    if (fields.ht && fields.ttc && fields.ht >= fields.ttc) {
      console.warn('[parseFR] HT >= TTC détecté, inversion probable !');
      [fields.ht, fields.ttc] = [fields.ttc, fields.ht];
      console.log('[parseFR] Montants inversés:', { ht: fields.ht, ttc: fields.ttc });
    }

    // ✅ CALCUL OBLIGATOIRE de tvaAmt APRÈS validation
    if (fields.ht != null && fields.tvaPct != null && !fields.tvaAmt) {
      fields.tvaAmt = Math.round(fields.ht * (fields.tvaPct / 100) * 100) / 100;
      console.log('[parseFR] ✅ TVA montant RECALCULÉ depuis HT × TVA%:', fields.tvaAmt);
    }

    // ✅ CALCUL OBLIGATOIRE du TTC si pas déjà fait dans la validation
    if (fields.ht != null && fields.tvaAmt != null && (!fields.ttc || fields.ttc === 0)) {
      fields.ttc = Math.round((fields.ht + fields.tvaAmt) * 100) / 100;
      console.log('[parseFR] ✅ TTC RECALCULÉ depuis HT + tvaAmt:', fields.ttc);
    }

    // Vérification cohérence finale
    const totalsOk = checkTotals(
      fields.ht ?? null,
      fields.tvaPct ?? null,
      fields.tvaAmt ?? null,
      (fields.net ?? fields.ttc ?? null)
    );

    fields.totalsOk = totalsOk;

    // ✅ LOGS FINAUX
    console.log('[parseFR] ===== RÉSULTAT FINAL =====');
    console.log('[parseFR] HT final:', fields.ht);
    console.log('[parseFR] TVA% final:', fields.tvaPct);
    console.log('[parseFR] TVA montant final:', fields.tvaAmt);
    console.log('[parseFR] TTC final:', fields.ttc);
    console.log('[parseFR] Totals OK:', totalsOk);
    console.log('[parseFR] ============================');
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
