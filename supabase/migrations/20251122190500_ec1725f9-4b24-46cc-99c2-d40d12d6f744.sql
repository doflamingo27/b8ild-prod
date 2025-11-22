-- ======================================
-- ÉTAPE 1 : Ajouter les triggers manquants
-- ======================================

-- Trigger pour affectations_chantiers
DROP TRIGGER IF EXISTS t_recalc_aff ON affectations_chantiers;
CREATE TRIGGER t_recalc_aff 
  AFTER INSERT OR UPDATE OR DELETE ON affectations_chantiers
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

-- Trigger pour devis
DROP TRIGGER IF EXISTS t_recalc_devis ON devis;
CREATE TRIGGER t_recalc_devis 
  AFTER INSERT OR UPDATE OR DELETE ON devis
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

-- ======================================
-- ÉTAPE 2 : Modifier trg_recalc_dispatch pour gérer devis
-- ======================================

CREATE OR REPLACE FUNCTION public.trg_recalc_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  _cid UUID;
BEGIN
  -- Identifier le chantier_id selon la table
  IF TG_TABLE_NAME = 'equipe_chantier' THEN
    _cid := COALESCE(NEW.chantier_id, OLD.chantier_id);
  ELSIF TG_TABLE_NAME = 'frais_chantier' THEN
    _cid := COALESCE(NEW.chantier_id, OLD.chantier_id);
  ELSIF TG_TABLE_NAME = 'factures_fournisseurs' THEN
    _cid := COALESCE(NEW.chantier_id, OLD.chantier_id);
  ELSIF TG_TABLE_NAME = 'chantiers' THEN
    _cid := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'membres_equipe' THEN
    SELECT ec.chantier_id INTO _cid
    FROM equipe_chantier ec
    WHERE ec.membre_id = COALESCE(NEW.id, OLD.id)
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'affectations_chantiers' THEN
    _cid := COALESCE(NEW.chantier_id, OLD.chantier_id);
  ELSIF TG_TABLE_NAME = 'devis' THEN
    _cid := COALESCE(NEW.chantier_id, OLD.chantier_id);
  END IF;

  IF _cid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM chantiers WHERE id = _cid) THEN
      INSERT INTO chantier_metrics_realtime(chantier_id, metrics, updated_at)
      VALUES (_cid, compute_chantier_metrics(_cid), now())
      ON CONFLICT (chantier_id) 
      DO UPDATE SET 
        metrics = EXCLUDED.metrics, 
        updated_at = now();
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ======================================
-- ÉTAPE 3 : Recalculer toutes les métriques existantes
-- ======================================

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