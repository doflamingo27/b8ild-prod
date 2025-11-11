import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import KPICard from "@/components/KPICard";
import ProjectCard from "@/components/ProjectCard";
import EmptyState from "@/components/EmptyState";
import { TrendingUp, Users, AlertTriangle, Building, Upload, Receipt, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { labels, emptyStates, tooltips, toasts, placeholders } from "@/lib/content";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalProjects: 0,
    avgRentabilite: 0,
    totalTeam: 0,
    alertsCount: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom_chantier: "",
    client: "",
    adresse: "",
    duree_estimee_jours: 30,
    description: "",
    etat_chantier: "brouillon",
    date_debut_prevue: new Date().toISOString().split('T')[0],
    date_fin_estimee: "",
    date_fin_reelle: "",
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get entreprise ID
      const { data: entrepriseData } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user?.id)
        .single();

      if (!entrepriseData) return;
      setEntrepriseId(entrepriseData.id);

      // Get projects with details for real calculations
      const { data: projects } = await supabase
        .from("chantiers")
        .select("*")
        .eq("entreprise_id", entrepriseData.id)
        .eq("statut", "actif")
        .order("date_creation", { ascending: false });

      // Get team members
      const { data: team } = await supabase
        .from("membres_equipe")
        .select("id")
        .eq("entreprise_id", entrepriseData.id)
        .eq("actif", true);

      // Calculate real stats
      const totalProjects = projects?.length || 0;
      
      // Get devis for all projects to calculate average rentabilite
      const projectsWithDevis = await Promise.all(
        (projects || []).map(async (project) => {
          const { data: devis } = await supabase
            .from("devis")
            .select("montant_ttc")
            .eq("chantier_id", project.id)
            .maybeSingle();

          const { data: factures } = await supabase
            .from("factures_fournisseurs")
            .select("montant_ht")
            .eq("chantier_id", project.id);

          const { data: frais } = await supabase
            .from("frais_chantier")
            .select("montant_total")
            .eq("chantier_id", project.id);

          const totalFactures = factures?.reduce((sum, f) => sum + Number(f.montant_ht), 0) || 0;
          const totalFrais = frais?.reduce((sum, f) => sum + Number(f.montant_total), 0) || 0;
          const coutsFixes = totalFactures + totalFrais;
          const budgetDisponible = (devis?.montant_ttc || 0) - coutsFixes;
          const rentabilite = devis?.montant_ttc > 0 ? (budgetDisponible / devis.montant_ttc) * 100 : 0;

          const jours_effectifs = project.date_debut_prevue 
            ? Math.max(0, Math.floor((new Date().getTime() - new Date(project.date_debut_prevue).getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          
          return { ...project, rentabilite, jours_restants: 30 }; // TODO: recalculate with real budget
        })
      );

      const avgRentabilite = projectsWithDevis.length > 0
        ? projectsWithDevis.reduce((sum, p) => sum + p.rentabilite, 0) / projectsWithDevis.length
        : 0;

      // Count alerts
      const alertsCount = projectsWithDevis.filter(p => p.rentabilite < 10).length;

      setStats({
        totalProjects,
        avgRentabilite,
        totalTeam: team?.length || 0,
        alertsCount,
      });

      setRecentProjects(projectsWithDevis.slice(0, 6));
    } catch (error) {
      console.error("Erreur chargement dashboard:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanedData = {
        ...formData,
        date_fin_estimee: formData.date_fin_estimee || null,
        date_fin_reelle: formData.date_fin_reelle || null,
        entreprise_id: entrepriseId,
      };

      const { error } = await supabase
        .from("chantiers")
        .insert(cleanedData);

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
        duree_estimee_jours: 30,
        description: "",
        etat_chantier: "brouillon",
        date_debut_prevue: new Date().toISOString().split('T')[0],
        date_fin_estimee: "",
        date_fin_reelle: "",
      });
      loadDashboardData();
    } catch (error: any) {
      console.error("Erreur création chantier:", error);
      toast({
        title: "Erreur",
        description: error.message || toasts.errorGeneric,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gradient-primary">{labels.nav.dashboard}</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Bienvenue {user?.user_metadata?.prenom} ! Voici un aperçu de votre activité.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Chantiers actifs"
          value={stats.totalProjects}
          icon={Building}
          subtitle="chantiers en cours"
        />
        <KPICard
          title="Rentabilité moyenne"
          value={`${stats.avgRentabilite.toFixed(1)}%`}
          icon={TrendingUp}
          trend={{ value: 2.5, isPositive: true }}
        />
        <KPICard
          title="Membres équipe"
          value={stats.totalTeam}
          icon={Users}
          subtitle="membres actifs"
        />
        <KPICard
          title="Alertes en cours"
          value={stats.alertsCount}
          icon={AlertTriangle}
          subtitle="chantiers à surveiller"
        />
      </div>

      {/* Actions rapides */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate("/import/facture")}>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Importer une facture</CardTitle>
              <CardDescription>Extraction automatique 100% des données</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black">Chantiers récents</h2>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau chantier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duree_estimee_jours" className="font-semibold">{labels.forms.projectDuration}</Label>
                      <Input
                        id="duree_estimee_jours"
                        type="number"
                        value={formData.duree_estimee_jours}
                        onChange={(e) => setFormData({ ...formData, duree_estimee_jours: parseInt(e.target.value) })}
                        placeholder={placeholders.project.duration}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-semibold">{labels.forms.projectDescription}</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Détails du chantier..."
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_fin_estimee" className="font-semibold">Date de fin estimée</Label>
                        <Input
                          id="date_fin_estimee"
                          type="date"
                          value={formData.date_fin_estimee}
                          onChange={(e) => setFormData({ ...formData, date_fin_estimee: e.target.value })}
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
            <Button variant="default" size="sm" asChild>
              <Link to="/projects">Voir tous</Link>
            </Button>
          </div>
        </div>
        
        {recentProjects.length === 0 ? (
          <EmptyState
            icon={Building}
            title={emptyStates.dashboard.title}
            text={emptyStates.dashboard.text}
            primaryAction={{
              label: emptyStates.dashboard.primary,
              onClick: () => navigate("/projects"),
            }}
            secondaryAction={{
              label: emptyStates.dashboard.secondary,
              onClick: () => navigate("/team"),
            }}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => {
              const rentabilite = project.rentabilite || 0;
              const joursRestants = project.jours_restants || project.duree_estimee;
              
              return (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  nom_chantier={project.nom_chantier}
                  client={project.client}
                  rentabilite={rentabilite}
                  jours_restants={joursRestants}
                  etat_chantier={project.etat_chantier}
                  onEdit={(id) => navigate(`/projects/${id}`)}
                  onDelete={async (id) => {
                    if (confirm("Êtes-vous sûr de vouloir supprimer ce chantier ?")) {
                      await supabase.from("chantiers").delete().eq("id", id);
                      loadDashboardData();
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
