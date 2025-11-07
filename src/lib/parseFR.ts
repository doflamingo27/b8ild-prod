import { R } from '@/lib/docai/regexFR';
import { normalizeNumberFR, normalizePercentFR, normalizeDateFR, checkTotals } from '@/lib/docai/normalize';

export function parseFrenchDocument(text: string, module: 'factures' | 'frais' | 'ao') {
  const fields: any = {};

  // Extraction factures/frais
  if (module === 'factures' || module === 'frais') {
    const htMatch = R.HT.exec(text)?.[1];
    if (htMatch) fields.ht = normalizeNumberFR(htMatch);

    const ttcMatch = R.TTC.exec(text)?.[1];
    if (ttcMatch) fields.ttc = normalizeNumberFR(ttcMatch);

    const netMatch = R.NET.exec(text)?.[2];
    if (netMatch) fields.net = normalizeNumberFR(netMatch);

    const tvaPctMatch = R.TVA_PCT.exec(text)?.[1];
    if (tvaPctMatch) fields.tvaPct = normalizePercentFR(tvaPctMatch);

    const tvaAmtMatch = R.TVA_AMT.exec(text)?.[1];
    if (tvaAmtMatch) fields.tvaAmt = normalizeNumberFR(tvaAmtMatch);

    const siretMatch = text.match(R.SIRET)?.[0];
    if (siretMatch) fields.siret = siretMatch;

    const fournisseurMatch = R.FOURNISSEUR.exec(text)?.[1];
    if (fournisseurMatch) fields.fournisseur = fournisseurMatch.trim();

    const numFactMatch = R.NUM_FACT.exec(text)?.[2];
    if (numFactMatch) fields.numFacture = numFactMatch;

    const dateMatch = [...text.matchAll(R.DATE)][0]?.[1];
    if (dateMatch) fields.dateDoc = normalizeDateFR(dateMatch);

    // Vérification cohérence HT/TVA/TTC
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
    const deadlineMatch = R.AO_DEADLINE.exec(text)?.[2];
    if (deadlineMatch) fields.aoDeadline = normalizeDateFR(deadlineMatch);

    const budgetMatch = R.AO_BUDGET.exec(text)?.[2];
    if (budgetMatch) fields.aoBudget = normalizeNumberFR(budgetMatch);

    const refMatch = R.AO_REF.exec(text)?.[2];
    if (refMatch) fields.aoRef = refMatch;

    const orgaMatch = R.AO_ORGA.exec(text)?.[2];
    if (orgaMatch) fields.aoOrga = orgaMatch.trim();

    const cpMatch = [...text.matchAll(R.AO_CP)][0]?.[0];
    if (cpMatch) fields.aoCP = cpMatch;
  }

  return fields;
}
