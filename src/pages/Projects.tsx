import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Building } from "lucide-react";
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
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
            <Building className="h-9 w-9 text-primary" />
            Mes Chantiers
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gérez et suivez tous vos chantiers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 font-bold">
              <Plus className="h-5 w-5" />
              Nouveau chantier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Créer un nouveau chantier</DialogTitle>
                <DialogDescription className="text-base">
                  Renseignez les informations du chantier
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nom_chantier" className="font-semibold">Nom du chantier</Label>
                  <Input
                    id="nom_chantier"
                    value={formData.nom_chantier}
                    onChange={(e) => setFormData({ ...formData, nom_chantier: e.target.value })}
                    placeholder="Ex: Rénovation appartement 75001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client" className="font-semibold">Client</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="Ex: M. Dupont"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse" className="font-semibold">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duree_estimee" className="font-semibold">Durée estimée (jours)</Label>
                  <Input
                    id="duree_estimee"
                    type="number"
                    value={formData.duree_estimee}
                    onChange={(e) => setFormData({ ...formData, duree_estimee: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-semibold">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Détails du chantier..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} size="lg" className="font-bold">
                  Créer le chantier
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Rechercher un chantier..."
          className="pl-12 h-12 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="card-premium text-center py-16">
          <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-2">
            {searchTerm ? "Aucun chantier trouvé" : "Aucun chantier pour le moment"}
          </p>
          <p className="text-muted-foreground mb-6">
            {searchTerm ? "Essayez avec d'autres mots-clés" : "Créez votre premier chantier pour commencer"}
          </p>
          {!searchTerm && (
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Créer un chantier
            </Button>
          )}
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
