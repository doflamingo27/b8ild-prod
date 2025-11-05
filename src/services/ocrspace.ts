import { supabase } from '@/integrations/supabase/client';

export async function extractWithOcrSpace(file: File): Promise<{
  text: string;
  confidence: number;
  provider: string;
}> {
  // Validation taille (OCR.space limite à 5 Mo)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Fichier trop volumineux (max 5 Mo pour OCR.space gratuit)');
  }

  // Préparer le FormData pour l'edge function
  const formData = new FormData();
  formData.append('file', file);

  // Appeler l'edge function sécurisée qui gère l'API key
  const { data, error } = await supabase.functions.invoke('ocr-extract', {
    body: formData,
  });

  if (error) {
    console.error('[OCR] Edge function error:', error);
    throw new Error(error.message || 'Échec de l\'extraction OCR');
  }

  if (!data) {
    throw new Error('Aucune donnée retournée par le service OCR');
  }

  return {
    text: data.text,
    confidence: data.confidence,
    provider: data.provider
  };
}
