import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useChantiersRealtime } from "@/hooks/useChantiersRealtime";
import KPICard from "@/components/KPICard";
import RealtimeProjectCard from "@/components/RealtimeProjectCard";
import EmptyState from "@/components/EmptyState";
import { TrendingUp, Users, AlertTriangle, Building, Plus, Brain } from "lucide-react";
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

  // Setup Realtime subscriptions
  const handleRealtimeChange = useCallback(() => {
    loadDashboardData();
  }, []);

  useChantiersRealtime(entrepriseId, handleRealtimeChange);

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

      // Get projects with metrics from chantier_metrics_realtime
      const { data: projects } = await supabase
        .from("chantiers")
        .select(`
          *,
          chantier_metrics_realtime (metrics)
        `)
        .eq("entreprise_id", entrepriseData.id)
        .eq("statut", "actif")
        .order("date_creation", { ascending: false });

      // Get team members
      const { data: team } = await supabase
        .from("membres_equipe")
        .select("id")
        .eq("entreprise_id", entrepriseData.id)
        .in("statut", ['sur_chantier', 'disponible']);

      // Calculate stats from real-time metrics
      const totalProjects = projects?.length || 0;
      
      const projectsWithMetrics = (projects || []).map(project => ({
        ...project,
        // Relation chantier_metrics_realtime est 1-1, pas un tableau
        metrics: (project as any).chantier_metrics_realtime?.metrics as any,
      }));

      // Debug logs
      console.log('[Dashboard] Projects with metrics:', projectsWithMetrics.length);
      console.log('[Dashboard] Sample project metrics:', projectsWithMetrics[0]?.metrics);

      // Average rentabilite from metrics
      const projectsWithRentabilite = projectsWithMetrics.filter(p => {
        const hasProfitability = p.metrics?.profitability_pct != null;
        if (!hasProfitability && p.metrics) {
          console.log('[Dashboard] Project without profitability_pct:', p.nom_chantier, 'metrics:', p.metrics);
        }
        return hasProfitability;
      });
      
      console.log('[Dashboard] Projects with rentabilite:', projectsWithRentabilite.length);
      
      const avgRentabilite = projectsWithRentabilite.length > 0
        ? projectsWithRentabilite.reduce((sum, p) => sum + (p.metrics?.profitability_pct || 0), 0) / projectsWithRentabilite.length
        : 0;

      console.log('[Dashboard] Average rentabilite calculated:', avgRentabilite);

      // Count alerts (profitability < 10%)
      const alertsCount = projectsWithMetrics.filter(p => (p.metrics?.profitability_pct || 0) < 10).length;

      setStats({
        totalProjects,
        avgRentabilite,
        totalTeam: team?.length || 0,
        alertsCount,
      });

      setRecentProjects(projectsWithMetrics.slice(0, 6));
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

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce chantier définitivement ?")) {
      return;
    }

    try {
      // Supprimer le chantier (CASCADE supprimera automatiquement toutes les dépendances)
      const { error } = await supabase
        .from("chantiers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Chantier supprimé",
        description: "Le chantier a été supprimé définitivement.",
      });
      
      loadDashboardData();
    } catch (error: any) {
      console.error("Erreur suppression chantier:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le chantier",
        variant: "destructive",
      });
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

      {/* Callout IA */}
      <Card className="card-premium border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/50">
              <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">✨ Analyse IA disponible</h3>
              <p className="text-muted-foreground">
                Obtenez une analyse complète de chaque chantier avec des recommandations personnalisées, 
                prévisions financières et comparaison aux standards BTP. 
                <strong> Accédez à l'onglet "Analyse IA"</strong> depuis le détail d'un chantier.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date_debut_prevue" className="font-semibold">Date de début *</Label>
                        <Input
                          id="date_debut_prevue"
                          type="date"
                          value={formData.date_debut_prevue}
                          onChange={(e) => setFormData({ ...formData, date_debut_prevue: e.target.value })}
                          required
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

                    <div className="space-y-2">
                      <Label htmlFor="duree_estimee_jours" className="font-semibold">Durée estimée (jours travaillés)</Label>
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
                      <Label htmlFor="date_fin_reelle" className="font-semibold">Date de fin réelle</Label>
                      <Input
                        id="date_fin_reelle"
                        type="date"
                        value={formData.date_fin_reelle}
                        onChange={(e) => setFormData({ ...formData, date_fin_reelle: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">À remplir à la fin du chantier</p>
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
            {recentProjects.map((project) => (
              <RealtimeProjectCard
                key={project.id}
                project={project}
                onEdit={(id) => navigate(`/projects/${id}`)}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
