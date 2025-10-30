-- Fix montant_ht nullable and add extraction_status

-- 1) Retirer la contrainte NOT NULL de montant_ht
ALTER TABLE factures_fournisseurs 
  ALTER COLUMN montant_ht DROP NOT NULL;

-- 2) Retirer le default 0 (évite les faux montants)
ALTER TABLE factures_fournisseurs 
  ALTER COLUMN montant_ht DROP DEFAULT;

-- 3) Mettre à jour les lignes avec montant_ht = 0 vers NULL (nettoyage)
UPDATE factures_fournisseurs 
SET montant_ht = NULL 
WHERE montant_ht = 0 AND (montant_ttc IS NULL OR montant_ttc = 0);

-- 4) Même chose pour montant_ttc
ALTER TABLE factures_fournisseurs 
  ALTER COLUMN montant_ttc DROP NOT NULL;

-- 5) Ajouter colonne extraction_status
ALTER TABLE factures_fournisseurs 
  ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'complete'
  CHECK (extraction_status IN ('complete', 'incomplete', 'manual'));

-- 6) Mettre à jour la RPC pour gérer extraction_status
CREATE OR REPLACE FUNCTION public.insert_extraction_service(p_table text, p_data jsonb, p_entreprise_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id UUID;
  r TEXT := public.jwt_role();
  v_montant_ht numeric;
  v_tva_pct numeric;
  v_tva_montant numeric;
  v_montant_ttc numeric;
  v_status TEXT := 'complete';
BEGIN
  -- Autoriser service_role OU user de la même entreprise
  IF NOT (r = 'service_role' OR p_entreprise_id = public.get_current_entreprise()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_table = 'factures_fournisseurs' THEN
    -- Parsing sécurisé avec fonctions SQL
    v_montant_ht := public.safe_num_fr(p_data->>'montant_ht');
    v_tva_pct := public.safe_pct_fr(p_data->>'tva_pct');
    v_tva_montant := public.safe_num_fr(p_data->>'tva_montant');
    v_montant_ttc := public.safe_num_fr(coalesce(p_data->>'montant_ttc', p_data->>'net'));

    -- Déterminer le statut d'extraction
    IF v_montant_ht IS NULL AND v_montant_ttc IS NULL THEN
      v_status := 'incomplete';
    END IF;

    INSERT INTO public.factures_fournisseurs (
      entreprise_id, created_by, chantier_id,
      fournisseur, montant_ht, tva_pct, tva_montant, montant_ttc,
      categorie, fichier_url, extraction_json, confiance, siret, date_facture,
      extraction_status
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'chantier_id')::uuid,
      (p_data->>'fournisseur')::text,
      v_montant_ht,
      v_tva_pct,
      v_tva_montant,
      v_montant_ttc,
      (p_data->>'categorie')::text,
      (p_data->>'fichier_url')::text,
      p_data,
      (p_data->>'confiance')::numeric,
      (p_data->>'siret')::text,
      (p_data->>'date_facture')::date,
      v_status
    )
    RETURNING id INTO new_id;

  ELSIF p_table = 'frais_chantier' THEN
    INSERT INTO public.frais_chantier (
      entreprise_id, created_by, chantier_id,
      type_frais, montant_total, fournisseur_nom, siret,
      date_frais, description, extraction_json, confiance
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'chantier_id')::uuid,
      (p_data->>'type_frais')::text,
      public.safe_num_fr(p_data->>'montant_total'),
      (p_data->>'fournisseur_nom')::text,
      (p_data->>'siret')::text,
      (p_data->>'date_frais')::date,
      (p_data->>'description')::text,
      p_data,
      (p_data->>'confiance')::numeric
    )
    RETURNING id INTO new_id;

  ELSIF p_table = 'tenders' THEN
    INSERT INTO public.tenders (
      entreprise_id, created_by,
      title, buyer, category, description,
      city, postal_code, department,
      budget_min, budget_max, deadline,
      source, source_url, dce_url,
      hash_contenu, extraction_json, confiance
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'title')::text,
      (p_data->>'buyer')::text,
      (p_data->>'category')::text,
      (p_data->>'description')::text,
      (p_data->>'city')::text,
      (p_data->>'postal_code')::text,
      (p_data->>'department')::text,
      public.safe_num_fr(p_data->>'budget_min'),
      public.safe_num_fr(p_data->>'budget_max'),
      (p_data->>'deadline')::date,
      (p_data->>'source')::text,
      (p_data->>'source_url')::text,
      (p_data->>'dce_url')::text,
      (p_data->>'hash')::text,
      p_data,
      (p_data->>'confiance')::numeric
    )
    ON CONFLICT (entreprise_id, hash_contenu) 
    WHERE hash_contenu IS NOT NULL
    DO UPDATE SET
      title = EXCLUDED.title,
      buyer = EXCLUDED.buyer,
      extraction_json = EXCLUDED.extraction_json,
      updated_at = NOW()
    RETURNING id INTO new_id;

  ELSE
    RAISE EXCEPTION 'unsupported table %', p_table;
  END IF;

  RETURN new_id;
END;
$function$;