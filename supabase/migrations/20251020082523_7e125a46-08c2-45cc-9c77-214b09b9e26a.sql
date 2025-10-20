-- Doc Extractor v2: Tables et colonnes pour extraction documentaire

-- Table pour mémoriser les gabarits d'extraction par fournisseur
CREATE TABLE IF NOT EXISTS public.fournisseurs_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  fournisseur_nom TEXT NOT NULL,
  siret TEXT,
  anchors JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide par fournisseur
CREATE INDEX idx_fournisseurs_templates_nom ON public.fournisseurs_templates(fournisseur_nom);
CREATE INDEX idx_fournisseurs_templates_siret ON public.fournisseurs_templates(siret) WHERE siret IS NOT NULL;
CREATE INDEX idx_fournisseurs_templates_entreprise ON public.fournisseurs_templates(entreprise_id);

-- RLS pour fournisseurs_templates
ALTER TABLE public.fournisseurs_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
ON public.fournisseurs_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM entreprises e
    WHERE e.id = fournisseurs_templates.entreprise_id
    AND e.proprietaire_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own templates"
ON public.fournisseurs_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM entreprises e
    WHERE e.id = fournisseurs_templates.entreprise_id
    AND e.proprietaire_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own templates"
ON public.fournisseurs_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM entreprises e
    WHERE e.id = fournisseurs_templates.entreprise_id
    AND e.proprietaire_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own templates"
ON public.fournisseurs_templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM entreprises e
    WHERE e.id = fournisseurs_templates.entreprise_id
    AND e.proprietaire_user_id = auth.uid()
  )
);

-- Enrichir factures_fournisseurs avec métadonnées d'extraction
ALTER TABLE public.factures_fournisseurs 
ADD COLUMN IF NOT EXISTS extraction_json JSONB,
ADD COLUMN IF NOT EXISTS confiance NUMERIC(3,2) CHECK (confiance >= 0 AND confiance <= 1),
ADD COLUMN IF NOT EXISTS siret TEXT,
ADD COLUMN IF NOT EXISTS tva_pct NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS tva_montant NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS pages_count INTEGER;

-- Enrichir frais_chantier avec métadonnées d'extraction
ALTER TABLE public.frais_chantier
ADD COLUMN IF NOT EXISTS extraction_json JSONB,
ADD COLUMN IF NOT EXISTS confiance NUMERIC(3,2) CHECK (confiance >= 0 AND confiance <= 1),
ADD COLUMN IF NOT EXISTS fournisseur_nom TEXT,
ADD COLUMN IF NOT EXISTS siret TEXT,
ADD COLUMN IF NOT EXISTS pages_count INTEGER;

-- Enrichir tenders avec métadonnées d'extraction
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS extraction_json JSONB,
ADD COLUMN IF NOT EXISTS confiance NUMERIC(3,2) CHECK (confiance >= 0 AND confiance <= 1),
ADD COLUMN IF NOT EXISTS pages_count INTEGER;

-- Trigger pour updated_at sur fournisseurs_templates
CREATE TRIGGER update_fournisseurs_templates_updated_at
BEFORE UPDATE ON public.fournisseurs_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();