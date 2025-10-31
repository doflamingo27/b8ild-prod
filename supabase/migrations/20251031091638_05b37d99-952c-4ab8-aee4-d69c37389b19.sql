-- Élargir précision et ajouter bornes anti-overflow
ALTER TABLE factures_fournisseurs
  ALTER COLUMN montant_ht TYPE NUMERIC(16,2) USING montant_ht::numeric,
  ALTER COLUMN tva_montant TYPE NUMERIC(16,2) USING tva_montant::numeric,
  ALTER COLUMN montant_ttc TYPE NUMERIC(16,2) USING montant_ttc::numeric,
  ALTER COLUMN tva_pct TYPE NUMERIC(5,2) USING tva_pct::numeric;

ALTER TABLE frais_chantier
  ALTER COLUMN montant_total TYPE NUMERIC(16,2) USING montant_total::numeric;

-- Contraintes de bornes sécurisées
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_factures_bounds') THEN
    ALTER TABLE factures_fournisseurs ADD CONSTRAINT chk_factures_bounds
    CHECK (
      (montant_ht IS NULL OR (montant_ht BETWEEN 0 AND 999999999999.99)) AND
      (tva_montant IS NULL OR (tva_montant BETWEEN 0 AND 999999999999.99)) AND
      (montant_ttc IS NULL OR (montant_ttc BETWEEN 0 AND 999999999999.99)) AND
      (tva_pct IS NULL OR (tva_pct BETWEEN 0 AND 100))
    );
  END IF;
END$$;

-- Fonction de parsing sûr pour nombres FR
CREATE OR REPLACE FUNCTION public.safe_num_fr(p_text text, p_max numeric DEFAULT 999999999999.99)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE 
  s text; 
  n numeric;
BEGIN
  IF p_text IS NULL THEN RETURN NULL; END IF;
  
  -- Remplacer espace insécable, supprimer €
  s := regexp_replace(p_text, '\u00A0', ' ', 'g');
  s := replace(replace(replace(s, '€', ''), ' ', ''), '.', '');
  
  -- Remplacer virgule décimale par point
  s := regexp_replace(s, ',(?=\d{1,2}$)', '.', 'g');
  
  -- Garder seulement chiffres, point, signe
  s := regexp_replace(s, '[^0-9\.\-]', '', 'g');
  
  IF s IS NULL OR s = '' OR s = '-' THEN RETURN NULL; END IF;
  
  BEGIN
    n := s::numeric;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  
  IF n < -p_max OR n > p_max THEN RETURN NULL; END IF;
  
  RETURN n;
END$$;

-- Fonction de parsing sûr pour pourcentages FR
CREATE OR REPLACE FUNCTION public.safe_pct_fr(p_text text)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE 
  n numeric := public.safe_num_fr(p_text, 1000);
BEGIN
  IF n IS NULL THEN RETURN NULL; END IF;
  
  -- Si < 1, considérer comme ratio (0.2 -> 20%)
  IF n < 1 THEN n := n * 100; END IF;
  
  -- Borner entre 0 et 100
  IF n < 0 THEN n := 0; END IF;
  IF n > 100 THEN n := 100; END IF;
  
  RETURN round(n::numeric, 2);
END$$;

-- Mettre à jour la RPC pour utiliser les fonctions sûres
CREATE OR REPLACE FUNCTION public.insert_extraction_service(
  p_table text,
  p_entreprise_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_montant_ht numeric;
  v_tva_pct numeric;
  v_tva_montant numeric;
  v_montant_ttc numeric;
  v_montant_total numeric;
  v_extraction_status text := 'complete';
BEGIN
  -- Vérifier les permissions
  IF p_entreprise_id != get_current_entreprise() AND jwt_role() != 'service_role' THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_id := gen_random_uuid();

  -- Parser avec les fonctions sûres
  v_montant_ht := public.safe_num_fr(p_data->>'montant_ht');
  v_tva_pct := public.safe_pct_fr(p_data->>'tva_pct');
  v_tva_montant := public.safe_num_fr(p_data->>'tva_montant');
  v_montant_ttc := public.safe_num_fr(coalesce(p_data->>'montant_ttc', p_data->>'net'));
  v_montant_total := public.safe_num_fr(p_data->>'montant_total');

  -- Déterminer le statut d'extraction
  IF p_table = 'factures_fournisseurs' AND v_montant_ht IS NULL AND v_montant_ttc IS NULL THEN
    v_extraction_status := 'incomplete';
  END IF;

  IF p_table = 'factures_fournisseurs' THEN
    INSERT INTO factures_fournisseurs (
      id, entreprise_id, montant_ht, tva_pct, tva_montant, montant_ttc,
      fournisseur, siret, date_facture, categorie,
      extraction_json, confiance, pages_count, extraction_status, created_at
    ) VALUES (
      v_id, p_entreprise_id, v_montant_ht, v_tva_pct, v_tva_montant, v_montant_ttc,
      p_data->>'fournisseur', p_data->>'siret', (p_data->>'date_facture')::date, 
      coalesce(p_data->>'categorie', 'Autres'),
      p_data->'extraction_json', (p_data->>'confiance')::numeric, 
      (p_data->>'pages_count')::integer, v_extraction_status, now()
    );
  ELSIF p_table = 'frais_chantier' THEN
    INSERT INTO frais_chantier (
      id, entreprise_id, chantier_id, type_frais, montant_total,
      description, fournisseur_nom, siret, date_frais,
      extraction_json, confiance, pages_count, created_at
    ) VALUES (
      v_id, p_entreprise_id, (p_data->>'chantier_id')::uuid,
      coalesce(p_data->>'type_frais', 'Autres'), v_montant_total,
      p_data->>'description', p_data->>'fournisseur_nom', p_data->>'siret',
      (p_data->>'date_frais')::date, p_data->'extraction_json',
      (p_data->>'confiance')::numeric, (p_data->>'pages_count')::integer, now()
    );
  ELSIF p_table = 'tenders' THEN
    INSERT INTO tenders (
      id, entreprise_id, title, buyer, city, postal_code, deadline, budget_min,
      source, extraction_json, confiance, pages_count, created_at
    ) VALUES (
      v_id, p_entreprise_id, p_data->>'title', p_data->>'buyer',
      p_data->>'city', p_data->>'postal_code', (p_data->>'deadline')::date,
      public.safe_num_fr(p_data->>'budget_min'), coalesce(p_data->>'source', 'Import'),
      p_data->'extraction_json', (p_data->>'confiance')::numeric,
      (p_data->>'pages_count')::integer, now()
    );
  END IF;

  RETURN v_id;
END$$;