export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      absences_equipe: {
        Row: {
          created_at: string | null
          date_debut: string
          date_fin: string
          id: string
          membre_id: string
          motif: string | null
          type_absence: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_debut: string
          date_fin: string
          id?: string
          membre_id: string
          motif?: string | null
          type_absence: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_debut?: string
          date_fin?: string
          id?: string
          membre_id?: string
          motif?: string | null
          type_absence?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absences_equipe_membre_id_fkey"
            columns: ["membre_id"]
            isOneToOne: false
            referencedRelation: "membres_equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      affectations_chantiers: {
        Row: {
          chantier_id: string
          charges_patronales_pct: number | null
          charges_salariales_pct: number | null
          created_at: string | null
          date_debut: string
          date_fin: string
          equipe_id: string | null
          heures_par_jour: number | null
          id: string
          jours_travailles: number
          membre_equipe_id: string
          notes: string | null
          taux_horaire_specifique: number | null
          updated_at: string | null
        }
        Insert: {
          chantier_id: string
          charges_patronales_pct?: number | null
          charges_salariales_pct?: number | null
          created_at?: string | null
          date_debut: string
          date_fin: string
          equipe_id?: string | null
          heures_par_jour?: number | null
          id?: string
          jours_travailles: number
          membre_equipe_id: string
          notes?: string | null
          taux_horaire_specifique?: number | null
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string
          charges_patronales_pct?: number | null
          charges_salariales_pct?: number | null
          created_at?: string | null
          date_debut?: string
          date_fin?: string
          equipe_id?: string | null
          heures_par_jour?: number | null
          id?: string
          jours_travailles?: number
          membre_equipe_id?: string
          notes?: string | null
          taux_horaire_specifique?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affectations_chantiers_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_chantiers_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_chantiers_membre_equipe_id_fkey"
            columns: ["membre_equipe_id"]
            isOneToOne: false
            referencedRelation: "membres_equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyses: {
        Row: {
          analysis_data: Json
          chantier_id: string
          created_at: string | null
          id: string
          score_global: number | null
          statut: string | null
        }
        Insert: {
          analysis_data: Json
          chantier_id: string
          created_at?: string | null
          id?: string
          score_global?: number | null
          statut?: string | null
        }
        Update: {
          analysis_data?: Json
          chantier_id?: string
          created_at?: string | null
          id?: string
          score_global?: number | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantier_metrics_realtime: {
        Row: {
          chantier_id: string
          metrics: Json
          updated_at: string | null
        }
        Insert: {
          chantier_id: string
          metrics: Json
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string
          metrics?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chantier_metrics_realtime_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: true
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantier_snapshots: {
        Row: {
          budget_ht: number | null
          chantier_id: string
          cout_main_oeuvre: number | null
          couts_fixes: number | null
          created_at: string | null
          d: string
          id: string
          marge_a_date: number | null
          profitability_pct: number | null
        }
        Insert: {
          budget_ht?: number | null
          chantier_id: string
          cout_main_oeuvre?: number | null
          couts_fixes?: number | null
          created_at?: string | null
          d: string
          id?: string
          marge_a_date?: number | null
          profitability_pct?: number | null
        }
        Update: {
          budget_ht?: number | null
          chantier_id?: string
          cout_main_oeuvre?: number | null
          couts_fixes?: number | null
          created_at?: string | null
          d?: string
          id?: string
          marge_a_date?: number | null
          profitability_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chantier_snapshots_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantiers: {
        Row: {
          adresse: string | null
          budget_ht: number | null
          client: string
          created_at: string | null
          date_creation: string | null
          date_debut_prevue: string | null
          date_debut_reelle: string | null
          date_fin_estimee: string | null
          date_fin_prevue: string | null
          date_fin_reelle: string | null
          description: string | null
          duree_estimee: number | null
          duree_estimee_jours: number | null
          entreprise_id: string
          etat_chantier: string | null
          id: string
          nom_chantier: string
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          adresse?: string | null
          budget_ht?: number | null
          client: string
          created_at?: string | null
          date_creation?: string | null
          date_debut_prevue?: string | null
          date_debut_reelle?: string | null
          date_fin_estimee?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          description?: string | null
          duree_estimee?: number | null
          duree_estimee_jours?: number | null
          entreprise_id: string
          etat_chantier?: string | null
          id?: string
          nom_chantier: string
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string | null
          budget_ht?: number | null
          client?: string
          created_at?: string | null
          date_creation?: string | null
          date_debut_prevue?: string | null
          date_debut_reelle?: string | null
          date_fin_estimee?: string | null
          date_fin_prevue?: string | null
          date_fin_reelle?: string | null
          description?: string | null
          duree_estimee?: number | null
          duree_estimee_jours?: number | null
          entreprise_id?: string
          etat_chantier?: string | null
          id?: string
          nom_chantier?: string
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chantiers_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      commentaires: {
        Row: {
          chantier_id: string
          contenu: string
          created_at: string | null
          id: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chantier_id: string
          contenu: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chantier_id?: string
          contenu?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commentaires_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentaires_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "commentaires"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          fichier_url: string | null
          id: string
          statut: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          fichier_url?: string | null
          id?: string
          statut?: string
          type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          fichier_url?: string | null
          id?: string
          statut?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      devis: {
        Row: {
          actif: boolean | null
          chantier_id: string
          confiance: number | null
          created_at: string | null
          date_acceptation: string | null
          date_envoi: string | null
          extraction_json: Json | null
          fichier_url: string | null
          id: string
          montant_ht: number
          montant_ttc: number
          pages_count: number | null
          statut: string | null
          tva: number
          updated_at: string | null
          version: string | null
        }
        Insert: {
          actif?: boolean | null
          chantier_id: string
          confiance?: number | null
          created_at?: string | null
          date_acceptation?: string | null
          date_envoi?: string | null
          extraction_json?: Json | null
          fichier_url?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          pages_count?: number | null
          statut?: string | null
          tva?: number
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          actif?: boolean | null
          chantier_id?: string
          confiance?: number | null
          created_at?: string | null
          date_acceptation?: string | null
          date_envoi?: string | null
          extraction_json?: Json | null
          fichier_url?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          pages_count?: number | null
          statut?: string | null
          tva?: number
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      entreprises: {
        Row: {
          adresse: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          nom: string
          proprietaire_user_id: string
          siret: string | null
          specialite_metier: string | null
          updated_at: string | null
        }
        Insert: {
          adresse?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nom: string
          proprietaire_user_id: string
          siret?: string | null
          specialite_metier?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nom?: string
          proprietaire_user_id?: string
          siret?: string | null
          specialite_metier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipe_chantier: {
        Row: {
          chantier_id: string
          created_at: string | null
          id: string
          jours_travailles: number | null
          membre_id: string
          role_chantier: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string | null
          id?: string
          jours_travailles?: number | null
          membre_id: string
          role_chantier?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string | null
          id?: string
          jours_travailles?: number | null
          membre_id?: string
          role_chantier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_chantier_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_chantier_membre_id_fkey"
            columns: ["membre_id"]
            isOneToOne: false
            referencedRelation: "membres_equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          created_at: string | null
          description: string | null
          entreprise_id: string
          id: string
          nom: string
          specialite: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entreprise_id: string
          id?: string
          nom: string
          specialite?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entreprise_id?: string
          id?: string
          nom?: string
          specialite?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      factures_clients: {
        Row: {
          chantier_id: string
          created_at: string | null
          date_echeance: string
          date_emission: string
          fichier_url: string | null
          id: string
          montant_ht: number
          montant_ttc: number
          notes: string | null
          numero_facture: string
          statut: string
          tva: number
          updated_at: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string | null
          date_echeance: string
          date_emission?: string
          fichier_url?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          notes?: string | null
          numero_facture: string
          statut?: string
          tva?: number
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string | null
          date_echeance?: string
          date_emission?: string
          fichier_url?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          notes?: string | null
          numero_facture?: string
          statut?: string
          tva?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_clients_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      factures_fournisseurs: {
        Row: {
          categorie: string
          chantier_id: string | null
          confiance: number | null
          created_at: string | null
          created_by: string | null
          date_facture: string | null
          entreprise_id: string | null
          extraction_json: Json | null
          extraction_status: string | null
          fichier_url: string | null
          fournisseur: string | null
          id: string
          montant_ht: number | null
          montant_ttc: number | null
          pages_count: number | null
          siret: string | null
          tva_montant: number | null
          tva_pct: number | null
          updated_at: string | null
        }
        Insert: {
          categorie: string
          chantier_id?: string | null
          confiance?: number | null
          created_at?: string | null
          created_by?: string | null
          date_facture?: string | null
          entreprise_id?: string | null
          extraction_json?: Json | null
          extraction_status?: string | null
          fichier_url?: string | null
          fournisseur?: string | null
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          pages_count?: number | null
          siret?: string | null
          tva_montant?: number | null
          tva_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          categorie?: string
          chantier_id?: string | null
          confiance?: number | null
          created_at?: string | null
          created_by?: string | null
          date_facture?: string | null
          entreprise_id?: string | null
          extraction_json?: Json | null
          extraction_status?: string | null
          fichier_url?: string | null
          fournisseur?: string | null
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          pages_count?: number | null
          siret?: string | null
          tva_montant?: number | null
          tva_pct?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_fournisseurs_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseurs_templates: {
        Row: {
          anchors: Json
          created_at: string | null
          created_by: string | null
          entreprise_id: string
          field_positions: Json
          fournisseur_nom: string
          id: string
          siret: string | null
          updated_at: string | null
        }
        Insert: {
          anchors?: Json
          created_at?: string | null
          created_by?: string | null
          entreprise_id: string
          field_positions?: Json
          fournisseur_nom: string
          id?: string
          siret?: string | null
          updated_at?: string | null
        }
        Update: {
          anchors?: Json
          created_at?: string | null
          created_by?: string | null
          entreprise_id?: string
          field_positions?: Json
          fournisseur_nom?: string
          id?: string
          siret?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fournisseurs_templates_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      frais_chantier: {
        Row: {
          chantier_id: string
          confiance: number | null
          created_at: string | null
          created_by: string | null
          date_frais: string | null
          description: string | null
          entreprise_id: string | null
          extraction_json: Json | null
          fournisseur_nom: string | null
          id: string
          montant_total: number
          pages_count: number | null
          siret: string | null
          type_frais: string
          updated_at: string | null
        }
        Insert: {
          chantier_id: string
          confiance?: number | null
          created_at?: string | null
          created_by?: string | null
          date_frais?: string | null
          description?: string | null
          entreprise_id?: string | null
          extraction_json?: Json | null
          fournisseur_nom?: string | null
          id?: string
          montant_total?: number
          pages_count?: number | null
          siret?: string | null
          type_frais: string
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string
          confiance?: number | null
          created_at?: string | null
          created_by?: string | null
          date_frais?: string | null
          description?: string | null
          entreprise_id?: string | null
          extraction_json?: Json | null
          fournisseur_nom?: string | null
          id?: string
          montant_total?: number
          pages_count?: number | null
          siret?: string | null
          type_frais?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frais_chantier_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      historique_modifications: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      membres_equipe: {
        Row: {
          charges_patronales: number
          charges_patronales_pct: number | null
          charges_salariales: number
          charges_salariales_pct: number | null
          created_at: string | null
          entreprise_id: string
          equipe_id: string | null
          id: string
          nom: string
          poste: string | null
          prenom: string
          specialite: string | null
          statut: string | null
          taux_horaire: number
          updated_at: string | null
        }
        Insert: {
          charges_patronales?: number
          charges_patronales_pct?: number | null
          charges_salariales?: number
          charges_salariales_pct?: number | null
          created_at?: string | null
          entreprise_id: string
          equipe_id?: string | null
          id?: string
          nom: string
          poste?: string | null
          prenom: string
          specialite?: string | null
          statut?: string | null
          taux_horaire?: number
          updated_at?: string | null
        }
        Update: {
          charges_patronales?: number
          charges_patronales_pct?: number | null
          charges_salariales?: number
          charges_salariales_pct?: number | null
          created_at?: string | null
          entreprise_id?: string
          equipe_id?: string | null
          id?: string
          nom?: string
          poste?: string | null
          prenom?: string
          specialite?: string | null
          statut?: string | null
          taux_horaire?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membres_equipe_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membres_equipe_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_alertes_budget: boolean | null
          email_alertes_critiques: boolean | null
          email_commentaires: boolean | null
          email_modifications: boolean | null
          id: string
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_alertes_budget?: boolean | null
          email_alertes_critiques?: boolean | null
          email_commentaires?: boolean | null
          email_modifications?: boolean | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_alertes_budget?: boolean | null
          email_alertes_critiques?: boolean | null
          email_commentaires?: boolean | null
          email_modifications?: boolean | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paiements_clients: {
        Row: {
          chantier_id: string
          created_at: string | null
          date_paiement: string
          id: string
          montant: number
          moyen_paiement: string | null
          notes: string | null
          reference: string | null
          statut: string
          type: string
          updated_at: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string | null
          date_paiement?: string
          id?: string
          montant?: number
          moyen_paiement?: string | null
          notes?: string | null
          reference?: string | null
          statut?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string | null
          date_paiement?: string
          id?: string
          montant?: number
          moyen_paiement?: string | null
          notes?: string | null
          reference?: string | null
          statut?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_clients_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nom: string | null
          prenom: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nom?: string | null
          prenom?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nom?: string | null
          prenom?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      snapshots_chantier: {
        Row: {
          budget_disponible: number
          chantier_id: string
          cout_engage: number
          created_at: string | null
          date: string
          id: string
          nb_factures: number | null
          nb_frais: number | null
          rentabilite_pct: number
        }
        Insert: {
          budget_disponible?: number
          chantier_id: string
          cout_engage?: number
          created_at?: string | null
          date?: string
          id?: string
          nb_factures?: number | null
          nb_frais?: number | null
          rentabilite_pct?: number
        }
        Update: {
          budget_disponible?: number
          chantier_id?: string
          cout_engage?: number
          created_at?: string | null
          date?: string
          id?: string
          nb_factures?: number | null
          nb_frais?: number | null
          rentabilite_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_chantier_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      templates_chantier: {
        Row: {
          budget_type: string | null
          created_at: string | null
          description: string | null
          duree_estimee: number | null
          entreprise_id: string
          equipement_type: Json | null
          fournisseurs_habituels: Json | null
          id: string
          is_public: boolean | null
          nom: string
          postes_prevus: Json | null
          updated_at: string | null
        }
        Insert: {
          budget_type?: string | null
          created_at?: string | null
          description?: string | null
          duree_estimee?: number | null
          entreprise_id: string
          equipement_type?: Json | null
          fournisseurs_habituels?: Json | null
          id?: string
          is_public?: boolean | null
          nom: string
          postes_prevus?: Json | null
          updated_at?: string | null
        }
        Update: {
          budget_type?: string | null
          created_at?: string | null
          description?: string | null
          duree_estimee?: number | null
          entreprise_id?: string
          equipement_type?: Json | null
          fournisseurs_habituels?: Json | null
          id?: string
          is_public?: boolean | null
          nom?: string
          postes_prevus?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_chantier_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_inbox: {
        Row: {
          body: string | null
          created_at: string | null
          created_by: string | null
          entreprise_id: string | null
          id: string
          received_at: string
          sender_email: string
          status: string
          subject: string | null
          tender_id: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          entreprise_id?: string | null
          id?: string
          received_at?: string
          sender_email: string
          status?: string
          subject?: string | null
          tender_id?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          entreprise_id?: string | null
          id?: string
          received_at?: string
          sender_email?: string
          status?: string
          subject?: string | null
          tender_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_inbox_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_matches: {
        Row: {
          created_at: string | null
          created_by: string | null
          entreprise_id: string | null
          id: string
          match_details: Json | null
          score: number
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entreprise_id?: string | null
          id?: string
          match_details?: Json | null
          score: number
          tender_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entreprise_id?: string | null
          id?: string
          match_details?: Json | null
          score?: number
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_matches_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_profiles: {
        Row: {
          alert_email: boolean
          alert_push: boolean
          budget_max: number | null
          budget_min: number | null
          certifications: string[] | null
          created_at: string | null
          departments: string[] | null
          id: string
          radius_km: number | null
          score_threshold: number
          specialties: string[]
          updated_at: string | null
          user_id: string
          zone_type: string
        }
        Insert: {
          alert_email?: boolean
          alert_push?: boolean
          budget_max?: number | null
          budget_min?: number | null
          certifications?: string[] | null
          created_at?: string | null
          departments?: string[] | null
          id?: string
          radius_km?: number | null
          score_threshold?: number
          specialties?: string[]
          updated_at?: string | null
          user_id: string
          zone_type?: string
        }
        Update: {
          alert_email?: boolean
          alert_push?: boolean
          budget_max?: number | null
          budget_min?: number | null
          certifications?: string[] | null
          created_at?: string | null
          departments?: string[] | null
          id?: string
          radius_km?: number | null
          score_threshold?: number
          specialties?: string[]
          updated_at?: string | null
          user_id?: string
          zone_type?: string
        }
        Relationships: []
      }
      tenders: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buyer: string
          category: string | null
          city: string | null
          confiance: number | null
          created_at: string | null
          created_by: string | null
          dce_url: string | null
          deadline: string | null
          department: string | null
          description: string | null
          entreprise_id: string | null
          extraction_json: Json | null
          hash_contenu: string | null
          id: string
          pages_count: number | null
          postal_code: string | null
          source: string | null
          source_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buyer: string
          category?: string | null
          city?: string | null
          confiance?: number | null
          created_at?: string | null
          created_by?: string | null
          dce_url?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          entreprise_id?: string | null
          extraction_json?: Json | null
          hash_contenu?: string | null
          id?: string
          pages_count?: number | null
          postal_code?: string | null
          source?: string | null
          source_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buyer?: string
          category?: string | null
          city?: string | null
          confiance?: number | null
          created_at?: string | null
          created_by?: string | null
          dce_url?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          entreprise_id?: string | null
          extraction_json?: Json | null
          hash_contenu?: string | null
          id?: string
          pages_count?: number | null
          postal_code?: string | null
          source?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_membre_statut_daily: { Args: never; Returns: undefined }
      compute_chantier_metrics: { Args: { p_chantier: string }; Returns: Json }
      get_current_entreprise: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_devis_extraction: {
        Args: { p_chantier_id: string; p_data: Json; p_entreprise_id: string }
        Returns: string
      }
      insert_extraction_service: {
        Args: { p_data: Json; p_entreprise_id: string; p_table: string }
        Returns: string
      }
      jwt_role: { Args: never; Returns: string }
      safe_num_fr: { Args: { p_max?: number; p_text: string }; Returns: number }
      safe_pct_fr: { Args: { p_text: string }; Returns: number }
      snapshot_chantier_daily: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "chef" | "ouvrier"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "chef", "ouvrier"],
    },
  },
} as const
