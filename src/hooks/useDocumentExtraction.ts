import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ExtractionResult {
  success: boolean;
  needsFallback: boolean;
  data?: any;
  partialData?: any;
  confidence?: number;
  message?: string;
}

export const useDocumentExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const extractDocument = async (
    file: File,
    documentType: 'facture' | 'frais' | 'ao'
  ): Promise<ExtractionResult> => {
    setIsExtracting(true);
    
    try {
      // Vérifier taille fichier (20 Mo max)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "Limite: 20 Mo. Compressez ou scindez le document.",
          variant: "destructive"
        });
        return { success: false, needsFallback: true };
      }
      
      // Upload temporaire
      const bucket = documentType === 'ao' ? 'documents' : (documentType === 'facture' ? 'factures' : 'devis');
      const tempPath = `temp-${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(tempPath, file);
      
      if (uploadError) throw uploadError;
      
      // Générer URL signée
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(tempPath, 3600);
      
      if (!urlData?.signedUrl) throw new Error("Impossible de générer l'URL signée");
      
      toast({
        title: "Extraction en cours...",
        description: "Analyse du document avec IA."
      });
      
      // Appeler l'edge function d'extraction
      const { data, error } = await supabase.functions.invoke('extract-document-v2', {
        body: {
          fileUrl: urlData.signedUrl,
          documentType: documentType === 'frais' ? 'facture' : documentType
        }
      });
      
      // Nettoyer le fichier temporaire
      await supabase.storage.from(bucket).remove([tempPath]);
      
      if (error) {
        console.error('[EXTRACTION] Error:', error);
        return {
          success: false,
          needsFallback: true,
          message: "Erreur lors de l'extraction"
        };
      }
      
      if (data.needsFallback) {
        toast({
          title: "Extraction partielle",
          description: data.message || "Certains champs nécessitent une confirmation.",
          variant: "default"
        });
        
        return {
          success: false,
          needsFallback: true,
          partialData: data.partialData || data.data,
          confidence: data.confidence
        };
      }
      
      toast({
        title: "Extraction réussie",
        description: data.message || "Vérifiez les données extraites."
      });
      
      return {
        success: true,
        needsFallback: false,
        data: data.data,
        confidence: data.confidence
      };
      
    } catch (error: any) {
      console.error('[EXTRACTION] Exception:', error);
      toast({
        title: "Erreur d'extraction",
        description: error.message || "Impossible d'extraire les données",
        variant: "destructive"
      });
      
      return {
        success: false,
        needsFallback: true,
        message: error.message
      };
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    extractDocument,
    isExtracting
  };
};