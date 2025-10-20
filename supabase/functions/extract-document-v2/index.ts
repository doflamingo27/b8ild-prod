import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[EXTRACT-V2] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Utilitaires de normalisation FR
function normalizeNumberFR(str: string): { value: number | null; confidence: number } {
  if (!str) return { value: null, confidence: 0 };
  
  // Supprimer espaces insécables, points d'espacement, symbole €
  let cleaned = str.replace(/[\u00A0\u202F\s]/g, '')
    .replace(/\./g, '')
    .replace(/€/g, '')
    .replace(/,/g, '.')
    .trim();
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { value: null, confidence: 0 };
  
  // Confiance basée sur la présence de caractères attendus
  const confidence = (str.includes(',') || str.includes('€')) ? 0.9 : 0.7;
  return { value: num, confidence };
}

function normalizeDateFR(str: string): { value: string | null; confidence: number } {
  if (!str) return { value: null, confidence: 0 };
  
  // Format dd/mm/yyyy ou dd-mm-yyyy
  const slashMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return { 
      value: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      confidence: 0.9 
    };
  }
  
  // Format textuel français
  const mois: Record<string, string> = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
  };
  
  const textMatch = str.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
  if (textMatch) {
    const [, day, monthName, year] = textMatch;
    const month = mois[monthName.toLowerCase()];
    if (month) {
      return {
        value: `${year}-${month}-${day.padStart(2, '0')}`,
        confidence: 0.85
      };
    }
  }
  
  return { value: null, confidence: 0 };
}

function checkTotals(
  ht: number | null,
  tvaPct: number | null,
  ttc: number | null,
  precision = 0.02
): { coherent: boolean; confidence: number } {
  if (!ht || !ttc) return { coherent: false, confidence: 0 };
  
  if (tvaPct !== null) {
    const expected = ht * (1 + tvaPct / 100);
    const diff = Math.abs(ttc - expected);
    const coherent = diff <= expected * precision;
    return { 
      coherent,
      confidence: coherent ? 0.95 : 0.3 
    };
  }
  
  // Sans TVA%, vérifier que TTC >= HT
  const coherent = ttc >= ht && ttc <= ht * 1.30; // Max 30% TVA
  return { coherent, confidence: coherent ? 0.7 : 0.2 };
}

// Regex FR pour extraction
const REGEX_PATTERNS = {
  totalHT: /(?:(?:total|montant|sous[-\s]?total)\s*HT)\s*[:=\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  tvaPct: /TVA\s*[:=\-]?\s*(\d{1,2}[.,]?\d{0,2})\s*%/gi,
  tvaMontant: /(?:montant\s*)?TVA\s*(?:\(.*?\))?\s*[:=\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  totalTTC: /(?:(?:total|montant)\s*TTC|net\s*(?:à|a)\s*payer)\s*[:=\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  siret: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/g,
  siren: /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
  numFacture: /(?:n[°o]\s*[:=\-]?\s*|facture\s*[:=\-]?\s*)([A-Z0-9\-\/]+)/gi,
  date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
  aoDateLimite: /date\s*limite.*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
  aoCP: /\b(0[1-9]|[1-8]\d|9[0-5])\d{3}\b/g,
};

function extractWithRegex(text: string, type: 'facture' | 'ao'): any {
  const result: any = {
    type_document: type,
    fournisseur_nom: null,
    siret: null,
    date_document_iso: null,
    totaux: { ht: null, tva_pct: null, tva_montant: null, ttc: null },
    lignes: [],
    ao: null,
    meta: { confiance: 0.4, method: 'regex' }
  };
  
  if (type === 'facture') {
    // Extraire totaux (dernière occurrence = bas du document)
    const htMatches = [...text.matchAll(REGEX_PATTERNS.totalHT)];
    if (htMatches.length > 0) {
      const lastHT = htMatches[htMatches.length - 1][1];
      result.totaux.ht = normalizeNumberFR(lastHT).value;
    }
    
    const tvaMatches = [...text.matchAll(REGEX_PATTERNS.tvaPct)];
    if (tvaMatches.length > 0) {
      result.totaux.tva_pct = normalizeNumberFR(tvaMatches[tvaMatches.length - 1][1]).value;
    }
    
    const tvaMontantMatches = [...text.matchAll(REGEX_PATTERNS.tvaMontant)];
    if (tvaMontantMatches.length > 0) {
      result.totaux.tva_montant = normalizeNumberFR(tvaMontantMatches[tvaMontantMatches.length - 1][1]).value;
    }
    
    const ttcMatches = [...text.matchAll(REGEX_PATTERNS.totalTTC)];
    if (ttcMatches.length > 0) {
      result.totaux.ttc = normalizeNumberFR(ttcMatches[ttcMatches.length - 1][1]).value;
    }
    
    // SIRET
    const siretMatch = text.match(REGEX_PATTERNS.siret);
    if (siretMatch) result.siret = siretMatch[0].replace(/\s/g, '');
    
    // Date
    const dateMatches = text.match(REGEX_PATTERNS.date);
    if (dateMatches && dateMatches.length > 0) {
      result.date_document_iso = normalizeDateFR(dateMatches[0]).value;
    }
    
    // Vérifier cohérence
    const coherence = checkTotals(result.totaux.ht, result.totaux.tva_pct, result.totaux.ttc);
    let confidence = 0.5;
    if (coherence.coherent) confidence += 0.15;
    if (result.siret) confidence += 0.10;
    if (result.date_document_iso) confidence += 0.10;
    if (result.totaux.ht && result.totaux.ttc) confidence += 0.10;
    
    result.meta.confiance = Math.min(confidence, 1.0);
  } else if (type === 'ao') {
    result.ao = {
      titre: null,
      organisme: null,
      reference: null,
      ville: null,
      cp: null,
      montant_estime: null,
      date_limite_iso: null
    };
    
    const dateLimiteMatch = text.match(REGEX_PATTERNS.aoDateLimite);
    if (dateLimiteMatch) {
      result.ao.date_limite_iso = normalizeDateFR(dateLimiteMatch[1]).value;
    }
    
    const cpMatch = text.match(REGEX_PATTERNS.aoCP);
    if (cpMatch) result.ao.cp = cpMatch[0];
    
    result.meta.confiance = (result.ao.date_limite_iso ? 0.6 : 0.4);
  }
  
  return result;
}

async function extractWithLLM(text: string, type: 'facture' | 'ao'): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");
  
  const systemPrompt = `Tu es un extracteur de documents FR pour le BTP. Tu renvoies STRICTEMENT un JSON valide conforme au schéma. Pas de texte hors JSON.`;
  
  const userPrompt = `Analyse ce document et renvoie :
{
  "type_document": "${type}",
  "fournisseur_nom": "...",
  "siret": "...",
  "date_document_iso": "YYYY-MM-DD",
  "totaux": { "ht": number, "tva_pct": number|null, "tva_montant": number|null, "ttc": number },
  "lignes": [],
  "ao": ${type === 'ao' ? '{ "titre": "...", "organisme": "...", "reference": "...", "ville": "...", "cp": "...", "montant_estime": number|null, "date_limite_iso": "YYYY-MM-DD" }' : 'null'},
  "meta": { "confiance": 0.0-1.0, "method": "llm" }
}

Règles:
- Formats FR, convertis virgules en décimales
- Prends les derniers totaux (bas de page)
- Si TTC cohérent avec HT/TVA, augmente confiance
- Dates ISO, valeurs numériques

Document:
${text.slice(0, 25000)}`;
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1
    })
  });
  
  if (!response.ok) throw new Error(`LLM error: ${response.status}`);
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Pas de contenu LLM");
  
  // Extraire JSON du contenu (peut être entouré de ```json)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON invalide dans réponse LLM");
  
  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Début extraction v2");
    
    const { fileUrl, documentType } = await req.json();
    if (!fileUrl || !documentType) {
      throw new Error("fileUrl et documentType requis");
    }
    
    logStep("Téléchargement fichier", { fileUrl, documentType });
    
    // Télécharger le fichier
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) throw new Error("Impossible de télécharger le fichier");
    
    const blob = await fileResponse.blob();
    const fileSize = blob.size;
    
    logStep("Fichier téléchargé", { size: fileSize });
    
    // Limite 20 Mo
    if (fileSize > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ 
        error: "Fichier trop volumineux (max 20 Mo). Compressez ou scindez le document." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = blob.type || "application/pdf";
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    logStep("Fichier encodé base64");
    
    // Pipeline d'extraction
    let extractedData: any = null;
    let bestConfidence = 0;
    
    // Étape 1: Tentative regex directe sur texte (si c'est un PDF texte natif simulé)
    // Note: Dans un vrai système, on utiliserait pdf.js ou similaire
    // Pour cette démo, on va directement à l'OCR/LLM
    
    // Étape 2: OCR via LLM Vision (Gemini peut lire les images/PDF)
    logStep("Tentative extraction via LLM Vision");
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");
      
      const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extrait le texte complet de ce document ${documentType}. Préserve la structure et la mise en page.`
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl }
                }
              ]
            }
          ]
        })
      });
      
      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const ocrText = visionData.choices?.[0]?.message?.content || "";
        logStep("OCR Vision réussi", { textLength: ocrText.length });
        
        // Appliquer regex sur texte OCR
        const regexResult = extractWithRegex(ocrText, documentType);
        if (regexResult.meta.confiance > bestConfidence) {
          extractedData = regexResult;
          bestConfidence = regexResult.meta.confiance;
          logStep("Regex après OCR", { confidence: bestConfidence });
        }
        
        // Si confiance < 0.75, tenter LLM structuré
        if (bestConfidence < 0.75) {
          logStep("Tentative extraction LLM structurée");
          const llmResult = await extractWithLLM(ocrText, documentType);
          if (llmResult.meta.confiance > bestConfidence) {
            extractedData = llmResult;
            bestConfidence = llmResult.meta.confiance;
            logStep("LLM structuré", { confidence: bestConfidence });
          }
        }
      }
    } catch (err: any) {
      logStep("Erreur extraction", { error: err.message });
    }
    
    // Si toujours < 0.75 → fallback requis
    if (bestConfidence < 0.75) {
      logStep("Extraction partielle, fallback requis", { confidence: bestConfidence });
      return new Response(JSON.stringify({
        success: false,
        needsFallback: true,
        partialData: extractedData,
        confidence: bestConfidence,
        message: "Extraction partielle — champs à confirmer."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    logStep("Extraction réussie", { confidence: bestConfidence });
    return new Response(JSON.stringify({
      success: true,
      data: extractedData,
      confidence: bestConfidence,
      message: "Extraction réussie — vérifiez et enregistrez."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error: any) {
    logStep("ERREUR", { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      needsFallback: true
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});