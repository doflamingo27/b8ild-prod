import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChantierKpis from "@/components/ChantierKpis";
import ChantierCharts from "@/components/ChantierCharts";
import { ChantierMetrics } from "@/hooks/useChantierMetrics";
import { TrendingUp } from "lucide-react";

interface ProfitabilityViewProps {
  metrics: ChantierMetrics | null;
  loading: boolean;
  chantierId: string;
}

const ProfitabilityView = ({ metrics, loading, chantierId }: ProfitabilityViewProps) => {
  if (loading) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-16 pb-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des métriques de rentabilité...</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-16 pb-16 text-center">
          <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-2">
            Aucune donnée de rentabilité disponible
          </p>
          <p className="text-sm text-muted-foreground">
            Les métriques apparaîtront une fois le chantier configuré avec un budget et une équipe.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicateurs clés */}
      <ChantierKpis metrics={metrics} />
      
      {/* Graphiques d'évolution */}
      <ChantierCharts chantierId={chantierId} />
    </div>
  );
};

export default ProfitabilityView;
