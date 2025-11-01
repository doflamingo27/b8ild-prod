export async function extractWithOcrSpace(file: File): Promise<{
  text: string;
  confidence: number;
  provider: string;
}> {
  // Validation taille (OCR.space gratuit limite à 5 Mo)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Fichier trop volumineux (max 5 Mo pour OCR.space gratuit)');
  }

  // Appel API OCR.space avec les bons paramètres
  const form = new FormData();
  form.append('file', file);
  form.append('language', 'fre,eng');      // Français prioritaire
  form.append('isCreateSearchablePdf', 'false');
  form.append('scale', 'true');            // Améliore la qualité OCR
  form.append('OCREngine', '2');           // Engine 2 = meilleur pour français

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 
      apikey: import.meta.env.VITE_OCRSPACE_API_KEY || '' 
    },
    body: form
  });

  const json = await response.json();

  // Gestion erreurs
  if (!response.ok || json.IsErroredOnProcessing) {
    const errorMsg = json.ErrorMessage?.[0] || json.ErrorDetails || 'OCR failed';
    throw new Error(`OCR.space : ${errorMsg}`);
  }

  // Extraction du texte
  const parsedText = json.ParsedResults
    ?.map((result: any) => result.ParsedText)
    .join('\n') || '';

  if (!parsedText || parsedText.trim().length < 10) {
    throw new Error('Document vide ou illisible. Essayez avec une meilleure qualité.');
  }

  // Calcul confiance basé sur la qualité du texte
  const hasStructure = /total|montant|tva|facture|siret/i.test(parsedText);
  const confidence = hasStructure ? 0.75 : 0.55;

  return {
    text: parsedText,
    confidence,
    provider: 'ocrspace'
  };
}
