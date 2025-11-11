-- Corriger la fonction insert_devis_extraction pour gérer correctement le flag actif

CREATE OR REPLACE FUNCTION public.insert_devis_extraction(
  p_entreprise_id UUID,
  p_chantier_id UUID,
  p_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_id UUID;
  v_montant_ht NUMERIC;
  v_tva NUMERIC;
  v_montant_ttc NUMERIC;
  v_version TEXT;
  v_max_version INT;
  v_is_first_devis BOOLEAN;
BEGIN
  -- Vérifier les permissions
  IF p_entreprise_id != get_current_entreprise() AND jwt_role() != 'service_role' THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_id := gen_random_uuid();

  -- Parser les montants
  v_montant_ht := public.safe_num_fr(p_data->>'montant_ht');
  v_tva := public.safe_pct_fr(p_data->>'tva');
  v_montant_ttc := public.safe_num_fr(p_data->>'montant_ttc');

  -- Auto-incrémenter la version
  SELECT COALESCE(MAX(CAST(REPLACE(version, 'V', '') AS INTEGER)), 0) + 1
  INTO v_max_version
  FROM devis
  WHERE chantier_id = p_chantier_id;
  
  v_version := 'V' || v_max_version;
  v_is_first_devis := (v_max_version = 1);

  -- ✅ Désactiver tous les autres devis SEULEMENT si c'est le premier
  IF v_is_first_devis THEN
    UPDATE devis SET actif = false WHERE chantier_id = p_chantier_id;
  END IF;

  -- Insérer le nouveau devis
  INSERT INTO devis (
    id, chantier_id, montant_ht, tva, montant_ttc, version, statut, actif,
    extraction_json, confiance, pages_count, created_at
  ) VALUES (
    v_id, p_chantier_id, v_montant_ht, v_tva, v_montant_ttc, v_version,
    COALESCE(p_data->>'statut', 'brouillon'),
    v_is_first_devis, -- ✅ Actif SEULEMENT si c'est le premier devis
    p_data->'extraction_json',
    (p_data->>'confiance')::NUMERIC,
    (p_data->>'pages_count')::INTEGER,
    NOW()
  );

  RETURN v_id;
END;
$function$;