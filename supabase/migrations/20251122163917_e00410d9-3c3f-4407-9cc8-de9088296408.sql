-- Recalculer les métriques pour tous les chantiers existants
DO $$
DECLARE
  r RECORD;
  new_metrics JSONB;
BEGIN
  FOR r IN SELECT id FROM chantiers LOOP
    -- Calculer les nouvelles métriques avec la logique mise à jour
    new_metrics := compute_chantier_metrics(r.id);
    
    -- Mettre à jour ou insérer dans chantier_metrics_realtime
    INSERT INTO chantier_metrics_realtime(chantier_id, metrics, updated_at)
    VALUES (r.id, new_metrics, now())
    ON CONFLICT (chantier_id) 
    DO UPDATE SET 
      metrics = EXCLUDED.metrics, 
      updated_at = now();
  END LOOP;
END $$;