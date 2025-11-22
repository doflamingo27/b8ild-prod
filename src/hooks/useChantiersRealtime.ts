import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook réutilisable pour gérer les abonnements Realtime sur les chantiers et leurs métriques
 * @param entrepriseId - ID de l'entreprise pour filtrer les chantiers
 * @param onChange - Fonction callback appelée lors de changements
 */
export function useChantiersRealtime(
  entrepriseId: string | null,
  onChange: () => void
) {
  useEffect(() => {
    if (!entrepriseId) return;

    // Canal pour les changements sur la table chantiers
    const chantiersChannel = supabase
      .channel(`chantiers:${entrepriseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chantiers',
          filter: `entreprise_id=eq.${entrepriseId}`,
        },
        onChange
      )
      .subscribe();

    // Canal pour les changements sur les métriques temps réel
    const metricsChannel = supabase
      .channel(`chantiers-metrics:${entrepriseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chantier_metrics_realtime',
        },
        onChange
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(chantiersChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [entrepriseId, onChange]);
}
