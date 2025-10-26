-- PHASE 1: Ajouter la colonne jours_travailles à equipe_chantier
ALTER TABLE equipe_chantier 
ADD COLUMN IF NOT EXISTS jours_travailles INTEGER DEFAULT 0;

COMMENT ON COLUMN equipe_chantier.jours_travailles IS 'Nombre de jours que le membre travaillera sur ce chantier';

-- PHASE 6.3: Vérifier et ajouter les contraintes ON DELETE CASCADE pour la suppression de chantiers

-- Devis
ALTER TABLE devis 
DROP CONSTRAINT IF EXISTS devis_chantier_id_fkey,
ADD CONSTRAINT devis_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;

-- Factures fournisseurs
ALTER TABLE factures_fournisseurs 
DROP CONSTRAINT IF EXISTS factures_fournisseurs_chantier_id_fkey,
ADD CONSTRAINT factures_fournisseurs_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;

-- Équipe chantier
ALTER TABLE equipe_chantier 
DROP CONSTRAINT IF EXISTS equipe_chantier_chantier_id_fkey,
ADD CONSTRAINT equipe_chantier_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;

-- Frais chantier
ALTER TABLE frais_chantier 
DROP CONSTRAINT IF EXISTS frais_chantier_chantier_id_fkey,
ADD CONSTRAINT frais_chantier_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;

-- Factures clients
ALTER TABLE factures_clients 
DROP CONSTRAINT IF EXISTS factures_clients_chantier_id_fkey,
ADD CONSTRAINT factures_clients_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;

-- Paiements clients
ALTER TABLE paiements_clients 
DROP CONSTRAINT IF EXISTS paiements_clients_chantier_id_fkey,
ADD CONSTRAINT paiements_clients_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;

-- Commentaires
ALTER TABLE commentaires 
DROP CONSTRAINT IF EXISTS commentaires_chantier_id_fkey,
ADD CONSTRAINT commentaires_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;

-- Snapshots chantier
ALTER TABLE snapshots_chantier 
DROP CONSTRAINT IF EXISTS snapshots_chantier_chantier_id_fkey,
ADD CONSTRAINT snapshots_chantier_chantier_id_fkey 
FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE;