import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Calendar, Euro, Clock } from "lucide-react";
import { ChantierMetrics } from "@/hooks/useChantierMetrics";

interface ChantierKpisProps {
  metrics: ChantierMetrics | null;
}

function StatutBadge({ statut }: { statut: string }) {
  const config: Record<string, { variant: any; label: string; className: string }> = {
    VERT: { variant: 'default', label: '✓ Rentable', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20' },
    JAUNE: { variant: 'secondary', label: '⚠ Attention', className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20' },
    ORANGE: { variant: 'secondary', label: '⚠ Alerte', className: 'bg-alert/10 text-alert border-alert/20 hover:bg-alert/20' },
    ROUGE: { variant: 'destructive', label: '✕ Critique', className: 'bg-danger/10 text-danger border-danger/20 hover:bg-danger/20' },
  };

  const c = config[statut] || config.VERT;
  return <Badge className={c.className}>{c.label}</Badge>;
}

export default function ChantierKpis({ metrics }: ChantierKpisProps) {
  if (!metrics) return null;

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

  const isProfitable = metrics.profitability_pct >= 0;
  const isHealthy = metrics.profitability_pct >= 10;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Statut principal */}
      <Card className="card-premium border-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Statut de rentabilité</CardTitle>
          <Activity className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <StatutBadge statut={metrics.statut_rentabilite} />
            <div className="flex items-center gap-2">
              {isProfitable ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-danger" />
              )}
              <span className={`text-3xl font-bold ${isProfitable ? 'text-success' : 'text-danger'}`}>
                {metrics.profitability_pct?.toFixed(1) ?? '0'}%
              </span>
            </div>
            {!isHealthy && (
              <div className="ml-auto flex items-center gap-2 text-alert">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">Surveillance nécessaire</span>
              </div>
            )}
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

      {/* Jour critique et marge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={`border-2 ${metrics.jours_restants_rentables != null && metrics.jours_restants_rentables <= 3 ? 'border-danger' : 'border-border'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Jour critique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.jour_critique == null ? '—' : Math.floor(metrics.jour_critique)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Jour de basculement en déficit
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
      </div>
    </div>
  );
}
