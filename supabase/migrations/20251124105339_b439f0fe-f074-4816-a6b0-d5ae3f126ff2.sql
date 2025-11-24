-- Ajouter la colonne reference_chantier à la table chantiers
ALTER TABLE chantiers 
ADD COLUMN reference_chantier TEXT;

-- Ajouter une contrainte pour éviter les chaînes vides
ALTER TABLE chantiers 
ADD CONSTRAINT chk_reference_not_empty 
CHECK (reference_chantier IS NULL OR length(trim(reference_chantier)) > 0);