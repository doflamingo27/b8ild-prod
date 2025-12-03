import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[OCR-CLAUDE-VISION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Normalisation des nombres français (1 234,56 € -> 1234.56)
function normalizeNumberFR(str: string): number | null {
  if (!str) return null;

  let cleaned = str
    .replace(/[\u00A0\u202F\s]/g, '') // Espaces insécables
    .replace(/\./g, '')                // Points de milliers
    .replace(/€/g, '')                 // Symbole euro
    .replace(/,/g, '.')                // Virgule -> point
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Normalisation des dates françaises
function normalizeDateFR(str: string): string | null {
  if (!str) return null;

  // Format dd/mm/yyyy ou dd-mm-yyyy
  const slashMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format textuel français (15 janvier 2024)
  const mois: Record<string, string> = {
    'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
  };

  const textMatch = str.match(/(\d{1,2})\s+([a-zéûè]+)\s+(\d{4})/i);
  if (textMatch) {
    const [, day, monthName, year] = textMatch;
    const month = mois[monthName.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Début extraction Claude Vision");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY non configurée");
    }

    const { fileUrl, documentType, entrepriseId } = await req.json();

    if (!fileUrl) {
      throw new Error("fileUrl requis");
    }

    const docType = documentType || 'facture';
    logStep("Paramètres", { fileUrl: fileUrl.substring(0, 50) + "...", docType, entrepriseId });

    // Télécharger le fichier
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Impossible de télécharger le fichier: ${fileResponse.status}`);
    }

    const blob = await fileResponse.blob();
    const fileSize = blob.size;

    logStep("Fichier téléchargé", { size: fileSize, type: blob.type });

    // Limite 20 Mo
    if (fileSize > 20 * 1024 * 1024) {
      throw new Error("Fichier trop volumineux (max 20 Mo)");
    }

    // Convertir en base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Déterminer le type MIME
    let mediaType = blob.type;
    if (!mediaType || mediaType === "application/octet-stream") {
      if (fileUrl.toLowerCase().includes(".pdf")) mediaType = "application/pdf";
      else if (fileUrl.toLowerCase().includes(".png")) mediaType = "image/png";
      else if (fileUrl.toLowerCase().includes(".jpg") || fileUrl.toLowerCase().includes(".jpeg")) mediaType = "image/jpeg";
      else mediaType = "image/jpeg"; // Fallback
    }

    logStep("Appel API Claude Vision", { mediaType });

    // Prompt d'extraction structuré
    const extractionPrompt = docType === 'ao'
      ? `Analyse cet appel d'offres et extrais les informations suivantes au format JSON strict:
{
  "type_document": "ao",
  "titre": "titre de l'appel d'offres",
  "organisme": "nom de l'organisme/acheteur",
  "reference": "numéro de référence",
  "ville": "ville",
  "code_postal": "code postal",
  "montant_estime": nombre ou null,
  "date_limite": "date limite au format JJ/MM/AAAA",
  "description": "description courte",
  "confiance": 0.0 à 1.0
}

Règles:
- Renvoie UNIQUEMENT le JSON, pas de texte avant/après
- Les montants sont des nombres sans symbole €
- date_limite au format JJ/MM/AAAA
- confiance basée sur la lisibilité et complétude`

      : `Analyse cette facture/devis BTP et extrais les informations suivantes au format JSON strict:
{
  "type_document": "facture",
  "fournisseur": "nom du fournisseur",
  "siret": "numéro SIRET (14 chiffres)",
  "date_document": "date au format JJ/MM/AAAA",
  "numero_facture": "numéro de facture",
  "montant_ht": nombre,
  "tva_pct": nombre (ex: 20 pour 20%),
  "tva_montant": nombre,
  "montant_ttc": nombre,
  "lignes": [
    {"designation": "...", "quantite": nombre, "prix_unitaire": nombre, "montant": nombre}
  ],
  "confiance": 0.0 à 1.0
}

Règles:
- Renvoie UNIQUEMENT le JSON, pas de texte avant/après
- Les montants sont des nombres SANS symbole €, convertis les virgules en points (1 234,56 -> 1234.56)
- Prends les totaux en BAS du document (pas les sous-totaux)
- SIRET = 14 chiffres consécutifs
- TVA en pourcentage (10, 20, etc.)
- confiance: 0.9+ si tous les champs sont lisibles et cohérents`;

    // Appel à l'API Claude Vision
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64
                }
              },
              {
                type: "text",
                text: extractionPrompt
              }
            ]
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      logStep("Erreur API Claude", { status: claudeResponse.status, error: errorText });
      throw new Error(`Erreur API Claude: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text;

    if (!content) {
      throw new Error("Pas de contenu dans la réponse Claude");
    }

    logStep("Réponse Claude reçue", { contentLength: content.length });

    // Extraire le JSON de la réponse
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logStep("JSON non trouvé dans la réponse", { content: content.substring(0, 500) });
      throw new Error("Format JSON invalide dans la réponse");
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logStep("Erreur parsing JSON", { json: jsonMatch[0].substring(0, 500) });
      throw new Error("Impossible de parser le JSON extrait");
    }

    logStep("Données extraites", extractedData);

    // Normaliser les données
    const result = {
      success: true,
      data: {
        type_document: extractedData.type_document || docType,
        fournisseur: extractedData.fournisseur || null,
        siret: extractedData.siret?.replace(/\s/g, '') || null,
        date_document: normalizeDateFR(extractedData.date_document) || extractedData.date_document || null,
        numero_facture: extractedData.numero_facture || null,
        montant_ht: typeof extractedData.montant_ht === 'number'
          ? extractedData.montant_ht
          : normalizeNumberFR(String(extractedData.montant_ht)),
        tva_pct: extractedData.tva_pct || null,
        tva_montant: typeof extractedData.tva_montant === 'number'
          ? extractedData.tva_montant
          : normalizeNumberFR(String(extractedData.tva_montant)),
        montant_ttc: typeof extractedData.montant_ttc === 'number'
          ? extractedData.montant_ttc
          : normalizeNumberFR(String(extractedData.montant_ttc)),
        lignes: extractedData.lignes || [],
        // Champs AO
        titre: extractedData.titre || null,
        organisme: extractedData.organisme || null,
        reference: extractedData.reference || null,
        ville: extractedData.ville || null,
        code_postal: extractedData.code_postal || null,
        montant_estime: extractedData.montant_estime || null,
        date_limite: normalizeDateFR(extractedData.date_limite) || extractedData.date_limite || null,
        description: extractedData.description || null,
      },
      confidence: extractedData.confiance || 0.8,
      provider: "claude-vision",
      message: "Extraction réussie avec Claude Vision"
    };

    // Vérifier cohérence HT/TTC
    if (result.data.montant_ht && result.data.montant_ttc) {
      const ratio = result.data.montant_ttc / result.data.montant_ht;
      if (ratio >= 1.0 && ratio <= 1.25) {
        result.confidence = Math.min(result.confidence + 0.05, 1.0);
      }
    }

    // Si confiance < 0.7, marquer comme nécessitant vérification
    if (result.confidence < 0.7) {
      return new Response(JSON.stringify({
        success: false,
        needsFallback: true,
        partialData: result.data,
        confidence: result.confidence,
        provider: "claude-vision",
        message: "Extraction partielle - vérification manuelle recommandée"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logStep("Extraction réussie", { confidence: result.confidence });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    logStep("ERREUR", { error: error.message });

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      needsFallback: true,
      provider: "claude-vision"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
