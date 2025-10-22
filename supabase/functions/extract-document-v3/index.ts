import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// UTILITAIRES DE NORMALISATION
// ============================================================================

function normalizeNumberFR(str: string): { value: number | null; confidence: number } {
  if (!str) return { value: null, confidence: 0 };
  
  let cleaned = str
    .replace(/\s+/g, '')
    .replace(/\u00A0/g, '')
    .replace(/\u202F/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/€/g, '')
    .replace(/EUR/gi, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return { value: null, confidence: 0 };
  
  return { value: parsed, confidence: 0.9 };
}

function normalizeDateFR(str: string): { value: string | null; confidence: number } {
  if (!str) return { value: null, confidence: 0 };
  
  // dd/mm/yyyy ou dd-mm-yyyy
  const datePattern1 = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const match1 = str.match(datePattern1);
  if (match1) {
    let [_, day, month, year] = match1;
    if (year.length === 2) year = '20' + year;
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return { value: date, confidence: 0.85 };
  }
  
  // d mois yyyy (ex: 15 janvier 2024)
  const moisFR: Record<string, string> = {
    'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
  };
  
  const datePattern2 = /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i;
  const match2 = str.match(datePattern2);
  if (match2) {
    const [_, day, month, year] = match2;
    const monthNum = moisFR[month.toLowerCase()];
    if (monthNum) {
      const date = `${year}-${monthNum}-${day.padStart(2, '0')}`;
      return { value: date, confidence: 0.85 };
    }
  }
  
  return { value: null, confidence: 0 };
}

function checkTotalsCoherence(ht: number | null, tvaPct: number | null, ttc: number | null): number {
  if (!ht || !ttc) return 0;
  
  const tolerance = 0.02; // 2%
  const expectedTTC = tvaPct ? ht * (1 + tvaPct / 100) : ht * 1.20; // défaut 20% TVA
  const diff = Math.abs(expectedTTC - ttc) / ttc;
  
  return diff <= tolerance ? 0.25 : 0;
}

// ============================================================================
// BANQUE DE REGEX FR
// ============================================================================

const REGEX_PATTERNS = {
  // Totaux
  totalHT: /(?:(?:total|montant|sous[\s\-]?total)\s*HT)\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  tvaPct: /TVA\s*[:\-]?\s*(\d{1,2}[\.\\,]?\d{0,2})\s*%/gi,
  montantTVA: /TVA\s*(?:\(.*?\))?\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  totalTTC: /(?:(?:total|montant)\s*TTC)\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  netAPayer: /net\s*(?:à|a)\s*payer\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  
  // Identifiants
  siret: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/g,
  siren: /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
  numFacture: /(n[°o]\s*[:\-]?\s*|facture\s*[:\-]?)\s*([A-Z0-9\-\/]+)/gi,
  tvaIntracom: /(?:(?:TVA|VAT)\s*(?:intra\-?com|intracommunautaire))\s*[:\-]?\s*([A-Z]{2}[A-Z0-9]{2,})/gi,
  date: /\b([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})\b/g,
  
  // AO spécifiques
  dateLimite: /date\s*limite.*?([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})/gi,
  codePostal: /\b(0[1-9]|[1-8]\d|9[0-5])\d{3}\b/g,
  montantEstime: /(montant|budget)\s*(estim[ée])\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  referenceAO: /(réf\.|référence)\s*[:\-]?\s*([A-Z0-9\-\/]+)/gi,
};

// ============================================================================
// MOTEUR 1: CSV/XLSX (placeholder, nécessite bibliothèque tierce)
// ============================================================================

function extractFromCSV(content: string): { data: any; confidence: number } {
  // Implémentation simplifiée - détection entêtes communes
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { data: null, confidence: 0 };
  
  const headers = lines[0].toLowerCase().split(/[;,\t]/);
  const hasHT = headers.some(h => h.includes('ht'));
  const hasTVA = headers.some(h => h.includes('tva'));
  const hasTTC = headers.some(h => h.includes('ttc'));
  
  if (hasHT || hasTTC) {
    return { 
      data: { format: 'csv', needsMapping: !hasHT || !hasTTC },
      confidence: hasHT && hasTTC ? 0.85 : 0.50
    };
  }
  
  return { data: null, confidence: 0 };
}

// ============================================================================
// MOTEUR 2: PDF TEXTE + REGEX
// ============================================================================

function extractWithRegex(text: string, type: 'facture' | 'frais' | 'ao'): { data: any; confidence: number; candidates: any } {
  const candidates: any = {};
  let score = 0;
  const extracted: any = { debug: { engine: 'regex', type } };
  
  // Totaux
  const allHT: any[] = [];
  let match;
  while ((match = REGEX_PATTERNS.totalHT.exec(text)) !== null) {
    const result = normalizeNumberFR(match[1]);
    if (result.value !== null) allHT.push(result);
  }
  candidates.totalHT = allHT;
  if (allHT.length > 0) {
    extracted.montant_ht = allHT[allHT.length - 1].value; // dernier = plus probable
    score += 0.20;
  }
  
  const allTVAPct: any[] = [];
  REGEX_PATTERNS.tvaPct.lastIndex = 0;
  while ((match = REGEX_PATTERNS.tvaPct.exec(text)) !== null) {
    const pct = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(pct)) allTVAPct.push({ value: pct, confidence: 0.9 });
  }
  candidates.tvaPct = allTVAPct;
  if (allTVAPct.length > 0) {
    extracted.tva_pct = allTVAPct[allTVAPct.length - 1].value;
    score += 0.10;
  }
  
  const allTVAMontant: any[] = [];
  REGEX_PATTERNS.montantTVA.lastIndex = 0;
  while ((match = REGEX_PATTERNS.montantTVA.exec(text)) !== null) {
    const result = normalizeNumberFR(match[1]);
    if (result.value !== null) allTVAMontant.push(result);
  }
  candidates.montantTVA = allTVAMontant;
  if (allTVAMontant.length > 0) {
    extracted.tva_montant = allTVAMontant[allTVAMontant.length - 1].value;
    score += 0.10;
  }
  
  const allTTC: any[] = [];
  REGEX_PATTERNS.totalTTC.lastIndex = 0;
  while ((match = REGEX_PATTERNS.totalTTC.exec(text)) !== null) {
    const result = normalizeNumberFR(match[1]);
    if (result.value !== null) allTTC.push(result);
  }
  REGEX_PATTERNS.netAPayer.lastIndex = 0;
  while ((match = REGEX_PATTERNS.netAPayer.exec(text)) !== null) {
    const result = normalizeNumberFR(match[1]);
    if (result.value !== null) allTTC.push(result);
  }
  candidates.totalTTC = allTTC;
  if (allTTC.length > 0) {
    extracted.montant_ttc = allTTC[allTTC.length - 1].value;
    score += 0.20;
  }
  
  // Vérification cohérence HT/TVA/TTC
  const coherenceScore = checkTotalsCoherence(
    extracted.montant_ht,
    extracted.tva_pct,
    extracted.montant_ttc
  );
  score += coherenceScore;
  extracted.totals_coherent = coherenceScore > 0;
  
  // Identifiants
  REGEX_PATTERNS.siret.lastIndex = 0;
  const siretMatch = REGEX_PATTERNS.siret.exec(text);
  if (siretMatch) {
    extracted.siret = siretMatch[0].replace(/\s/g, '');
    score += 0.10;
  }
  
  REGEX_PATTERNS.numFacture.lastIndex = 0;
  const numMatch = REGEX_PATTERNS.numFacture.exec(text);
  if (numMatch) {
    extracted.numero_facture = numMatch[2];
    score += 0.05;
  }
  
  // Date
  REGEX_PATTERNS.date.lastIndex = 0;
  const allDates: any[] = [];
  while ((match = REGEX_PATTERNS.date.exec(text)) !== null) {
    const dateResult = normalizeDateFR(match[1]);
    if (dateResult.value) allDates.push(dateResult);
  }
  candidates.dates = allDates;
  if (allDates.length > 0) {
    extracted.date_document_iso = allDates[0].value; // première = date émission probable
    score += 0.10;
  }
  
  // Devise détectée
  if (text.includes('€') || text.match(/EUR/i)) {
    extracted.devise = 'EUR';
    score += 0.10;
  }
  
  // AO spécifiques
  if (type === 'ao') {
    REGEX_PATTERNS.dateLimite.lastIndex = 0;
    const dlMatch = REGEX_PATTERNS.dateLimite.exec(text);
    if (dlMatch) {
      const dateResult = normalizeDateFR(dlMatch[1]);
      if (dateResult.value) {
        extracted.date_limite_candidature = dateResult.value;
        score += 0.15;
      }
    }
    
    REGEX_PATTERNS.codePostal.lastIndex = 0;
    const cpMatch = REGEX_PATTERNS.codePostal.exec(text);
    if (cpMatch) {
      extracted.code_postal = cpMatch[0];
      score += 0.10;
    }
    
    REGEX_PATTERNS.montantEstime.lastIndex = 0;
    const meMatch = REGEX_PATTERNS.montantEstime.exec(text);
    if (meMatch) {
      const result = normalizeNumberFR(meMatch[3]);
      if (result.value !== null) {
        extracted.montant_estime = result.value;
        score += 0.15;
      }
    }
    
    REGEX_PATTERNS.referenceAO.lastIndex = 0;
    const refMatch = REGEX_PATTERNS.referenceAO.exec(text);
    if (refMatch) {
      extracted.reference_externe = refMatch[2];
      score += 0.10;
    }
  }
  
  const confidence = Math.min(score, 1.0);
  
  return { data: extracted, confidence, candidates };
}

// ============================================================================
// MOTEUR 3: OCR (utilise Lovable AI Vision)
// ============================================================================

async function performOCR(base64Content: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error('[OCR] LOVABLE_API_KEY manquant');
    return null;
  }
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrait tout le texte visible dans cette image de document. Renvoie uniquement le texte brut, sans formatage ni commentaire."
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Content}` }
            }
          ]
        }],
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      console.error('[OCR] Erreur API:', response.status);
      return null;
    }
    
    const result = await response.json();
    return result.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('[OCR] Exception:', error);
    return null;
  }
}

// ============================================================================
// MOTEUR 4: TEMPLATES FOURNISSEURS
// ============================================================================

async function applyTemplate(
  text: string,
  supabaseClient: any,
  entrepriseId: string,
  siret?: string,
  fournisseurNom?: string
): Promise<{ data: any; confidence: number } | null> {
  try {
    let query = supabaseClient
      .from('fournisseurs_templates')
      .select('*')
      .eq('entreprise_id', entrepriseId);
    
    if (siret) {
      query = query.eq('siret', siret);
    } else if (fournisseurNom) {
      query = query.ilike('fournisseur_nom', `%${fournisseurNom}%`);
    } else {
      return null;
    }
    
    const { data: templates } = await query.limit(1).single();
    
    if (!templates || !templates.field_positions) return null;
    
    // Application simplifiée : cherche les ancres dans le texte
    const extracted: any = { debug: { engine: 'template', template_id: templates.id } };
    let foundFields = 0;
    
    for (const [field, anchors] of Object.entries(templates.field_positions as any)) {
      for (const anchor of (anchors as any)) {
        if (text.includes(anchor.label)) {
          // Extraction simplifiée autour de l'ancre
          const index = text.indexOf(anchor.label);
          const after = text.substring(index + anchor.label.length, index + anchor.label.length + 50);
          const valueMatch = after.match(/([0-9\s\.,]+)/);
          if (valueMatch) {
            extracted[field] = normalizeNumberFR(valueMatch[1]).value;
            foundFields++;
          }
        }
      }
    }
    
    const confidence = foundFields >= 3 ? 0.85 : 0.50;
    return { data: extracted, confidence };
  } catch (error) {
    console.error('[TEMPLATE] Erreur:', error);
    return null;
  }
}

// ============================================================================
// PIPELINE PRINCIPAL
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { fileUrl, documentType, entrepriseId } = await req.json();
    
    if (!fileUrl || !documentType || !entrepriseId) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: fileUrl, documentType, entrepriseId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const debug: any = { steps: [], timestamp: new Date().toISOString() };
    
    // Téléchargement du fichier
    debug.steps.push({ step: 'download', status: 'start' });
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Échec téléchargement: ${fileResponse.status}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    
    if (fileSize > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: 'Fichier trop volumineux (>20 Mo)',
          message: 'Veuillez compresser ou découper le document avant import.',
          needsFallback: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    debug.steps.push({ step: 'download', status: 'success', size: fileSize });
    
    let bestResult: any = null;
    let bestConfidence = 0;
    
    // MOTEUR 2: PDF TEXTE + REGEX (simulation via OCR)
    debug.steps.push({ step: 'regex_text', status: 'start' });
    
    const ocrText = await performOCR(base64Content);
    
    if (ocrText) {
      debug.steps.push({ step: 'ocr', status: 'success', textLength: ocrText.length });
      
      const regexResult = extractWithRegex(ocrText, documentType === 'ao' ? 'ao' : 'facture');
      debug.steps.push({ 
        step: 'regex_extraction', 
        status: 'success', 
        confidence: regexResult.confidence,
        candidates: regexResult.candidates
      });
      
      if (regexResult.confidence >= 0.80) {
        bestResult = regexResult.data;
        bestConfidence = regexResult.confidence;
      } else if (regexResult.confidence > bestConfidence) {
        bestResult = regexResult.data;
        bestConfidence = regexResult.confidence;
      }
      
      // MOTEUR 4: TEMPLATES (si SIRET détecté)
      if (regexResult.data?.siret) {
        debug.steps.push({ step: 'template_check', status: 'start' });
        const templateResult = await applyTemplate(
          ocrText,
          supabaseClient,
          entrepriseId,
          regexResult.data.siret
        );
        
        if (templateResult && templateResult.confidence > bestConfidence) {
          debug.steps.push({ step: 'template_applied', status: 'success', confidence: templateResult.confidence });
          bestResult = { ...bestResult, ...templateResult.data };
          bestConfidence = templateResult.confidence;
        } else {
          debug.steps.push({ step: 'template_check', status: 'no_match' });
        }
      }
    } else {
      debug.steps.push({ step: 'ocr', status: 'failed', reason: 'Document illisible ou API OCR indisponible' });
    }
    
    // Résultat final
    const needsFallback = bestConfidence < 0.80;
    
    const response = {
      success: !needsFallback,
      needsFallback,
      confidence: bestConfidence,
      data: bestResult,
      partialData: needsFallback ? bestResult : null,
      debug,
      message: bestConfidence >= 0.90 
        ? 'Extraction réussie — vérifiez et enregistrez.'
        : bestConfidence >= 0.80
        ? 'Extraction partielle — quelques champs à confirmer.'
        : bestConfidence >= 0.50
        ? 'Extraction incomplète — utilisez le mapping assisté.'
        : 'Document trop flou ou format non reconnu — mapping manuel requis.'
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[EXTRACTION] Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        needsFallback: true,
        confidence: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
