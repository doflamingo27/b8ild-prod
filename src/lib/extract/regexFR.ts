export const R = {
  // ✅ Nouvelle regex : Format tableau récapitulatif avec pipes
  RECAP_HT: /\|\s*(?:total|montant\s+total)\s*h\.?t\.?\s*\|\s*([0-9\s\.,]+)\s*€?\s*\|/gi,
  RECAP_TTC: /\|\s*(?:total|montant\s+total)\s*t\.?t\.?c\.?\s*\|\s*([0-9\s\.,]+)\s*€?\s*\|/gi,
  RECAP_TVA: /\|\s*t\.?v\.?a\.?\s*(?:à|a)?\s*(\d{1,2})\s*%\s*\|\s*([0-9\s\.,]+)\s*€?\s*\|/gi,
  
  // ✅ HT : ajouter variantes devis (Montant total HT, Total général HT)
  HT: /(?:\|?\s*)?(?:(?:total|montant|sous[\s\-]?total|base|montant\s+total|total\s+g[ée]n[ée]ral)\s*(?:h\.?t\.?|hors\s*taxes?))\s*[\|\s:]+([0-9\s\.,]+)\s*€?/gi,
  
  // ✅ TVA % : accepter "TVA à 20%", "TVA 20", "TVA: 20%", pipes + espaces
  TVA_PCT: /(?:\|?\s*)?t\.?v\.?a\.?\s*(?:à|a)?\s*(?:\([^\)]*\))?\s*[\|\s]+(\d{1,2}[\.,]?\d{0,2})\s*%?/gi,
  
  // ✅ TVA montant : accepter pipes + espaces (format tableau)
  TVA_AMT: /(?:\|?\s*)?t\.?v\.?a\.?\s*(?:à|a)?\s*\d{1,2}\s*%?\s*[\|\s]+([0-9\s\.,]+)\s*€?/gi,
  
  // ✅ TTC : ajouter variantes devis (Montant total TTC, Total général TTC)
  TTC: /(?:\|?\s*)?(?:(?:total|montant|net|montant\s+total|total\s+g[ée]n[ée]ral)\s*(?:t\.?t\.?c\.?|toutes?\s*taxes\s*comprises?))\s*[\|\s:]+([0-9\s\.,]+)\s*€?/gi,
  
  // ✅ Net à payer : accepter pipes + espaces (format tableau)
  NET: /(?:\|?\s*)?(?:net\s*(?:à|a)\s*payer(?:\s*t\.?t\.?c\.?)?)\s*[\|\s]+([0-9\s\.,]+)\s*€?/gi,
  
  SIRET: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/gi,
  SIREN: /\b\d{3}\s?\d{3}\s?\d{3}\b/gi,
  
  // ✅ N° facture : accepter variantes
  NUM_FACT: /(?:n[°o]\s*[:\-]?\s*|facture\s*[:\-]?\s*|ref\.?\s*[:\-]?\s*)([A-Z0-9\-\/]+)/gi,
  
  DATE: /\b([0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4})\b/g,
  EUR: /€/,
  
  // ✅ AO : variantes élargies (correction des indices de capture)
  AO_DEADLINE: /(?:date\s*limite|date\s*de\s*remise|dépôt\s*des\s*offres)\s*[:\-]?\s*([0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4})/gi,
  AO_CP: /\b(0[1-9]|[1-8]\d|9[0-5])\d{3}\b/g,
  AO_BUDGET: /(?:montant|budget)\s*(?:global|estim[ée]|total)?\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  AO_REF: /(?:réf\.|référence)\s*[:\-]?\s*([A-Z0-9\-\/]+)/gi,
  AO_ORGA: /(?:organisme|acheteur|maître\s*d['']ouvrage|pouvoir\s*adjudicateur)\s*[:\-]?\s*([^\n]+)/gi,
  FOURNISSEUR: /(?:(?:société|entreprise|SA|SARL|SAS|EURL)\s+)?([A-Z][A-Za-z\s\-&'\.]+(?:\s+(?:SA|SARL|SAS|EURL))?)/gi,
};
