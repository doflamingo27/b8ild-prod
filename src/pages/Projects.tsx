import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Building, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [editStateDialogOpen, setEditStateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    nom_chantier: "",
    client: "",
    adresse: "",
    duree_estimee: 30,
    description: "",
    etat_chantier: "brouillon",
    date_debut_prevue: new Date().toISOString().split('T')[0],
    date_fin_estimee: "",
    date_fin_reelle: "",
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

      // Charger les métriques pour chaque chantier
      const projectsWithMetrics = await Promise.all(
        (data || []).map(async (project) => {
          const { data: metricsData } = await supabase
            .from("chantier_metrics_realtime")
            .select("metrics")
            .eq("chantier_id", project.id)
            .single();

          return {
            ...project,
            metrics: metricsData?.metrics as any,
          };
        })
      );

      setProjects(projectsWithMetrics);
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
        etat_chantier: "brouillon",
        date_debut_prevue: new Date().toISOString().split('T')[0],
        date_fin_estimee: "",
        date_fin_reelle: "",
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

  // Calcul des statistiques
  const totalChantiers = projects.length;
  const chantiersEnCours = projects.filter(p => p.etat_chantier === 'en_cours').length;
  const chantiersTermines = projects.filter(p => p.etat_chantier === 'termine').length;
  const chantiersEnRetard = projects.filter(p => {
    if (!p.date_fin_estimee || p.etat_chantier === 'termine' || p.etat_chantier === 'annule') return false;
    return new Date(p.date_fin_estimee) < new Date();
  }).length;

  const handleEditState = (project: any) => {
    setEditingProject(project);
    setEditStateDialogOpen(true);
  };

  const handleUpdateState = async (newState: string) => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from("chantiers")
        .update({ etat_chantier: newState })
        .eq("id", editingProject.id);

      if (error) throw error;

      toast({
        title: toasts.updated,
        description: "L'état du chantier a été modifié.",
      });

      setEditStateDialogOpen(false);
      setEditingProject(null);
      loadProjects();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: toasts.errorGeneric,
        variant: "destructive",
      });
    }
  };

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
                
                <div className="space-y-2">
                  <Label htmlFor="etat_chantier" className="font-semibold">État du chantier *</Label>
                  <Select
                    value={formData.etat_chantier}
                    onValueChange={(value) => setFormData({ ...formData, etat_chantier: value })}
                  >
                    <SelectTrigger id="etat_chantier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brouillon">📝 Brouillon</SelectItem>
                      <SelectItem value="projection">🔮 Projection</SelectItem>
                      <SelectItem value="attente_signature">✍️ En attente de signature</SelectItem>
                      <SelectItem value="en_cours">🚧 En cours</SelectItem>
                      <SelectItem value="suspendu">⏸️ Suspendu</SelectItem>
                      <SelectItem value="termine">✅ Terminé</SelectItem>
                      <SelectItem value="annule">❌ Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_debut_prevue" className="font-semibold">Date de début prévue</Label>
                    <Input
                      id="date_debut_prevue"
                      type="date"
                      value={formData.date_debut_prevue}
                      onChange={(e) => setFormData({ ...formData, date_debut_prevue: e.target.value })}
                      aria-label="Date de début prévue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_fin_estimee" className="font-semibold">Date de fin estimée</Label>
                    <Input
                      id="date_fin_estimee"
                      type="date"
                      value={formData.date_fin_estimee}
                      onChange={(e) => setFormData({ ...formData, date_fin_estimee: e.target.value })}
                      aria-label="Date de fin estimée"
                    />
                  </div>
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

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Total Chantiers
            </CardTitle>
            <Building className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalChantiers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              En Cours
            </CardTitle>
            <Clock className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{chantiersEnCours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Terminés
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{chantiersTermines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              En Retard
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">{chantiersEnRetard}</div>
          </CardContent>
        </Card>
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
          {filteredProjects.map((project) => {
            const metrics = project.metrics || {};
            const rentabilite = metrics.profitability_pct || 0;
            const joursRestants = metrics.jours_restants_rentables || project.duree_estimee || 0;
            
            return (
              <ProjectCard
                key={project.id}
                id={project.id}
                nom_chantier={project.nom_chantier}
                client={project.client}
                rentabilite={rentabilite}
                jours_restants={joursRestants}
                budget_devis={project.budget_ht || 0}
                couts_engages={(metrics.couts_fixes_engages || 0) + (metrics.cout_main_oeuvre_reel || 0)}
                etat_chantier={project.etat_chantier}
                onEdit={() => handleEditState(project)}
              />
            );
          })}
        </div>
      )}

      {/* Dialog d'édition de l'état */}
      <Dialog open={editStateDialogOpen} onOpenChange={setEditStateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Modifier l'état du chantier</DialogTitle>
            <DialogDescription className="text-base">
              Choisissez le nouvel état pour "{editingProject?.nom_chantier}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleUpdateState('brouillon')}
            >
              <span className="text-2xl mr-3">📝</span>
              <span className="font-semibold">Brouillon</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleUpdateState('projection')}
            >
              <span className="text-2xl mr-3">🔮</span>
              <span className="font-semibold">Projection</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleUpdateState('attente_signature')}
            >
              <span className="text-2xl mr-3">✍️</span>
              <span className="font-semibold">En attente de signature</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleUpdateState('en_cours')}
            >
              <span className="text-2xl mr-3">🚧</span>
              <span className="font-semibold">En cours</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleUpdateState('suspendu')}
            >
              <span className="text-2xl mr-3">⏸️</span>
              <span className="font-semibold">Suspendu</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleUpdateState('termine')}
            >
              <span className="text-2xl mr-3">✅</span>
              <span className="font-semibold">Terminé</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => handleUpdateState('annule')}
            >
              <span className="text-2xl mr-3">❌</span>
              <span className="font-semibold">Annulé</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
