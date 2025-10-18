import { useMemo } from "react";

export interface Alert {
  id: string;
  type: "warning" | "alert" | "danger" | "critical";
  title: string;
  message: string;
  chantierId: string;
  chantierNom: string;
}

interface UseAlertsParams {
  chantiers: Array<{
    id: string;
    nom_chantier: string;
    rentabilite_pct: number;
    jours_restants: number;
  }>;
}

export const useAlerts = ({ chantiers }: UseAlertsParams) => {
  return useMemo(() => {
    const alerts: Alert[] = [];

    chantiers.forEach((chantier) => {
      const { id, nom_chantier, rentabilite_pct, jours_restants } = chantier;

      // Alerte critique : déficit
      if (rentabilite_pct <= 0) {
        alerts.push({
          id: `${id}-critical`,
          type: "critical",
          title: "DÉFICIT CRITIQUE",
          message: `Le chantier "${nom_chantier}" est en déficit (${rentabilite_pct.toFixed(1)}%)`,
          chantierId: id,
          chantierNom: nom_chantier,
        });
      }
      // Alerte rouge : 1 jour avant déficit
      else if (jours_restants <= 1) {
        alerts.push({
          id: `${id}-danger`,
          type: "danger",
          title: "Alerte rouge",
          message: `Le chantier "${nom_chantier}" atteindra le déficit dans ${jours_restants} jour`,
          chantierId: id,
          chantierNom: nom_chantier,
        });
      }
      // Alerte orange : 3 jours avant déficit
      else if (jours_restants <= 3) {
        alerts.push({
          id: `${id}-alert`,
          type: "alert",
          title: "Alerte orange",
          message: `Le chantier "${nom_chantier}" atteindra le déficit dans ${jours_restants} jours`,
          chantierId: id,
          chantierNom: nom_chantier,
        });
      }
      // Alerte jaune : 7 jours avant déficit
      else if (jours_restants <= 7) {
        alerts.push({
          id: `${id}-warning`,
          type: "warning",
          title: "Attention requise",
          message: `Le chantier "${nom_chantier}" atteindra le déficit dans ${jours_restants} jours`,
          chantierId: id,
          chantierNom: nom_chantier,
        });
      }
    });

    // Trier par criticité
    const order = { critical: 0, danger: 1, alert: 2, warning: 3 };
    alerts.sort((a, b) => order[a.type] - order[b.type]);

    return alerts;
  }, [chantiers]);
};
