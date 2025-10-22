import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FieldAnchor {
  label: string;
  page?: number;
  bbox?: { x: number; y: number; width: number; height: number };
  offset?: number;
}

export interface TemplateData {
  fournisseur_nom: string;
  siret?: string;
  anchors: FieldAnchor[];
  field_positions: Record<string, FieldAnchor[]>;
}

export const useTemplateManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveTemplate = async (
    templateData: TemplateData,
    entrepriseId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('fournisseurs_templates')
        .upsert({
          fournisseur_nom: templateData.fournisseur_nom,
          siret: templateData.siret,
          anchors: templateData.anchors as any,
          field_positions: templateData.field_positions as any,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Template enregistré",
        description: `Le gabarit pour ${templateData.fournisseur_nom} sera réutilisé automatiquement.`
      });

      return true;
    } catch (error: any) {
      console.error('[TemplateManager] Erreur:', error);
      toast({
        title: "Erreur d'enregistrement",
        description: error.message || "Impossible d'enregistrer le template.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const findTemplate = async (
    entrepriseId: string,
    siret?: string,
    fournisseurNom?: string
  ) => {
    try {
      let query = supabase
        .from('fournisseurs_templates')
        .select('*')
        .eq('entreprise_id', entrepriseId);

      if (siret) {
        query = query.eq('siret', siret);
      } else if (fournisseurNom) {
        query = query.ilike('fournisseur_nom', `%${fournisseurNom}%`);
      } else {
        return null;
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('[TemplateManager] Erreur recherche:', error);
      return null;
    }
  };

  const listTemplates = async (entrepriseId: string) => {
    try {
      const { data, error } = await supabase
        .from('fournisseurs_templates')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TemplateManager] Erreur liste:', error);
      return [];
    }
  };

  const deleteTemplate = async (templateId: string) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('fournisseurs_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template supprimé",
        description: "Le gabarit a été supprimé avec succès."
      });

      return true;
    } catch (error: any) {
      console.error('[TemplateManager] Erreur suppression:', error);
      toast({
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer le template.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveTemplate,
    findTemplate,
    listTemplates,
    deleteTemplate,
    isLoading
  };
};
