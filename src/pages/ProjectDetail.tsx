import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCalculations } from "@/hooks/useCalculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Building, Users, FileText, Receipt, 
  AlertTriangle, TrendingUp, Calendar, MapPin 
} from "lucide-react";
import QuoteManager from "@/components/project/QuoteManager";
import InvoiceManager from "@/components/project/InvoiceManager";
import TeamAssignment from "@/components/project/TeamAssignment";
import ExpensesManager from "@/components/project/ExpensesManager";
import ExportManager from "@/components/ExportManager";

interface Chantier {
  id: string;
  nom_chantier: string;
  client: string;
  adresse: string;
  description: string;
  duree_estimee: number;
  statut: string;
  date_creation: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [devis, setDevis] = useState<any>(null);
  const [factures, setFactures] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [frais, setFrais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculs automatiques
  const totalFactures = factures.reduce((sum, f) => sum + Number(f.montant_ht), 0);
  const totalFrais = frais.reduce((sum, f) => sum + Number(f.montant_total), 0);
  const coutsFixes = totalFactures + totalFrais;

  const calculations = useCalculations({
    membres,
    budget_devis: devis?.montant_ttc || 0,
    couts_fixes: coutsFixes,
    jours_effectifs: 0, // À calculer selon les dates
  });

  useEffect(() => {
    if (id && user) {
      loadProjectData();
    }
  }, [id, user]);

  const loadProjectData = async () => {
    try {
      setLoading(true);

      // Charger le chantier
      const { data: chantierData, error: chantierError } = await supabase
        .from("chantiers")
        .select("*")
        .eq("id", id)
        .single();

      if (chantierError) throw chantierError;
      setChantier(chantierData);

      // Charger le devis
      const { data: devisData } = await supabase
        .from("devis")
        .select("*")
        .eq("chantier_id", id)
        .maybeSingle();
      setDevis(devisData);

      // Charger les factures
      const { data: facturesData } = await supabase
        .from("factures_fournisseurs")
        .select("*")
        .eq("chantier_id", id);
      setFactures(facturesData || []);

      // Charger les membres affectés
      const { data: equipeData } = await supabase
        .from("equipe_chantier")
        .select("*, membres_equipe(*)")
        .eq("chantier_id", id);
      
      const membresAffectes = equipeData?.map(e => e.membres_equipe) || [];
      setMembres(membresAffectes);

      // Charger les frais
      const { data: fraisData } = await supabase
        .from("frais_chantier")
        .select("*")
        .eq("chantier_id", id);
      setFrais(fraisData || []);

    } catch (error: any) {
      console.error("Erreur chargement projet:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du chantier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const { statut, rentabilite_pct } = calculations;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      warning: "secondary",
      alert: "outline",
      danger: "destructive",
    };
    
    const labels: Record<string, string> = {
      success: "Excellent",
      warning: "Bon",
      alert: "Attention",
      danger: "Déficit",
    };

    return (
      <Badge variant={variants[statut]}>
        {labels[statut]} - {rentabilite_pct.toFixed(1)}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-16 pb-16 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg font-medium">Chargement du chantier...</p>
        </CardContent>
      </Card>
    );
  }

  if (!chantier) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-16 pb-16 text-center">
          <Building className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-4">Chantier introuvable</p>
          <Button onClick={() => navigate("/projects")} variant="primary" size="lg" className="hover-lift">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour aux chantiers
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <Button onClick={() => navigate("/projects")} variant="ghost" className="mb-6 hover-lift">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux chantiers
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
              <Building className="h-9 w-9 text-primary" />
              {chantier.nom_chantier}
            </h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {chantier.client} - {chantier.adresse}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <ExportManager
              chantierId={id!}
              chantierData={chantier}
              membres={membres}
              devis={devis}
              factures={factures}
              frais={frais}
              calculations={calculations}
            />
          </div>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="card-premium hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Budget Devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black font-mono text-gradient-primary">
              {(devis?.montant_ttc || 0).toLocaleString()} €
            </p>
          </CardContent>
        </Card>

        <Card className="card-premium hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Coûts Engagés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black font-mono">
              {coutsFixes.toLocaleString()} €
            </p>
          </CardContent>
        </Card>

        <Card className="card-premium hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rentabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-black font-mono ${
              calculations.rentabilite_pct >= 20 ? "text-success" :
              calculations.rentabilite_pct >= 10 ? "text-warning" :
              calculations.rentabilite_pct > 0 ? "text-alert" :
              "text-danger"
            }`}>
              {calculations.rentabilite_pct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="card-premium hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Jours restants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-black font-mono ${
              calculations.jours_restants_avant_deficit <= 3 ? "text-danger" : 
              calculations.jours_restants_avant_deficit <= 7 ? "text-warning" :
              "text-success"
            }`}>
              {calculations.jours_restants_avant_deficit}j
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barre de progression */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progression budgétaire
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Budget disponible : <span className="font-black text-gradient-primary">{calculations.budget_disponible.toLocaleString()} €</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress 
            value={Math.min(100, (coutsFixes / (devis?.montant_ttc || 1)) * 100)} 
            className="h-4"
          />
          <p className="text-sm text-muted-foreground mt-3 text-center">
            {((coutsFixes / (devis?.montant_ttc || 1)) * 100).toFixed(1)}% du budget utilisé
          </p>
        </CardContent>
      </Card>

      {/* Alertes */}
      {calculations.jours_restants_avant_deficit <= 7 && (
        <Card className="card-premium border-alert bg-alert/10 hover-lift animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-alert text-xl font-black">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              {calculations.jours_restants_avant_deficit <= 1 ? "⚠️ ALERTE CRITIQUE" : "⚠️ Attention requise"}
            </CardTitle>
            <CardDescription className="text-alert text-base font-semibold mt-2">
              {calculations.jours_restants_avant_deficit <= 1 
                ? "Le chantier est en déficit ou proche du déficit ! Action immédiate requise." 
                : `Plus que ${calculations.jours_restants_avant_deficit} jours avant le seuil critique. Surveillez vos coûts.`}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Tabs de gestion */}
      <Card className="card-premium">
        <Tabs defaultValue="quote" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-muted/50 p-1">
            <TabsTrigger value="quote" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <FileText className="h-5 w-5 mr-2" />
              Devis
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Receipt className="h-5 w-5 mr-2" />
              Factures
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Users className="h-5 w-5 mr-2" />
              Équipe
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Receipt className="h-5 w-5 mr-2" />
              Frais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quote" className="mt-6">
            <QuoteManager chantierId={id!} devis={devis} onUpdate={loadProjectData} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <InvoiceManager chantierId={id!} factures={factures} onUpdate={loadProjectData} />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <TeamAssignment 
              chantierId={id!} 
              membres={membres} 
              onUpdate={loadProjectData}
              coutJournalier={calculations.cout_journalier_equipe}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpensesManager chantierId={id!} frais={frais} onUpdate={loadProjectData} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ProjectDetail;
