import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import KPICard from "@/components/KPICard";
import ProjectCard from "@/components/ProjectCard";
import { TrendingUp, Users, AlertTriangle, Building } from "lucide-react";

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

      // Get projects
      const { data: projects } = await supabase
        .from("chantiers")
        .select("*")
        .eq("entreprise_id", entrepriseData.id)
        .order("date_creation", { ascending: false })
        .limit(6);

      // Get team members
      const { data: team } = await supabase
        .from("membres_equipe")
        .select("id")
        .eq("entreprise_id", entrepriseData.id)
        .eq("actif", true);

      setStats({
        totalProjects: projects?.length || 0,
        avgRentabilite: 15.5, // Calculé dynamiquement plus tard
        totalTeam: team?.length || 0,
        alertsCount: 0,
      });

      setRecentProjects(projects || []);
    } catch (error) {
      console.error("Erreur chargement dashboard:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue {user?.user_metadata?.prenom} ! Voici un aperçu de votre activité.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <div>
        <h2 className="text-2xl font-black mb-4">Chantiers récents</h2>
        {recentProjects.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun chantier. Créez votre premier chantier pour commencer.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
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
    </div>
  );
};

export default Dashboard;
