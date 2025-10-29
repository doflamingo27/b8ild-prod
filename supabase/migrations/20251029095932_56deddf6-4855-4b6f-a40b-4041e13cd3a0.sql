-- Rendre chantier_id nullable dans factures_fournisseurs
ALTER TABLE factures_fournisseurs 
ALTER COLUMN chantier_id DROP NOT NULL;

-- Ajouter un index pour faciliter la recherche des factures non affectées
CREATE INDEX idx_factures_fournisseurs_chantier_null 
ON factures_fournisseurs (entreprise_id) 
WHERE chantier_id IS NULL;

-- Mettre à jour la fonction RPC pour gérer chantier_id NULL
CREATE OR REPLACE FUNCTION public.insert_extraction_service(
  p_table text, 
  p_data jsonb, 
  p_entreprise_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id UUID;
  r TEXT := public.jwt_role();
BEGIN
  -- Autoriser service_role OU user de la même entreprise
  IF NOT (r = 'service_role' OR p_entreprise_id = public.get_current_entreprise()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_table = 'factures_fournisseurs' THEN
    INSERT INTO public.factures_fournisseurs (
      entreprise_id, created_by, chantier_id,
      fournisseur, montant_ht, tva_pct, tva_montant,
      categorie, fichier_url, extraction_json, confiance, siret, date_facture
    ) VALUES (
      p_entreprise_id, auth.uid(),
      (p_data->>'chantier_id')::uuid,
      (p_data->>'fournisseur')::text,
      (p_data->>'montant_ht')::numeric,
      (p_data->>'tva_pct')::numeric,
      (p_data->>'tva_montant')::numeric,
      (p_data->>'categorie')::text,
      (p_data->>'fichier_url')::text,
      p_data,
      (p_data->>'confiance')::numeric,
      (p_data->>'siret')::text,
      (p_data->>'date_facture')::date
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
      (p_data->>'montant_total')::numeric,
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
      (p_data->>'budget_min')::numeric,
      (p_data->>'budget_max')::numeric,
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