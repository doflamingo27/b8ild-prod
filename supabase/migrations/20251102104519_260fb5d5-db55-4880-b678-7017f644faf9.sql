-- Ajout des colonnes manquantes si nécessaire
ALTER TABLE chantiers
  ADD COLUMN IF NOT EXISTS budget_ht NUMERIC(16,2),
  ADD COLUMN IF NOT EXISTS duree_estimee_jours INTEGER;

ALTER TABLE membres_equipe
  ADD COLUMN IF NOT EXISTS charges_salariales_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charges_patronales_pct NUMERIC(5,2) DEFAULT 0;

-- Table des métriques en temps réel (pour Realtime)
CREATE TABLE IF NOT EXISTS chantier_metrics_realtime (
  chantier_id UUID PRIMARY KEY REFERENCES chantiers(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS pour chantier_metrics_realtime
ALTER TABLE chantier_metrics_realtime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project metrics"
  ON chantier_metrics_realtime FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = chantier_metrics_realtime.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

-- Table snapshots pour historique (graphiques)
CREATE TABLE IF NOT EXISTS chantier_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  d DATE NOT NULL,
  cout_main_oeuvre NUMERIC(16,2),
  couts_fixes NUMERIC(16,2),
  budget_ht NUMERIC(16,2),
  marge_a_date NUMERIC(16,2),
  profitability_pct NUMERIC(6,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (chantier_id, d)
);

-- RLS pour snapshots
ALTER TABLE chantier_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project snapshots"
  ON chantier_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = chantier_snapshots.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

-- Fonction de calcul des métriques (retourne JSON complet)
CREATE OR REPLACE FUNCTION public.compute_chantier_metrics(p_chantier UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _budget_ht NUMERIC := 0;
  _date_debut DATE;
  _duree_estimee INTEGER := 0;
  _cout_jour_equipe NUMERIC := 0;
  _couts_fixes NUMERIC := 0;
  _jours_ecoules INTEGER := 0;
  _mo_reel NUMERIC := 0;
  _marge_a_date NUMERIC := 0;
  _profit_pct NUMERIC := 0;
  _budget_dispo NUMERIC := 0;
  _jour_critique NUMERIC := NULL;
  _jours_restants_rentables NUMERIC := NULL;
  _statut TEXT := 'VERT';
BEGIN
  -- Récupérer les infos du chantier
  SELECT COALESCE(budget_ht, 0), date_debut, COALESCE(duree_estimee_jours, 0)
    INTO _budget_ht, _date_debut, _duree_estimee
  FROM chantiers WHERE id = p_chantier;

  -- Coût journalier équipe (8h/jour)
  SELECT COALESCE(SUM(
    (m.taux_horaire * (1 + COALESCE(m.charges_salariales, 0)/100 + COALESCE(m.charges_patronales, 0)/100)) * 8
  ), 0)
    INTO _cout_jour_equipe
  FROM equipe_chantier ec
  JOIN membres_equipe m ON m.id = ec.membre_id
  WHERE ec.chantier_id = p_chantier AND m.actif = true;

  -- Coûts fixes engagés (frais + factures)
  SELECT COALESCE(SUM(montant_total), 0) INTO _couts_fixes
  FROM frais_chantier WHERE chantier_id = p_chantier;

  _couts_fixes := _couts_fixes + COALESCE(
    (SELECT SUM(COALESCE(montant_ttc, montant_ht, 0)) 
     FROM factures_fournisseurs 
     WHERE chantier_id = p_chantier), 0
  );

  -- Jours écoulés depuis le début (plafonnés à la durée estimée)
  IF _date_debut IS NOT NULL THEN
    _jours_ecoules := GREATEST(0, LEAST(_duree_estimee, (CURRENT_DATE - _date_debut)));
  ELSE
    _jours_ecoules := 0;
  END IF;

  -- Coût main d'œuvre réel
  _mo_reel := _jours_ecoules * _cout_jour_equipe;

  -- Marge à date et profitabilité
  _marge_a_date := _budget_ht - (_couts_fixes + _mo_reel);
  
  IF _budget_ht > 0 THEN
    _profit_pct := ROUND((_marge_a_date / _budget_ht) * 100, 2);
  ELSE
    _profit_pct := 0;
  END IF;

  -- Budget disponible et jour critique
  _budget_dispo := _budget_ht - _couts_fixes;
  
  IF _cout_jour_equipe > 0 THEN
    _jour_critique := (_budget_dispo / _cout_jour_equipe);
    _jours_restants_rentables := FLOOR(_jour_critique - _jours_ecoules);
  ELSE
    _jour_critique := NULL;
    _jours_restants_rentables := NULL;
  END IF;

  -- Statut couleur selon les règles
  IF _jours_restants_rentables IS NOT NULL THEN
    IF _jours_restants_rentables >= 7 AND _profit_pct >= 10 THEN
      _statut := 'VERT';
    ELSIF (_jours_restants_rentables BETWEEN 3 AND 6) OR (_profit_pct BETWEEN 0 AND 9.99) THEN
      _statut := 'JAUNE';
    ELSIF (_jours_restants_rentables BETWEEN 1 AND 2) OR (_profit_pct BETWEEN -10 AND -0.01) THEN
      _statut := 'ORANGE';
    ELSE
      _statut := 'ROUGE';
    END IF;
  ELSIF _profit_pct >= 10 THEN
    _statut := 'VERT';
  ELSIF _profit_pct < -10 THEN
    _statut := 'ROUGE';
  ELSE
    _statut := 'JAUNE';
  END IF;

  RETURN jsonb_build_object(
    'budget_ht', ROUND(_budget_ht, 2),
    'date_debut', _date_debut,
    'duree_estimee_jours', _duree_estimee,
    'cout_journalier_equipe', ROUND(_cout_jour_equipe, 2),
    'couts_fixes_engages', ROUND(_couts_fixes, 2),
    'jours_ecoules', _jours_ecoules,
    'cout_main_oeuvre_reel', ROUND(_mo_reel, 2),
    'marge_a_date', ROUND(_marge_a_date, 2),
    'profitability_pct', _profit_pct,
    'budget_disponible', ROUND(_budget_dispo, 2),
    'jour_critique', _jour_critique,
    'jours_restants_rentables', _jours_restants_rentables,
    'statut_rentabilite', _statut
  );
END;
$$;

-- Fonction de dispatch pour recalcul automatique
CREATE OR REPLACE FUNCTION trg_recalc_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Recalculer et stocker dans la table realtime
  IF _cid IS NOT NULL THEN
    INSERT INTO chantier_metrics_realtime(chantier_id, metrics, updated_at)
    VALUES (_cid, compute_chantier_metrics(_cid), now())
    ON CONFLICT (chantier_id) 
    DO UPDATE SET 
      metrics = EXCLUDED.metrics, 
      updated_at = now();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers sur toutes les tables impactantes
DROP TRIGGER IF EXISTS t_recalc_eq ON equipe_chantier;
CREATE TRIGGER t_recalc_eq 
  AFTER INSERT OR UPDATE OR DELETE ON equipe_chantier
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

DROP TRIGGER IF EXISTS t_recalc_frais ON frais_chantier;
CREATE TRIGGER t_recalc_frais 
  AFTER INSERT OR UPDATE OR DELETE ON frais_chantier
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

DROP TRIGGER IF EXISTS t_recalc_fact ON factures_fournisseurs;
CREATE TRIGGER t_recalc_fact 
  AFTER INSERT OR UPDATE OR DELETE ON factures_fournisseurs
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

DROP TRIGGER IF EXISTS t_recalc_ch ON chantiers;
CREATE TRIGGER t_recalc_ch 
  AFTER INSERT OR UPDATE ON chantiers
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

DROP TRIGGER IF EXISTS t_recalc_membres ON membres_equipe;
CREATE TRIGGER t_recalc_membres 
  AFTER UPDATE ON membres_equipe
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_dispatch();

-- Fonction pour snapshot quotidien
CREATE OR REPLACE FUNCTION public.snapshot_chantier_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  r RECORD; 
  m JSONB;
BEGIN
  FOR r IN SELECT id FROM chantiers WHERE statut = 'actif' LOOP
    m := compute_chantier_metrics(r.id);
    
    INSERT INTO chantier_snapshots(
      chantier_id, d, 
      cout_main_oeuvre, couts_fixes, budget_ht, 
      marge_a_date, profitability_pct
    )
    VALUES (
      r.id, CURRENT_DATE,
      (m->>'cout_main_oeuvre_reel')::numeric,
      (m->>'couts_fixes_engages')::numeric,
      (m->>'budget_ht')::numeric,
      (m->>'marge_a_date')::numeric,
      (m->>'profitability_pct')::numeric
    )
    ON CONFLICT (chantier_id, d) 
    DO UPDATE SET 
      cout_main_oeuvre = EXCLUDED.cout_main_oeuvre,
      couts_fixes = EXCLUDED.couts_fixes,
      budget_ht = EXCLUDED.budget_ht,
      marge_a_date = EXCLUDED.marge_a_date,
      profitability_pct = EXCLUDED.profitability_pct,
      created_at = now();
  END LOOP;
END;
$$;

-- Activer Realtime sur la table metrics
ALTER PUBLICATION supabase_realtime ADD TABLE chantier_metrics_realtime;