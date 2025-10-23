import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface PredictionData {
  predicted_end_date: string;
  confidence: number;
  budget_overrun_risk: number;
  recommendations: string[];
}

interface AIPredictionsProps {
  chantierId: string;
  projectData: {
    date_debut: string | null;
    date_fin_prevue: string | null;
    devis_montant: number;
    cout_engage: number;
  };
}

export const AIPredictions = ({ chantierId, projectData }: AIPredictionsProps) => {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredictions();
  }, [chantierId]);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-predictions", {
        body: { 
          chantier_id: chantierId,
          project_data: projectData
        },
      });

      if (!error && data) {
        setPredictions(data);
      }
    } catch (error) {
      console.error("Error loading predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Prédictions IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!predictions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Prédictions IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Impossible de générer les prédictions
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (risk: number) => {
    if (risk < 30) return "text-success";
    if (risk < 60) return "text-warning";
    return "text-destructive";
  };

  const getRiskLabel = (risk: number) => {
    if (risk < 30) return "Faible";
    if (risk < 60) return "Modéré";
    return "Élevé";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Prédictions IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date de fin prédite */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Date de fin prédite</h3>
          </div>
          <p className="text-2xl font-bold">
            {format(new Date(predictions.predicted_end_date), "dd MMMM yyyy", { locale: fr })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Confiance: {Math.round(predictions.confidence)}%
          </p>
          {projectData.date_fin_prevue && (
            <p className="text-xs text-muted-foreground mt-2">
              Date prévue initialement: {format(new Date(projectData.date_fin_prevue), "dd/MM/yyyy", { locale: fr })}
            </p>
          )}
        </div>

        {/* Risque de dépassement budgétaire */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`h-5 w-5 ${getRiskColor(predictions.budget_overrun_risk)}`} />
            <h3 className="font-semibold">Risque de dépassement</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${getRiskColor(predictions.budget_overrun_risk)}`}>
              {Math.round(predictions.budget_overrun_risk)}%
            </p>
            <span className="text-sm text-muted-foreground">
              ({getRiskLabel(predictions.budget_overrun_risk)})
            </span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                predictions.budget_overrun_risk < 30
                  ? "bg-success"
                  : predictions.budget_overrun_risk < 60
                  ? "bg-warning"
                  : "bg-destructive"
              }`}
              style={{ width: `${predictions.budget_overrun_risk}%` }}
            />
          </div>
        </div>

        {/* Recommandations */}
        {predictions.recommendations.length > 0 && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Recommandations</h3>
            </div>
            <ul className="space-y-2">
              {predictions.recommendations.map((rec, index) => (
                <li key={index} className="flex gap-2 text-sm">
                  <span className="text-primary">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};