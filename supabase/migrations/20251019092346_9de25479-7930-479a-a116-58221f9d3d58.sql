-- Ajouter la colonne date_debut pour calculer les jours effectifs
ALTER TABLE public.chantiers
ADD COLUMN IF NOT EXISTS date_debut date DEFAULT CURRENT_DATE;