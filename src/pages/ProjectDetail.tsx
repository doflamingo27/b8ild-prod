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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chantier introuvable</p>
        <Button onClick={() => navigate("/projects")} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux chantiers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button onClick={() => navigate("/projects")} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              {chantier.nom_chantier}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {chantier.client} - {chantier.adresse}
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget Devis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black font-mono">
              {(devis?.montant_ttc || 0).toLocaleString()} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coûts Engagés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black font-mono">
              {coutsFixes.toLocaleString()} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rentabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black font-mono">
              {calculations.rentabilite_pct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Jours restants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-black font-mono ${
              calculations.jours_restants_avant_deficit <= 3 ? "text-danger" : ""
            }`}>
              {calculations.jours_restants_avant_deficit}j
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barre de progression */}
      <Card>
        <CardHeader>
          <CardTitle>Progression budgétaire</CardTitle>
          <CardDescription>
            Budget disponible : {calculations.budget_disponible.toLocaleString()} €
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress 
            value={Math.min(100, (coutsFixes / (devis?.montant_ttc || 1)) * 100)} 
            className="h-3"
          />
        </CardContent>
      </Card>

      {/* Alertes */}
      {calculations.jours_restants_avant_deficit <= 7 && (
        <Card className="border-alert bg-alert/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-alert">
              <AlertTriangle className="h-5 w-5" />
              {calculations.jours_restants_avant_deficit <= 1 ? "ALERTE CRITIQUE" : "Attention requise"}
            </CardTitle>
            <CardDescription className="text-alert">
              {calculations.jours_restants_avant_deficit <= 1 
                ? "Le chantier est en déficit ou proche du déficit !" 
                : `Plus que ${calculations.jours_restants_avant_deficit} jours avant le seuil critique`}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Tabs de gestion */}
      <Tabs defaultValue="quote" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quote">
            <FileText className="h-4 w-4 mr-2" />
            Devis
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Équipe
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="h-4 w-4 mr-2" />
            Frais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quote">
          <QuoteManager chantierId={id!} devis={devis} onUpdate={loadProjectData} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceManager chantierId={id!} factures={factures} onUpdate={loadProjectData} />
        </TabsContent>

        <TabsContent value="team">
          <TeamAssignment 
            chantierId={id!} 
            membres={membres} 
            onUpdate={loadProjectData}
            coutJournalier={calculations.cout_journalier_equipe}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesManager chantierId={id!} frais={frais} onUpdate={loadProjectData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
