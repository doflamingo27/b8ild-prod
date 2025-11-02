import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChantierMetrics {
  budget_ht: number;
  date_debut: string | null;
  duree_estimee_jours: number;
  cout_journalier_equipe: number;
  couts_fixes_engages: number;
  jours_ecoules: number;
  cout_main_oeuvre_reel: number;
  marge_a_date: number;
  profitability_pct: number;
  budget_disponible: number;
  jour_critique: number | null;
  jours_restants_rentables: number | null;
  statut_rentabilite: 'VERT' | 'JAUNE' | 'ORANGE' | 'ROUGE';
}

export function useChantierMetrics(chantierId: string) {
  const [metrics, setMetrics] = useState<ChantierMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetrics() {
    try {
      setLoading(true);
      setError(null);

      // Vérifier si les métriques existent déjà
      const { data, error: fetchError } = await supabase
        .from('chantier_metrics_realtime')
        .select('metrics')
        .eq('chantier_id', chantierId)
        .maybeSingle();

      if (fetchError) {
        console.error('[useChantierMetrics] Error fetching:', fetchError);
        setError(fetchError.message);
      } else if (data?.metrics) {
        setMetrics(data.metrics as unknown as ChantierMetrics);
      } else {
        // Pas encore de métriques, on les calcule
        const { data: calcData, error: calcError } = await supabase
          .rpc('compute_chantier_metrics', { p_chantier: chantierId });

        if (calcError) {
          console.error('[useChantierMetrics] Error computing:', calcError);
          setError(calcError.message);
        } else if (calcData) {
          setMetrics(calcData as unknown as ChantierMetrics);
        }
      }
    } catch (err: any) {
      console.error('[useChantierMetrics] Exception:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!chantierId) return;

    fetchMetrics();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel(`chantier_metrics:${chantierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chantier_metrics_realtime',
          filter: `chantier_id=eq.${chantierId}`,
        },
        (payload) => {
          console.log('[useChantierMetrics] Realtime update:', payload);
          const newMetrics = (payload.new as any)?.metrics;
          if (newMetrics) {
            setMetrics(newMetrics as unknown as ChantierMetrics);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chantierId]);

  return { metrics, loading, error, refresh: fetchMetrics };
}
