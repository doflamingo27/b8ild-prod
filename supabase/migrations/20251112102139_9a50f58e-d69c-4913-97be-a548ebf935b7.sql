-- Permettre aux utilisateurs d'insérer et mettre à jour leurs propres métriques de chantier
CREATE POLICY "Users can insert own project metrics"
ON chantier_metrics_realtime
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = chantier_metrics_realtime.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own project metrics"
ON chantier_metrics_realtime
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = chantier_metrics_realtime.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chantiers c
    JOIN entreprises e ON e.id = c.entreprise_id
    WHERE c.id = chantier_metrics_realtime.chantier_id
    AND e.proprietaire_user_id = auth.uid()
  )
);