import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import KPICard from "@/components/KPICard";
import ProjectCard from "@/components/ProjectCard";
import { TrendingUp, Users, AlertTriangle, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    avgRentabilite: 0,
    totalTeam: 0,
    alertsCount: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

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

          return { ...project, rentabilite, jours_restants: 30 }; // TODO: Calculate real days
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

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gradient-primary">Tableau de bord</h1>
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black">Chantiers récents</h2>
          <Button variant="default" size="sm" asChild>
            <Link to="/projects">Voir tous</Link>
          </Button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="card-premium text-center py-16">
            <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-muted-foreground mb-2">
              Aucun chantier pour le moment
            </p>
            <p className="text-muted-foreground mb-6">
              Créez votre premier chantier pour commencer à suivre sa rentabilité
            </p>
            <Button size="lg" asChild>
              <Link to="/projects">Créer un chantier</Link>
            </Button>
          </div>
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
