import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Building } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import EmptyState from "@/components/EmptyState";
import { labels, placeholders, toasts, emptyStates } from "@/lib/content";

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
        title: toasts.created,
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
        description: toasts.errorGeneric,
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
            <Building className="h-9 w-9 text-primary" aria-hidden="true" />
            {labels.nav.projects}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gérez et suivez tous vos chantiers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 font-bold" aria-label={labels.actions.create} title={labels.actions.create}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              {emptyStates.projects.primary}
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
                  <Label htmlFor="nom_chantier" className="font-semibold">{labels.forms.projectName}</Label>
                  <Input
                    id="nom_chantier"
                    value={formData.nom_chantier}
                    onChange={(e) => setFormData({ ...formData, nom_chantier: e.target.value })}
                    placeholder={placeholders.project.name}
                    required
                    aria-label={labels.forms.projectName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client" className="font-semibold">{labels.forms.projectClient}</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder={placeholders.project.client}
                    required
                    aria-label={labels.forms.projectClient}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse" className="font-semibold">{labels.forms.projectAddress}</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder={placeholders.project.address}
                    required
                    aria-label={labels.forms.projectAddress}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duree_estimee" className="font-semibold">{labels.forms.projectDuration}</Label>
                  <Input
                    id="duree_estimee"
                    type="number"
                    value={formData.duree_estimee}
                    onChange={(e) => setFormData({ ...formData, duree_estimee: parseInt(e.target.value) })}
                    placeholder={placeholders.project.duration}
                    required
                    aria-label={labels.forms.projectDuration}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-semibold">{labels.forms.projectDescription}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Détails du chantier..."
                    aria-label={labels.forms.projectDescription}
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
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder={placeholders.generic.search}
          className="pl-12 h-12 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label={placeholders.generic.search}
        />
      </div>

      {filteredProjects.length === 0 && !searchTerm ? (
        <EmptyState
          icon={Building}
          title={emptyStates.projects.title}
          text={emptyStates.projects.text}
          primaryAction={{
            label: emptyStates.projects.primary,
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Aucun chantier trouvé"
          text="Essayez avec d'autres mots-clés"
        />
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
