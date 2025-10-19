import { useMemo } from "react";
import { calculateWorkingDays } from "@/lib/dateUtils";

interface Membre {
  taux_horaire: number;
  charges_salariales: number;
  charges_patronales: number;
}

interface CalculationsParams {
  membres?: Membre[];
  budget_devis?: number;
  couts_fixes?: number;
  date_debut?: string | null;
  absences?: Array<{ date_debut: string; date_fin: string }>;
}

export const useCalculations = ({
  membres = [],
  budget_devis = 0,
  couts_fixes = 0,
  date_debut = null,
  absences = [],
}: CalculationsParams) => {
  return useMemo(() => {
    // Calculer les jours effectifs (jours ouvrés réels depuis la date de début)
    // Exclut les week-ends, jours fériés français et absences de l'équipe
    const jours_effectifs = date_debut 
      ? calculateWorkingDays(date_debut, new Date(), absences)
      : 0;
    // Coût horaire réel d'un membre
    const calculerCoutHoraireReel = (membre: Membre) => {
      return membre.taux_horaire * (1 + membre.charges_salariales / 100 + membre.charges_patronales / 100);
    };

    // Coût journalier d'un membre (8h)
    const calculerCoutJournalierMembre = (membre: Membre) => {
      return calculerCoutHoraireReel(membre) * 8;
    };

    // Coût journalier total de l'équipe
    const cout_journalier_equipe = membres.reduce((total, membre) => {
      return total + calculerCoutJournalierMembre(membre);
    }, 0);

    // Budget disponible
    const budget_disponible = budget_devis - couts_fixes;

    // Jour critique (nombre de jours avant déficit)
    const jour_critique = cout_journalier_equipe > 0 
      ? budget_disponible / cout_journalier_equipe 
      : Infinity;

    // Rentabilité en %
    const rentabilite_pct = budget_devis > 0 
      ? (budget_disponible / budget_devis) * 100 
      : 0;

    // Jours restants avant déficit
    const jours_restants_avant_deficit = Math.max(0, Math.floor(jour_critique - jours_effectifs));

    // Statut couleur
    let statut: "success" | "warning" | "alert" | "danger";
    if (rentabilite_pct >= 20) statut = "success";
    else if (rentabilite_pct >= 10) statut = "warning";
    else if (rentabilite_pct > 0) statut = "alert";
    else statut = "danger";

    return {
      jours_effectifs,
      cout_journalier_equipe,
      budget_disponible,
      jour_critique,
      rentabilite_pct,
      jours_restants_avant_deficit,
      statut,
      calculerCoutHoraireReel,
      calculerCoutJournalierMembre,
    };
  }, [membres, budget_devis, couts_fixes, date_debut, absences]);
};
