-- Corriger la fonction trg_recalc_dispatch pour gérer les suppressions de chantiers
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
    -- Si un membre change, recalculer tous ses chantiers
    SELECT ec.chantier_id INTO _cid
    FROM equipe_chantier ec
    WHERE ec.membre_id = COALESCE(NEW.id, OLD.id)
    LIMIT 1;
  END IF;

  -- Recalculer et stocker dans la table realtime SEULEMENT si le chantier existe encore
  IF _cid IS NOT NULL THEN
    -- Vérifier si le chantier existe avant d'insérer les métriques
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