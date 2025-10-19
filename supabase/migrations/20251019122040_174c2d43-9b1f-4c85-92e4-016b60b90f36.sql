-- ============================================
-- PHASE 2: GESTION FINANCIÈRE AVANCÉE
-- ============================================

-- Table des paiements clients (acomptes/soldes)
CREATE TABLE IF NOT EXISTS public.paiements_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL DEFAULT 0,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('acompte', 'solde', 'avance')),
  moyen_paiement TEXT CHECK (moyen_paiement IN ('virement', 'cheque', 'especes', 'carte', 'prelevement')),
  reference TEXT,
  statut TEXT NOT NULL DEFAULT 'encaisse' CHECK (statut IN ('encaisse', 'en_attente', 'annule')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.paiements_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project payments"
  ON public.paiements_clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = paiements_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own project payments"
  ON public.paiements_clients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = paiements_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own project payments"
  ON public.paiements_clients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = paiements_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own project payments"
  ON public.paiements_clients FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = paiements_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

-- Table des snapshots pour graphiques d'évolution
CREATE TABLE IF NOT EXISTS public.snapshots_chantier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  cout_engage NUMERIC NOT NULL DEFAULT 0,
  budget_disponible NUMERIC NOT NULL DEFAULT 0,
  rentabilite_pct NUMERIC NOT NULL DEFAULT 0,
  nb_factures INTEGER DEFAULT 0,
  nb_frais INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chantier_id, date)
);

ALTER TABLE public.snapshots_chantier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project snapshots"
  ON public.snapshots_chantier FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = snapshots_chantier.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

-- Table des factures clients
CREATE TABLE IF NOT EXISTS public.factures_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_facture TEXT NOT NULL UNIQUE,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  montant_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC NOT NULL DEFAULT 20,
  montant_ttc NUMERIC NOT NULL DEFAULT 0,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'emise' CHECK (statut IN ('brouillon', 'emise', 'payee', 'annulee', 'en_retard')),
  fichier_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.factures_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client invoices"
  ON public.factures_clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = factures_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own client invoices"
  ON public.factures_clients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = factures_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own client invoices"
  ON public.factures_clients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = factures_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own client invoices"
  ON public.factures_clients FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = factures_clients.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

-- ============================================
-- PHASE 3: COLLABORATION & PERMISSIONS
-- ============================================

-- Table des commentaires avec thread
CREATE TABLE IF NOT EXISTS public.commentaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.commentaires(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.commentaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project comments"
  ON public.commentaires FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = commentaires.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert project comments"
  ON public.commentaires FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chantiers c
      JOIN entreprises e ON e.id = c.entreprise_id
      WHERE c.id = commentaires.chantier_id
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.commentaires FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.commentaires FOR DELETE
  USING (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_commentaires_chantier ON public.commentaires(chantier_id);
CREATE INDEX IF NOT EXISTS idx_commentaires_parent ON public.commentaires(parent_id);

-- ============================================
-- PHASE 6: PRODUCTIVITÉ
-- ============================================

-- Table des templates de chantiers
CREATE TABLE IF NOT EXISTS public.templates_chantier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  duree_estimee INTEGER,
  budget_type TEXT CHECK (budget_type IN ('forfait', 'regie', 'mixte')),
  equipement_type JSONB DEFAULT '[]'::jsonb,
  fournisseurs_habituels JSONB DEFAULT '[]'::jsonb,
  postes_prevus JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.templates_chantier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON public.templates_chantier FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entreprises e
      WHERE e.id = templates_chantier.entreprise_id
      AND e.proprietaire_user_id = auth.uid()
    ) OR is_public = true
  );

CREATE POLICY "Users can insert own templates"
  ON public.templates_chantier FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM entreprises e
    WHERE e.id = templates_chantier.entreprise_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own templates"
  ON public.templates_chantier FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM entreprises e
    WHERE e.id = templates_chantier.entreprise_id
    AND e.proprietaire_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own templates"
  ON public.templates_chantier FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM entreprises e
    WHERE e.id = templates_chantier.entreprise_id
    AND e.proprietaire_user_id = auth.uid()
  ));

-- ============================================
-- PHASE 8: SÉCURITÉ & CONFORMITÉ
-- ============================================

-- Table pour tracking des exports RGPD
CREATE TABLE IF NOT EXISTS public.data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rgpd_export', 'account_deletion')),
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'termine', 'erreur')),
  fichier_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
  ON public.data_exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exports"
  ON public.data_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Trigger pour updated_at sur nouvelles tables
CREATE TRIGGER set_updated_at_paiements_clients
  BEFORE UPDATE ON public.paiements_clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_factures_clients
  BEFORE UPDATE ON public.factures_clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_commentaires
  BEFORE UPDATE ON public.commentaires
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_templates
  BEFORE UPDATE ON public.templates_chantier
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Triggers pour historique des modifications
CREATE TRIGGER log_paiements_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.paiements_clients
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

CREATE TRIGGER log_factures_clients_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.factures_clients
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

CREATE TRIGGER log_commentaires_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.commentaires
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

-- Index pour recherche full-text
CREATE INDEX IF NOT EXISTS idx_chantiers_search ON public.chantiers 
  USING gin(to_tsvector('french', coalesce(nom_chantier, '') || ' ' || coalesce(client, '') || ' ' || coalesce(adresse, '')));

CREATE INDEX IF NOT EXISTS idx_membres_search ON public.membres_equipe 
  USING gin(to_tsvector('french', coalesce(nom, '') || ' ' || coalesce(prenom, '') || ' ' || coalesce(poste, '')));

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_paiements_chantier ON public.paiements_clients(chantier_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date ON public.paiements_clients(date_paiement);
CREATE INDEX IF NOT EXISTS idx_factures_clients_chantier ON public.factures_clients(chantier_id);
CREATE INDEX IF NOT EXISTS idx_factures_clients_statut ON public.factures_clients(statut);
CREATE INDEX IF NOT EXISTS idx_snapshots_chantier_date ON public.snapshots_chantier(chantier_id, date DESC);