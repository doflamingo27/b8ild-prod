import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  TrendingUp,
  BarChart,
  TrendingDown,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AIChantierAnalysisProps {
  chantierId: string;
}

export const AIChantierAnalysis = ({ chantierId }: AIChantierAnalysisProps) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLatestAnalysis();
  }, [chantierId]);

  const loadLatestAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('chantier_id', chantierId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setAnalysis(data.analysis_data);
        setLastUpdate(new Date(data.created_at));
      }
    } catch (error) {
      console.log('No previous analysis found');
    }
  };

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chantier-analysis', {
        body: { chantierId }
      });

      if (error) throw error;

      if (data) {
        setAnalysis(data);
        setLastUpdate(new Date());
        toast({
          title: "✨ Analyse générée",
          description: "L'analyse IA du chantier a été générée avec succès",
        });
      }
    } catch (error: any) {
      console.error('Error generating analysis:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération de l'analyse IA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statut: string) => {
    const colors: Record<string, string> = {
      excellent: "bg-green-500 text-white",
      bon: "bg-blue-500 text-white",
      moyen: "bg-yellow-500 text-white",
      problematique: "bg-orange-500 text-white",
      critique: "bg-red-500 text-white",
    };
    return colors[statut?.toLowerCase()] || "bg-gray-500 text-white";
  };

  const getSeverityColor = (severite: string) => {
    const colors: Record<string, string> = {
      critique: "bg-red-500 text-white",
      haute: "bg-orange-500 text-white",
      moyenne: "bg-yellow-500 text-white",
      faible: "bg-blue-500 text-white",
    };
    return colors[severite?.toLowerCase()] || "bg-gray-500 text-white";
  };

  const getPriorityColor = (priorite: string) => {
    const colors: Record<string, string> = {
      urgente: "bg-red-500 text-white",
      haute: "bg-orange-500 text-white",
      moyenne: "bg-yellow-500 text-white",
      basse: "bg-blue-500 text-white",
    };
    return colors[priorite?.toLowerCase()] || "bg-gray-500 text-white";
  };

  const getTendanceIcon = (tendance: string) => {
    if (tendance === 'aggravation') return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (tendance === 'amelioration') return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 75) return "text-red-600";
    if (risk >= 50) return "text-orange-600";
    if (risk >= 25) return "text-yellow-600";
    return "text-green-600";
  };

  const getPriorityOrder = (priorite: string) => {
    const order: Record<string, number> = {
      urgente: 1,
      haute: 2,
      moyenne: 3,
      basse: 4,
    };
    return order[priorite?.toLowerCase()] || 5;
  };

  if (!analysis && !loading) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-16 pb-16 text-center">
          <Brain className="h-20 w-20 mx-auto text-primary mb-4" />
          <p className="text-xl font-semibold mb-4">Aucune analyse disponible</p>
          <p className="text-muted-foreground mb-6">
            Générez votre première analyse IA pour obtenir des recommandations personnalisées
          </p>
          <Button onClick={generateAnalysis} disabled={loading} size="lg" className="hover-lift">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 mr-2" />
                Générer l'analyse IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* En-tête avec score global */}
      <Card className="card-premium border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="h-7 w-7 text-primary" />
              Analyse IA du chantier
            </CardTitle>
            <Button onClick={generateAnalysis} disabled={loading} className="hover-lift">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Actualiser</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-7xl font-black text-gradient-primary">
              {analysis?.score_global || 0}
              <span className="text-3xl text-muted-foreground">/100</span>
            </div>
            <div className="flex-1">
              <Badge className={`${getStatusColor(analysis?.statut)} text-lg px-4 py-2`}>
                {analysis?.statut?.toUpperCase()}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Dernière analyse : {lastUpdate ? format(lastUpdate, 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertes urgentes */}
      {analysis?.alertes_urgentes?.length > 0 && (
        <Alert variant="destructive" className="border-2 animate-pulse">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">⚠️ Alertes urgentes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-2 mt-2">
              {analysis.alertes_urgentes.map((alerte: string, i: number) => (
                <li key={i} className="font-medium">{alerte}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Onglets */}
      <Tabs defaultValue="problemes" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-14 bg-muted/50 p-1">
          <TabsTrigger value="problemes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Problèmes ({analysis?.problemes_detectes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="positifs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle className="h-4 w-4 mr-2" />
            Points positifs
          </TabsTrigger>
          <TabsTrigger value="recommandations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Lightbulb className="h-4 w-4 mr-2" />
            Recommandations
          </TabsTrigger>
          <TabsTrigger value="previsions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-4 w-4 mr-2" />
            Prévisions
          </TabsTrigger>
          <TabsTrigger value="standards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart className="h-4 w-4 mr-2" />
            Standards BTP
          </TabsTrigger>
        </TabsList>

        {/* Onglet Problèmes */}
        <TabsContent value="problemes" className="space-y-4 mt-6">
          {analysis?.problemes_detectes?.length === 0 ? (
            <Card className="card-premium">
              <CardContent className="pt-12 pb-12 text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <p className="text-xl font-semibold text-muted-foreground">Aucun problème détecté</p>
                <p className="text-sm text-muted-foreground mt-2">Le chantier semble bien se dérouler</p>
              </CardContent>
            </Card>
          ) : (
            analysis?.problemes_detectes?.map((probleme: any, index: number) => (
              <Card key={index} className={`card-premium border-l-4 ${
                probleme.severite === 'critique' ? 'border-l-red-500' :
                probleme.severite === 'haute' ? 'border-l-orange-500' :
                probleme.severite === 'moyenne' ? 'border-l-yellow-500' : 'border-l-blue-500'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(probleme.severite)}>
                          {probleme.severite}
                        </Badge>
                        <Badge variant="outline">{probleme.categorie}</Badge>
                      </div>
                      <CardTitle className="text-xl">{probleme.titre}</CardTitle>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-primary">{probleme.impact_financier}</div>
                      <Badge variant="outline" className="mt-1">
                        {getTendanceIcon(probleme.tendance)}
                        <span className="ml-1">{probleme.tendance}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{probleme.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Onglet Points positifs */}
        <TabsContent value="positifs" className="space-y-4 mt-6">
          {analysis?.points_positifs?.map((point: any, index: number) => (
            <Card key={index} className="card-premium border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">{point.categorie}</Badge>
                  <CardTitle className="text-xl">{point.titre}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Onglet Recommandations */}
        <TabsContent value="recommandations" className="space-y-4 mt-6">
          {analysis?.recommandations
            ?.sort((a: any, b: any) => getPriorityOrder(a.priorite) - getPriorityOrder(b.priorite))
            .map((rec: any, index: number) => (
              <Card key={index} className="card-premium">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getPriorityColor(rec.priorite)}>
                          {rec.priorite}
                        </Badge>
                        <Badge variant="outline">{rec.categorie}</Badge>
                        <Badge variant="outline">⏱️ {rec.delai_action}</Badge>
                      </div>
                      <CardTitle className="text-xl">{rec.titre}</CardTitle>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-green-600">{rec.impact_attendu}</div>
                      <p className="text-xs text-muted-foreground">Impact estimé</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">{rec.description}</p>
                  
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Actions concrètes :
                    </h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {rec.actions_concretes?.map((action: string, i: number) => (
                        <li key={i} className="text-sm leading-relaxed">{action}</li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Onglet Prévisions */}
        <TabsContent value="previsions" className="mt-6">
          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow">
                  <p className="text-sm text-muted-foreground mb-2">📅 Date de fin estimée</p>
                  <p className="text-3xl font-bold mb-1">
                    {analysis?.previsions?.date_fin_estimee 
                      ? format(new Date(analysis.previsions.date_fin_estimee), 'dd/MM/yyyy', { locale: fr })
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Confiance: {analysis?.previsions?.confiance_prevision}%
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow">
                  <p className="text-sm text-muted-foreground mb-2">💰 Coût total estimé</p>
                  <p className="text-3xl font-bold text-primary">
                    {analysis?.previsions?.cout_total_estime}
                  </p>
                </div>
                
                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow">
                  <p className="text-sm text-muted-foreground mb-2">⚠️ Risque dépassement budget</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className={`text-3xl font-bold ${getRiskColor(analysis?.previsions?.risque_depassement_budget)}`}>
                      {analysis?.previsions?.risque_depassement_budget}%
                    </p>
                  </div>
                  <Progress 
                    value={analysis?.previsions?.risque_depassement_budget} 
                    className="h-3"
                  />
                </div>
                
                <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow">
                  <p className="text-sm text-muted-foreground mb-2">📊 Rentabilité finale estimée</p>
                  <p className="text-3xl font-bold text-green-600">
                    {analysis?.previsions?.rentabilite_finale_estimee}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Standards BTP */}
        <TabsContent value="standards" className="mt-6">
          <Card className="card-premium">
            <CardContent className="pt-6 space-y-4">
              {Object.entries(analysis?.comparaison_standards_btp || {}).map(([key, value]) => (
                <div key={key} className="p-6 border rounded-lg bg-card hover:shadow-lg transition-shadow">
                  <h4 className="font-bold text-lg mb-3 capitalize flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-primary" />
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">{value as string}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
