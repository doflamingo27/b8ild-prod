import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  nom: string;
  description: string | null;
  duree_estimee: number | null;
  budget_type: string | null;
  is_public: boolean;
}

interface TemplateManagerProps {
  entrepriseId: string;
  onUseTemplate?: (template: Template) => void;
}

export const TemplateManager = ({ entrepriseId, onUseTemplate }: TemplateManagerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [dureeEstimee, setDureeEstimee] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", entrepriseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates_chantier")
        .select("*")
        .or(`entreprise_id.eq.${entrepriseId},is_public.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
  });

  const handleCreate = async () => {
    if (!nom.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du template est obligatoire",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("templates_chantier").insert({
      entreprise_id: entrepriseId,
      nom: nom.trim(),
      description: description.trim() || null,
      duree_estimee: dureeEstimee ? parseInt(dureeEstimee) : null,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le template",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Template créé avec succès",
    });

    setIsCreating(false);
    setNom("");
    setDescription("");
    setDureeEstimee("");
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const handleDelete = async (templateId: string) => {
    const { error } = await supabase
      .from("templates_chantier")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le template",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Template supprimé",
    });

    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de chantiers
          </CardTitle>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nom">Nom du template</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Villa moderne, Rénovation appartement..."
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez le type de chantier..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="duree">Durée estimée (jours)</Label>
                  <Input
                    id="duree"
                    type="number"
                    value={dureeEstimee}
                    onChange={(e) => setDureeEstimee(e.target.value)}
                    placeholder="Ex: 60"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} className="flex-1">
                    Créer
                  </Button>
                  <Button onClick={() => setIsCreating(false)} variant="outline">
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun template disponible
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{template.nom}</h4>
                    {template.is_public && (
                      <Badge variant="secondary" className="text-xs">
                        Public
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                  {template.duree_estimee && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Durée: {template.duree_estimee} jours
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {onUseTemplate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUseTemplate(template)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Utiliser
                    </Button>
                  )}
                  {!template.is_public && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};