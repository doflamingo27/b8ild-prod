-- Ajouter la colonne statut avec valeur par défaut
ALTER TABLE membres_equipe 
ADD COLUMN statut TEXT DEFAULT 'disponible';

-- Ajouter contrainte CHECK pour valider les valeurs
ALTER TABLE membres_equipe
ADD CONSTRAINT membres_equipe_statut_check 
CHECK (statut IN ('sur_chantier', 'disponible', 'repos', 'en_arret'));

-- Migrer les données existantes
UPDATE membres_equipe 
SET statut = CASE 
  WHEN actif = true THEN 'disponible'
  WHEN actif = false THEN 'en_arret'
  ELSE 'disponible'
END;

-- Supprimer l'ancienne colonne actif
ALTER TABLE membres_equipe DROP COLUMN actif;

-- Fonction pour mise à jour automatique du statut basé sur affectations
CREATE OR REPLACE FUNCTION update_membre_statut_from_affectations()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un membre est affecté à un chantier avec dates actives
  UPDATE membres_equipe
  SET statut = 'sur_chantier'
  WHERE id = NEW.membre_equipe_id
    AND EXISTS (
      SELECT 1 
      FROM affectations_chantiers 
      WHERE membre_equipe_id = NEW.membre_equipe_id
        AND CURRENT_DATE BETWEEN date_debut AND date_fin
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur INSERT et UPDATE d'affectations
CREATE TRIGGER trg_update_statut_on_affectation
AFTER INSERT OR UPDATE ON affectations_chantiers
FOR EACH ROW
EXECUTE FUNCTION update_membre_statut_from_affectations();

-- Fonction pour remettre à 'disponible' quand affectation se termine
CREATE OR REPLACE FUNCTION check_membre_statut_daily()
RETURNS void AS $$
BEGIN
  -- Remettre à 'disponible' les membres dont toutes les affectations sont terminées
  UPDATE membres_equipe
  SET statut = 'disponible'
  WHERE statut = 'sur_chantier'
    AND NOT EXISTS (
      SELECT 1 
      FROM affectations_chantiers 
      WHERE membre_equipe_id = membres_equipe.id
        AND CURRENT_DATE BETWEEN date_debut AND date_fin
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger sur DELETE d'affectations pour recalculer le statut
CREATE OR REPLACE FUNCTION update_membre_statut_on_delete_affectation()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le membre a encore des affectations actives
  UPDATE membres_equipe
  SET statut = CASE
    WHEN EXISTS (
      SELECT 1 
      FROM affectations_chantiers 
      WHERE membre_equipe_id = OLD.membre_equipe_id
        AND CURRENT_DATE BETWEEN date_debut AND date_fin
        AND id != OLD.id
    ) THEN 'sur_chantier'
    ELSE 'disponible'
  END
  WHERE id = OLD.membre_equipe_id
    AND statut = 'sur_chantier';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_statut_on_delete_affectation
AFTER DELETE ON affectations_chantiers
FOR EACH ROW
EXECUTE FUNCTION update_membre_statut_on_delete_affectation();