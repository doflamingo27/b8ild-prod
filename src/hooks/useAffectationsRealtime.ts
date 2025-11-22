import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour s'abonner aux changements des affectations d'un chantier en temps réel
 */
export function useAffectationsRealtime(
  chantierId: string | null,
  onChange: () => void
) {
  useEffect(() => {
    if (!chantierId) return;

    const channel = supabase
      .channel(`affectations:${chantierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'affectations_chantiers',
          filter: `chantier_id=eq.${chantierId}`,
        },
        () => {
          console.log('[useAffectationsRealtime] Changement détecté pour chantier:', chantierId);
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chantierId, onChange]);
}
