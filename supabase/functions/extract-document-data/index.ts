import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, documentType } = await req.json();
    console.log('[EXTRACT-DOC] Start extraction', { fileUrl: fileUrl?.substring(0, 100), documentType });
    
    if (!fileUrl) {
      throw new Error("File URL is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Télécharger le fichier
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    
    const fileBlob = await fileResponse.blob();
    const mimeType = fileBlob.type || 'application/pdf';
    console.log('[EXTRACT-DOC] File downloaded', { mimeType, size: fileBlob.size });
    
    const base64File = btoa(String.fromCharCode(...new Uint8Array(await fileBlob.arrayBuffer())));

    // Préparer le prompt selon le type de document
    const systemPrompt = documentType === "quote" 
      ? `Tu es un assistant spécialisé dans l'extraction de données depuis des devis. 
         Extrait les informations suivantes :
         - montant_ht (montant hors taxes en nombre)
         - tva (taux de TVA en nombre, par défaut 20)
         - montant_ttc (montant toutes taxes comprises en nombre)
         Retourne uniquement un JSON avec ces champs.`
      : `Tu es un assistant spécialisé dans l'extraction de données depuis des factures.
         Extrait les informations suivantes :
         - montant_ht (montant hors taxes en nombre)
         - fournisseur (nom du fournisseur)
         - categorie (une parmi: Matériaux, Sous-traitance, Location, Autres)
         - date_facture (au format YYYY-MM-DD si disponible)
         Retourne uniquement un JSON avec ces champs.`;

    // Appeler Lovable AI pour l'extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrait les données de ce document." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_data",
              description: "Extract structured data from document",
              parameters: {
                type: "object",
                properties: documentType === "quote" ? {
                  montant_ht: { type: "number" },
                  tva: { type: "number" },
                  montant_ttc: { type: "number" }
                } : {
                  montant_ht: { type: "number" },
                  fournisseur: { type: "string" },
                  categorie: { type: "string", enum: ["Matériaux", "Sous-traitance", "Location", "Autres"] },
                  date_facture: { type: "string" }
                },
                required: documentType === "quote" 
                  ? ["montant_ht", "montant_ttc"]
                  : ["montant_ht", "categorie"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_data" } }
      }),
    });

    console.log('[EXTRACT-DOC] AI Response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[EXTRACT-DOC] AI Error:', errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('[EXTRACT-DOC] No tool call in response:', JSON.stringify(aiData));
      throw new Error("No data extracted from document");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('[EXTRACT-DOC] Data extracted:', extractedData);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error extracting document data:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
