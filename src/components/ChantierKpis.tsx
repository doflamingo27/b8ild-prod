import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Calendar, Euro, Clock } from "lucide-react";
import { ChantierMetrics } from "@/hooks/useChantierMetrics";
import { getRentabilityBadge } from "@/lib/rentabilityBadge";

interface ChantierKpisProps {
  metrics: ChantierMetrics | null;
}

export default function ChantierKpis({ metrics }: ChantierKpisProps) {
  if (!metrics) return null;

  const rentabilityBadge = getRentabilityBadge(metrics.marge_finale_pct || 0);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return '—';
    return Math.floor(value).toString();
  };

  const isProfitable = metrics.marge_finale_pct >= 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Marge Finale Estimée - KPI Principal */}
      <Card className={`card-premium ${rentabilityBadge.urgency === 'critical' || rentabilityBadge.urgency === 'high' ? 'border-4 border-red-500 animate-pulse' : 'border-2'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Rentabilité Finale Estimée</CardTitle>
          {(rentabilityBadge.urgency === 'critical' || rentabilityBadge.urgency === 'high') ? (
            <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
          ) : (
            <Activity className="h-6 w-6 text-primary" />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`text-5xl font-black tracking-tight ${(rentabilityBadge.urgency === 'critical' || rentabilityBadge.urgency === 'high') ? 'text-red-500' : ''}`}>
              {metrics.marge_finale_pct?.toFixed(1) ?? '0'}%
            </div>
            <div className="text-sm text-muted-foreground">projection finale</div>
            <Badge className={`font-bold text-lg px-5 py-2 border-2 ${rentabilityBadge.bgColor} ${rentabilityBadge.color}`}>
              {rentabilityBadge.emoji} {rentabilityBadge.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Budget HT
              </CardTitle>
              <Euro className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.budget_ht)}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Coût/jour équipe
              </CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.cout_journalier_equipe)}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Coûts fixes
              </CardTitle>
              <Euro className="h-4 w-4 text-alert" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.couts_fixes_engages)}</div>
            <p className="text-xs text-muted-foreground mt-1">Frais + Factures</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Jours écoulés
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.jours_ecoules)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              sur {formatNumber(metrics.duree_estimee_jours)} prévus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Marge à date, Jours restants, Marge finale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Marge à date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${metrics.marge_a_date >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(metrics.marge_a_date)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget disponible: {formatCurrency(metrics.budget_disponible)}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${metrics.jours_restants_rentables != null && metrics.jours_restants_rentables <= 7 ? 'border-warning' : 'border-border'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Jours rentables restants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              metrics.jours_restants_rentables != null && metrics.jours_restants_rentables <= 3 
                ? 'text-danger' 
                : metrics.jours_restants_rentables != null && metrics.jours_restants_rentables <= 7
                ? 'text-warning'
                : 'text-success'
            }`}>
              {metrics.jours_restants_rentables == null ? '—' : metrics.jours_restants_rentables}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avant déficit
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-success">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Marge finale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className={`text-3xl font-bold ${metrics.marge_finale >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(metrics.marge_finale)}
              </span>
              <span className={`text-2xl font-semibold ${metrics.marge_finale_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                ({metrics.marge_finale_pct?.toFixed(1)}%)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Projection à la fin du chantier
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
