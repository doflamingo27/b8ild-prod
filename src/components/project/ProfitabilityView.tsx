import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ChantierKpis from "@/components/ChantierKpis";
import ChantierCharts from "@/components/ChantierCharts";
import { ChantierMetrics } from "@/hooks/useChantierMetrics";
import { TrendingUp } from "lucide-react";
import { getRentabilityBadge } from "@/lib/rentabilityBadge";

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

  const rentabilityBadge = getRentabilityBadge(metrics.marge_finale_pct || 0);

  return (
    <div className="space-y-6">
      {/* Badge de rentabilité - BADGE EN AVANT */}
      <Card className="card-premium">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-8">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">Marge Actuelle</h3>
              <div className="text-3xl font-black">{metrics.profitability_pct?.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground mt-1">à ce jour</div>
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-lg font-semibold text-muted-foreground mb-3">Rentabilité Finale Estimée</h3>
              <Badge className={`text-2xl font-black px-6 py-3 border-2 ${rentabilityBadge.bgColor} ${rentabilityBadge.color}`}>
                {rentabilityBadge.emoji} {rentabilityBadge.label}
              </Badge>
            </div>
          </div>
          <div className={`mt-4 p-4 rounded-lg border-l-4 ${rentabilityBadge.bgColor}`}>
            <p className={`text-sm font-medium ${rentabilityBadge.color}`}>
              {rentabilityBadge.message}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Indicateurs clés */}
      <ChantierKpis metrics={metrics} />
      
      {/* Graphiques d'évolution */}
      <ChantierCharts chantierId={chantierId} />
    </div>
  );
};

export default ProfitabilityView;
