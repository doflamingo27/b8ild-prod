import { useChantierMetrics } from "@/hooks/useChantierMetrics";
import ProjectCard from "./ProjectCard";

interface RealtimeProjectCardProps {
  project: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

const RealtimeProjectCard = ({ project, onEdit, onDelete }: RealtimeProjectCardProps) => {
  const { metrics, loading } = useChantierMetrics(project.id);

  console.log('[🔴 RealtimeProjectCard MOUNTED v2]', project.nom_chantier);

  const rentabilite = metrics?.marge_finale_pct || 0;
  const joursRestants = metrics?.jours_restants_rentables ?? project.duree_estimee_jours;
  const budgetDevis = metrics?.budget_ht || 0;
  const coutsEngages = (metrics?.couts_fixes_engages || 0) + (metrics?.cout_main_oeuvre_reel || 0);

  console.log('[📊 RealtimeProjectCard DATA v2]', project.nom_chantier, {
    loading,
    hasMetrics: !!metrics,
    rentabilite,
    joursRestants,
    budgetDevis,
    coutsEngages,
    progressPct: budgetDevis > 0 ? ((coutsEngages / budgetDevis) * 100).toFixed(1) : 0
  });

  return (
    <ProjectCard
      key={project.id}
      id={project.id}
      nom_chantier={project.nom_chantier}
      client={project.client}
      rentabilite={rentabilite}
      jours_restants={joursRestants}
      budget_devis={budgetDevis}
      couts_engages={coutsEngages}
      etat_chantier={project.etat_chantier}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default RealtimeProjectCard;
