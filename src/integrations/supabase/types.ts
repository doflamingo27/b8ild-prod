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
      chantiers: {
        Row: {
          adresse: string | null
          client: string
          created_at: string | null
          date_creation: string | null
          date_debut: string | null
          date_fin_prevue: string | null
          description: string | null
          duree_estimee: number | null
          entreprise_id: string
          id: string
          nom_chantier: string
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          adresse?: string | null
          client: string
          created_at?: string | null
          date_creation?: string | null
          date_debut?: string | null
          date_fin_prevue?: string | null
          description?: string | null
          duree_estimee?: number | null
          entreprise_id: string
          id?: string
          nom_chantier: string
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string | null
          client?: string
          created_at?: string | null
          date_creation?: string | null
          date_debut?: string | null
          date_fin_prevue?: string | null
          description?: string | null
          duree_estimee?: number | null
          entreprise_id?: string
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
      devis: {
        Row: {
          chantier_id: string
          created_at: string | null
          fichier_url: string | null
          id: string
          montant_ht: number
          montant_ttc: number
          tva: number
          updated_at: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string | null
          fichier_url?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          tva?: number
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string | null
          fichier_url?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          tva?: number
          updated_at?: string | null
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
          membre_id: string
          role_chantier: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string | null
          id?: string
          membre_id: string
          role_chantier?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string | null
          id?: string
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
      factures_fournisseurs: {
        Row: {
          categorie: string
          chantier_id: string
          created_at: string | null
          date_facture: string | null
          fichier_url: string | null
          fournisseur: string | null
          id: string
          montant_ht: number
          updated_at: string | null
        }
        Insert: {
          categorie: string
          chantier_id: string
          created_at?: string | null
          date_facture?: string | null
          fichier_url?: string | null
          fournisseur?: string | null
          id?: string
          montant_ht?: number
          updated_at?: string | null
        }
        Update: {
          categorie?: string
          chantier_id?: string
          created_at?: string | null
          date_facture?: string | null
          fichier_url?: string | null
          fournisseur?: string | null
          id?: string
          montant_ht?: number
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
      frais_chantier: {
        Row: {
          chantier_id: string
          created_at: string | null
          date_frais: string | null
          description: string | null
          id: string
          montant_total: number
          type_frais: string
          updated_at: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string | null
          date_frais?: string | null
          description?: string | null
          id?: string
          montant_total?: number
          type_frais: string
          updated_at?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string | null
          date_frais?: string | null
          description?: string | null
          id?: string
          montant_total?: number
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
          actif: boolean | null
          charges_patronales: number
          charges_salariales: number
          created_at: string | null
          entreprise_id: string
          id: string
          nom: string
          poste: string | null
          prenom: string
          specialite: string | null
          taux_horaire: number
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          charges_patronales?: number
          charges_salariales?: number
          created_at?: string | null
          entreprise_id: string
          id?: string
          nom: string
          poste?: string | null
          prenom: string
          specialite?: string | null
          taux_horaire?: number
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          charges_patronales?: number
          charges_salariales?: number
          created_at?: string | null
          entreprise_id?: string
          id?: string
          nom?: string
          poste?: string | null
          prenom?: string
          specialite?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
