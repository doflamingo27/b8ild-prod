-- Table pour stocker l'historique des analyses IA
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  score_global INTEGER,
  statut TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour requêtes rapides
CREATE INDEX idx_ai_analyses_chantier ON ai_analyses(chantier_id, created_at DESC);

-- RLS : Les utilisateurs ne peuvent voir que les analyses de leurs chantiers
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_analyses_select ON ai_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chantiers c
      JOIN entreprises e ON e.id = c.entreprise_id
      WHERE c.id = ai_analyses.chantier_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY ai_analyses_insert ON ai_analyses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chantiers c
      JOIN entreprises e ON e.id = c.entreprise_id
      WHERE c.id = ai_analyses.chantier_id 
      AND e.proprietaire_user_id = auth.uid()
    )
  );