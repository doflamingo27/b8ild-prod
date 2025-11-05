import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OCRSPACE_API_KEY = Deno.env.get('OCRSPACE_API_KEY');
    
    if (!OCRSPACE_API_KEY) {
      throw new Error('OCRSPACE_API_KEY not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Validation taille (5 Mo max pour OCR.space gratuit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Fichier trop volumineux (max 5 Mo)');
    }

    console.log('[OCR-EXTRACT] Processing file:', file.name, 'Size:', file.size);

    // Préparer le FormData pour OCR.space
    const ocrForm = new FormData();
    ocrForm.append('file', file);
    ocrForm.append('language', 'fre,eng');
    ocrForm.append('isCreateSearchablePdf', 'false');
    ocrForm.append('scale', 'true');
    ocrForm.append('OCREngine', '2'); // Meilleur pour français

    // Appel à l'API OCR.space
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 
        apikey: OCRSPACE_API_KEY
      },
      body: ocrForm
    });

    if (!response.ok) {
      throw new Error(`OCR.space HTTP error: ${response.status}`);
    }

    const json = await response.json();

    // Gestion des erreurs OCR
    if (json.IsErroredOnProcessing) {
      const errorMsg = json.ErrorMessage?.[0] || json.ErrorDetails || 'OCR processing error';
      throw new Error(`OCR.space: ${errorMsg}`);
    }

    if (!json.ParsedResults || json.ParsedResults.length === 0) {
      throw new Error('Aucun résultat OCR retourné');
    }

    // Extraction du texte
    const parsedText = json.ParsedResults
      .map((result: any) => result.ParsedText)
      .join('\n') || '';

    if (!parsedText || parsedText.trim().length < 10) {
      throw new Error('Document vide ou illisible');
    }

    // Calcul de la confiance
    const hasStructure = /total|montant|tva|facture|siret/i.test(parsedText);
    const confidence = hasStructure ? 0.75 : 0.55;

    console.log('[OCR-EXTRACT] Success - Text length:', parsedText.length, 'Confidence:', confidence);

    return new Response(
      JSON.stringify({
        text: parsedText,
        confidence,
        provider: 'ocrspace'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[OCR-EXTRACT] Error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'OCR extraction failed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
