import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Equipe {
  id: string;
  nom: string;
  description: string;
  specialite: string;
  created_at: string;
}

interface TeamManagerProps {
  entrepriseId: string;
}

const TeamManager = ({ entrepriseId }: TeamManagerProps) => {
  const { toast } = useToast();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    specialite: "",
  });

  useEffect(() => {
    loadEquipes();
  }, [entrepriseId]);

  const loadEquipes = async () => {
    try {
      const { data, error } = await supabase
        .from("equipes")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipes(data || []);
    } catch (error: any) {
      console.error("Erreur chargement équipes:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingEquipe) {
        const { error } = await supabase
          .from("equipes")
          .update(formData)
          .eq("id", editingEquipe.id);

        if (error) throw error;
        toast({ title: "Équipe modifiée", description: "Les modifications ont été enregistrées." });
      } else {
        const { error } = await supabase
          .from("equipes")
          .insert({
            ...formData,
            entreprise_id: entrepriseId,
          });

        if (error) throw error;
        toast({ title: "Équipe créée", description: "La nouvelle équipe a été ajoutée." });
      }

      resetForm();
      loadEquipes();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (equipe: Equipe) => {
    setEditingEquipe(equipe);
    setFormData({
      nom: equipe.nom,
      description: equipe.description || "",
      specialite: equipe.specialite || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) return;

    try {
      const { error } = await supabase
        .from("equipes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Équipe supprimée" });
      loadEquipes();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      description: "",
      specialite: "",
    });
    setEditingEquipe(null);
    setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion des Équipes
            </CardTitle>
            <CardDescription>
              Créez et gérez vos équipes par spécialité
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une équipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingEquipe ? "Modifier l'équipe" : "Créer une équipe"}
                  </DialogTitle>
                  <DialogDescription>
                    Définissez le nom et la spécialité de l'équipe
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nom">Nom de l'équipe *</Label>
                    <Input
                      id="nom"
                      placeholder="Ex: Équipe Maçonnerie"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="specialite">Spécialité</Label>
                    <Input
                      id="specialite"
                      placeholder="Ex: Gros œuvre, Revêtement..."
                      value={formData.specialite}
                      onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Description de l'équipe..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Enregistrement..." : editingEquipe ? "Modifier" : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {equipes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune équipe créée</p>
            <p className="text-sm">Créez votre première équipe pour commencer</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipes.map((equipe) => (
                <TableRow key={equipe.id}>
                  <TableCell className="font-medium">{equipe.nom}</TableCell>
                  <TableCell>
                    {equipe.specialite && (
                      <Badge variant="secondary">{equipe.specialite}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {equipe.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(equipe)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(equipe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamManager;
