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

  const rentabilite = metrics?.profitability_pct || 0;
  const joursRestants = metrics?.jours_restants_rentables ?? project.duree_estimee_jours;

  console.log('[📊 RealtimeProjectCard DATA v2]', project.nom_chantier, {
    loading,
    hasMetrics: !!metrics,
    rentabilite,
    joursRestants,
    jours_restants_db: metrics?.jours_restants_rentables,
    duree_estimee: project.duree_estimee_jours
  });

  return (
    <ProjectCard
      key={project.id}
      id={project.id}
      nom_chantier={project.nom_chantier}
      client={project.client}
      rentabilite={rentabilite}
      jours_restants={joursRestants}
      etat_chantier={project.etat_chantier}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default RealtimeProjectCard;
