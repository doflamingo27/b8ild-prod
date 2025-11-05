import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SecureInsertData {
  table: 'factures_fournisseurs' | 'frais_chantier' | 'tenders';
  data: Record<string, any>;
  entrepriseId: string;
}

export const useSecureInsert = () => {
  const { toast } = useToast();

  const secureInsert = async ({ table, data, entrepriseId }: SecureInsertData): Promise<string | null> => {
    try {
      console.log(`[SecureInsert] Calling RPC for table: ${table}`, { entrepriseId, data });
      
      const { data: result, error } = await supabase.rpc('insert_extraction_service', {
        p_table: table,
        p_data: data,
        p_entreprise_id: entrepriseId
      });

      if (error) {
        console.error('[SecureInsert] RPC error:', error);
        
        const isRLSError = error.message?.includes('row-level security') || 
                          error.message?.includes('policy') ||
                          error.message?.includes('not authorized') ||
                          error.code === '42501';
        
        toast({
          title: "Erreur d'enregistrement",
          description: isRLSError 
            ? "Accès non autorisé (RLS). Vérifiez l'entreprise du compte et réessayez."
            : error.message,
          variant: "destructive",
        });
        
        return null;
      }

      console.log('[SecureInsert] Success, new ID:', result);
      
      toast({
        title: "Enregistré",
        description: "Extraction enregistrée avec succès.",
      });

      return result as string;
    } catch (error: any) {
      console.error('[SecureInsert] Exception:', error);
      
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les données.",
        variant: "destructive",
      });
      
      return null;
    }
  };

  return { secureInsert };
};
