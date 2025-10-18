import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom_chantier: "",
    client: "",
    adresse: "",
    duree_estimee: 30,
    description: "",
  });

  useEffect(() => {
    if (user) {
      loadEntreprise();
    }
  }, [user]);

  useEffect(() => {
    if (entrepriseId) {
      loadProjects();
    }
  }, [entrepriseId]);

  const loadEntreprise = async () => {
    try {
      const { data, error } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user?.id)
        .single();

      if (error) throw error;
      setEntrepriseId(data.id);
    } catch (error: any) {
      console.error("Erreur chargement entreprise:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("chantiers")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .order("date_creation", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error("Erreur chargement chantiers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("chantiers")
        .insert({
          ...formData,
          entreprise_id: entrepriseId,
        });

      if (error) throw error;

      toast({
        title: "Chantier créé",
        description: "Le nouveau chantier a été ajouté avec succès.",
      });

      setDialogOpen(false);
      setFormData({
        nom_chantier: "",
        client: "",
        adresse: "",
        duree_estimee: 30,
        description: "",
      });
      loadProjects();
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

  const filteredProjects = projects.filter(
    (project) =>
      project.nom_chantier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Mes Chantiers</h1>
          <p className="text-muted-foreground mt-1">
            Gérez et suivez tous vos chantiers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau chantier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Créer un nouveau chantier</DialogTitle>
                <DialogDescription>
                  Renseignez les informations du chantier
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nom_chantier">Nom du chantier</Label>
                  <Input
                    id="nom_chantier"
                    value={formData.nom_chantier}
                    onChange={(e) => setFormData({ ...formData, nom_chantier: e.target.value })}
                    placeholder="Ex: Rénovation appartement 75001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="Ex: M. Dupont"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duree_estimee">Durée estimée (jours)</Label>
                  <Input
                    id="duree_estimee"
                    type="number"
                    value={formData.duree_estimee}
                    onChange={(e) => setFormData({ ...formData, duree_estimee: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Détails du chantier..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  Créer le chantier
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un chantier..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? "Aucun chantier trouvé." : "Aucun chantier. Créez votre premier chantier."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              nom_chantier={project.nom_chantier}
              client={project.client}
              rentabilite={0}
              jours_restants={project.duree_estimee}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
