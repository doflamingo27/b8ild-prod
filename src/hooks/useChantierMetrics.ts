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
  marge_finale: number;
  marge_finale_pct: number;
  statut_rentabilite: 'VERT' | 'JAUNE' | 'ORANGE' | 'ROUGE';
}

export function useChantierMetrics(chantierId: string) {
  const [metrics, setMetrics] = useState<ChantierMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetrics() {
    if (!chantierId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useChantierMetrics] 🔍 Fetching for:', chantierId);

      // 1. Essayer de récupérer depuis chantier_metrics_realtime
      const { data, error: fetchError } = await supabase
        .from('chantier_metrics_realtime')
        .select('metrics')
        .eq('chantier_id', chantierId)
        .maybeSingle();

      if (fetchError) {
        console.error('[useChantierMetrics] ❌ Error fetching:', fetchError);
        setError(fetchError.message);
      } else if (data?.metrics) {
        console.log('[useChantierMetrics] ✅ Metrics found:', data.metrics);
        setMetrics(data.metrics as unknown as ChantierMetrics);
      } else {
        // 2. Pas de métriques → les calculer ET les stocker
        console.log('[useChantierMetrics] 🔄 No metrics, computing...');
        const { data: calcData, error: calcError } = await supabase
          .rpc('compute_chantier_metrics', { p_chantier: chantierId });

        if (calcError) {
          console.error('[useChantierMetrics] ❌ Error computing:', calcError);
          setError(calcError.message);
        } else if (calcData) {
          console.log('[useChantierMetrics] ✅ Computed metrics:', calcData);
          setMetrics(calcData as unknown as ChantierMetrics);
          
          // 3. Les stocker pour le Realtime (upsert pour éviter les doublons)
          const { error: upsertError } = await supabase
            .from('chantier_metrics_realtime')
            .upsert({
              chantier_id: chantierId,
              metrics: calcData,
              updated_at: new Date().toISOString()
            });

          if (upsertError) {
            console.error('[useChantierMetrics] ⚠️ Error upserting:', upsertError);
          } else {
            console.log('[useChantierMetrics] ✅ Metrics stored for realtime');
          }
        }
      }
    } catch (err: any) {
      console.error('[useChantierMetrics] 💥 Exception:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!chantierId) return;

    fetchMetrics();

    // S'abonner aux changements en temps réel
    console.log('[useChantierMetrics] 🔌 Subscribing to realtime updates...');
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
          console.log('[useChantierMetrics] 🔴 Realtime update received:', payload);
          const newMetrics = (payload.new as any)?.metrics;
          if (newMetrics) {
            console.log('[useChantierMetrics] ✅ Updating metrics from realtime:', newMetrics);
            setMetrics(newMetrics as unknown as ChantierMetrics);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useChantierMetrics] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[useChantierMetrics] 🔌 Unsubscribing from channel');
      supabase.removeChannel(channel);
    };
  }, [chantierId]);

  return { metrics, loading, error, refresh: fetchMetrics };
}
