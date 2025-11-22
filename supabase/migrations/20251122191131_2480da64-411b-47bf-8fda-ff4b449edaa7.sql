-- Ajouter le trigger manquant pour equipe_chantier
-- Ce trigger permettra de recalculer les métriques quand une équipe complète est ajoutée/modifiée/supprimée

DROP TRIGGER IF EXISTS t_recalc_equipe ON equipe_chantier;
CREATE TRIGGER t_recalc_equipe 
  AFTER INSERT OR UPDATE OR DELETE ON equipe_chantier
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

-- Recalculer toutes les métriques pour s'assurer que tout est à jour
INSERT INTO chantier_metrics_realtime(chantier_id, metrics, updated_at)
SELECT 
  id,
  compute_chantier_metrics(id),
  now()
FROM chantiers
ON CONFLICT (chantier_id) 
DO UPDATE SET 
  metrics = EXCLUDED.metrics, 
  updated_at = now();