import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChantierMetrics } from "@/hooks/useChantierMetrics";
import ProfitabilityView from "@/components/project/ProfitabilityView";
import QuoteManager from "@/components/project/QuoteManager";
import TeamAssignment from "@/components/project/TeamAssignment";
import InvoiceManager from "@/components/project/InvoiceManager";
import ExpensesManager from "@/components/project/ExpensesManager";
import { useCalculations } from "@/hooks/useCalculations";

interface Chantier {
  id: string;
  nom_chantier: string;
  client: string;
}

const FinancialManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [selectedChantierId, setSelectedChantierId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [devis, setDevis] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [frais, setFrais] = useState<any[]>([]);

  const { metrics, loading: metricsLoading } = useChantierMetrics(selectedChantierId || '');

  useEffect(() => {
    if (user) {
      loadChantiers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChantierId) {
      loadChantierData();
    }
  }, [selectedChantierId]);

  // ✨ Subscription Realtime pour toutes les données du chantier
  const handleRealtimeChange = useCallback(() => {
    if (selectedChantierId) {
      console.log('[FinancialManagement] Changement détecté, rechargement...');
      loadChantierData();
    }
  }, [selectedChantierId]);

  useEffect(() => {
    if (!selectedChantierId) return;

    const channel = supabase
      .channel(`financial_management:${selectedChantierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chantier_metrics_realtime',
          filter: `chantier_id=eq.${selectedChantierId}`,
        },
        handleRealtimeChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devis',
          filter: `chantier_id=eq.${selectedChantierId}`,
        },
        handleRealtimeChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'affectations_chantiers',
          filter: `chantier_id=eq.${selectedChantierId}`,
        },
        handleRealtimeChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'factures_fournisseurs',
          filter: `chantier_id=eq.${selectedChantierId}`,
        },
        handleRealtimeChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frais_chantier',
          filter: `chantier_id=eq.${selectedChantierId}`,
        },
        handleRealtimeChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChantierId, handleRealtimeChange]);

  const loadChantiers = async () => {
    try {
      setLoading(true);
      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user?.id)
        .single();

      if (!entreprise) return;

      const { data: chantiersData } = await supabase
        .from('chantiers')
        .select('id, nom_chantier, client')
        .eq('entreprise_id', entreprise.id)
        .order('created_at', { ascending: false });

      if (chantiersData && chantiersData.length > 0) {
        setChantiers(chantiersData);
        setSelectedChantierId(chantiersData[0].id);
      }
    } catch (error) {
      console.error("Erreur chargement chantiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChantierData = async () => {
    try {
      console.log('[FinancialManagement] Chargement données pour chantier:', selectedChantierId);
      
      // Charger tous les devis du chantier
      const { data: devisData } = await supabase
        .from("devis")
        .select("*")
        .eq("chantier_id", selectedChantierId)
        .order("created_at", { ascending: false });
      
      console.log('[FinancialManagement] Devis chargés:', devisData);
      setDevis(devisData || []);

      // Charger les factures
      const { data: facturesData } = await supabase
        .from("factures_fournisseurs")
        .select("*")
        .eq("chantier_id", selectedChantierId);
      setFactures(facturesData || []);

      // Charger les membres depuis affectations_chantiers
      const { data: affectationsData } = await supabase
        .from("affectations_chantiers")
        .select(`
          *,
          membres_equipe:membre_equipe_id (*)
        `)
        .eq("chantier_id", selectedChantierId);
      
      console.log('[FinancialManagement] Affectations chargées:', affectationsData);
      const membresAffectes = affectationsData?.map(a => ({
        ...a.membres_equipe,
        jours_travailles: a.jours_travailles || 0,
        affectation: {
          date_debut: a.date_debut,
          date_fin: a.date_fin,
          heures_par_jour: a.heures_par_jour,
          taux_horaire_specifique: a.taux_horaire_specifique
        }
      })) || [];
      setMembres(membresAffectes);

      // Charger les frais
      const { data: fraisData } = await supabase
        .from("frais_chantier")
        .select("*")
        .eq("chantier_id", selectedChantierId);
      setFrais(fraisData || []);
    } catch (error) {
      console.error("Erreur chargement données chantier:", error);
    }
  };

  const totalFactures = factures.reduce((sum, f) => sum + Number(f.montant_ht), 0);
  const totalFrais = frais.reduce((sum, f) => sum + Number(f.montant_total), 0);
  const coutsFixes = totalFactures + totalFrais;

  const devisActif = devis.find(d => d.actif);
  const calculations = useCalculations({
    membres,
    budget_devis: devisActif?.montant_ttc || 0,
    couts_fixes: coutsFixes,
    date_debut: null,
  });

  const selectedChantier = chantiers.find(c => c.id === selectedChantierId);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-up">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
            <Building className="h-9 w-9 text-primary" />
            Gestion financière
          </h1>
        </div>
        <Card className="card-premium">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg font-medium">Chargement des données...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (chantiers.length === 0) {
    return (
      <div className="space-y-8 animate-fade-up">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
            <Building className="h-9 w-9 text-primary" />
            Gestion financière
          </h1>
        </div>
        <Card className="card-premium">
          <CardContent className="pt-16 pb-16 text-center">
            <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-muted-foreground mb-2">
              Aucun chantier disponible
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier chantier pour commencer le suivi financier
            </p>
            <Button onClick={() => navigate("/projects")}>
              Aller aux chantiers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="space-y-6">
        <Button onClick={() => navigate("/projects")} variant="ghost" className="hover-lift group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Retour aux chantiers
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
              <Building className="h-9 w-9 text-primary" />
              Gestion financière
            </h1>
            {selectedChantier && (
              <div className="mt-3 space-y-1">
                <p className="text-xl font-semibold text-foreground">
                  {selectedChantier.nom_chantier}
                </p>
                <p className="text-muted-foreground">
                  Client : {selectedChantier.client}
                </p>
              </div>
            )}
          </div>
          <Card className="lg:w-96 shadow-lg">
            <CardContent className="pt-6">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Chantier sélectionné
              </label>
              <Select value={selectedChantierId} onValueChange={setSelectedChantierId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sélectionner un chantier" />
                </SelectTrigger>
                <SelectContent>
                  {chantiers.map((chantier) => (
                    <SelectItem key={chantier.id} value={chantier.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{chantier.nom_chantier}</span>
                        <span className="text-xs text-muted-foreground">{chantier.client}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs avec 5 sous-onglets */}
      <Card className="card-premium shadow-xl">
        <Tabs defaultValue="profitability" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto bg-muted/30 p-1.5 gap-1">
            <TabsTrigger 
              value="profitability" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all py-3 font-semibold"
            >
              <span className="hidden sm:inline">📊 Rentabilité</span>
              <span className="sm:hidden">📊</span>
            </TabsTrigger>
            <TabsTrigger 
              value="quote" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all py-3 font-semibold"
            >
              <span className="hidden sm:inline">📄 Devis</span>
              <span className="sm:hidden">📄</span>
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all py-3 font-semibold"
            >
              <span className="hidden sm:inline">👥 Équipe</span>
              <span className="sm:hidden">👥</span>
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all py-3 font-semibold"
            >
              <span className="hidden sm:inline">💳 Factures</span>
              <span className="sm:hidden">💳</span>
            </TabsTrigger>
            <TabsTrigger 
              value="expenses" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all py-3 font-semibold"
            >
              <span className="hidden sm:inline">📦 Coûts annexes</span>
              <span className="sm:hidden">📦</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="mt-6 p-6">
            <ProfitabilityView 
              metrics={metrics} 
              loading={metricsLoading} 
              chantierId={selectedChantierId} 
            />
          </TabsContent>

          <TabsContent value="quote" className="mt-6 p-6">
            <QuoteManager 
              chantierId={selectedChantierId} 
              devis={devis} 
              onUpdate={loadChantierData} 
            />
          </TabsContent>

          <TabsContent value="team" className="mt-6 p-6">
            <TeamAssignment 
              chantierId={selectedChantierId} 
              membres={membres} 
              onUpdate={loadChantierData}
              coutJournalier={calculations.cout_journalier_equipe}
            />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6 p-6">
            <InvoiceManager 
              chantierId={selectedChantierId} 
              factures={factures} 
              onUpdate={loadChantierData} 
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6 p-6">
            <ExpensesManager 
              chantierId={selectedChantierId} 
              frais={frais} 
              onUpdate={loadChantierData} 
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default FinancialManagement;

