import { supabase } from '@/integrations/supabase/client';

export async function saveExtraction(
  table: 'factures_fournisseurs' | 'frais_chantier' | 'tenders',
  entrepriseId: string,
  payload: any
): Promise<string> {
  try {
    console.log('[saveExtraction]', { table, entrepriseId, payload });
    
    const { data, error } = await supabase.rpc('insert_extraction_service', {
      p_table: table,
      p_data: payload,
      p_entreprise_id: entrepriseId,
    });
    
    if (error) {
      console.error('[saveExtraction] RPC error:', error);
      
      if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        throw new Error('Accès non autorisé. Vérifiez vos permissions.');
      }
      if (error.message?.includes('violates check constraint')) {
        throw new Error('Données invalides. Vérifiez les champs obligatoires.');
      }
      if (error.message?.includes('duplicate key')) {
        throw new Error('Cet enregistrement existe déjà.');
      }
      
      throw error;
    }
    
    console.log('[saveExtraction] Success:', data);
    return data as string;
  } catch (err: any) {
    console.error('[saveExtraction] Exception:', err);
    throw err;
  }
}
