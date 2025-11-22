import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, TrendingUp, FileCheck, Search, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useChantiersRealtime } from "@/hooks/useChantiersRealtime";
import ExportManager from "@/components/ExportManager";
import EmptyState from "@/components/EmptyState";
import { labels, emptyStates } from "@/lib/content";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getRentabilityBadge } from "@/lib/rentabilityBadge";

const Reports = () => {
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadChantiers();
  }, []);

  // Setup Realtime subscriptions
  const handleRealtimeChange = useCallback(() => {
    loadChantiers();
  }, []);

  useChantiersRealtime(entrepriseId, handleRealtimeChange);

  const loadChantiers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entreprise } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user.id)
        .single();

      if (!entreprise) return;

      setEntrepriseId(entreprise.id);

      // Charger les chantiers avec métriques temps réel au lieu de calculs manuels
      const { data } = await supabase
        .from("chantiers")
        .select(`
          *,
          chantier_metrics_realtime (metrics),
          devis (montant_ht, montant_ttc, tva, actif),
          factures_fournisseurs (*),
          equipe_chantier (
            membre_id,
            membres_equipe (*)
          ),
          frais_chantier (*)
        `)
        .eq("entreprise_id", entreprise.id)
        .order("created_at", { ascending: false });

      // Map les métriques temps réel (relation 1-1, pas un tableau)
      const chantiersWithMetrics = (data || []).map(chantier => ({
        ...chantier,
        metrics: (chantier as any).chantier_metrics_realtime?.metrics as any,
      }));

      setChantiers(chantiersWithMetrics);
    } catch (error) {
      console.error("Error loading chantiers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les chantiers par recherche
  const filteredChantiers = chantiers.filter(chantier => 
    chantier.nom_chantier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chantier.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chantier.adresse || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculer les KPIs
  const chantiersActifs = chantiers.filter(c => 
    c.etat_chantier === 'en_cours' || c.etat_chantier === 'projection'
  ).length;
  const totalChantiers = chantiers.length;
  const rapportsDisponibles = chantiers.filter(c => c.budget_ht > 0).length;

  const handleExportAll = () => {
    toast({
      title: "Export en cours",
      description: "Préparation de l'export de tous les rapports...",
    });
    // L'export individuel est géré par ExportManager dans chaque carte
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
          <FileText className="h-9 w-9 text-primary" aria-hidden="true" />
          Rapports de Chantiers
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Analyse détaillée et simulation de rentabilité par chantier
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Chantiers Actifs
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{chantiersActifs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En cours d'exécution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Total Chantiers
            </CardTitle>
            <FileText className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{totalChantiers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tous statuts confondus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Rapports Disponibles
            </CardTitle>
            <FileCheck className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{rapportsDisponibles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Analyses complètes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Rechercher un chantier..."
          className="pl-12 h-12 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Rechercher un chantier"
        />
      </div>

      <div className="grid gap-6">
        {loading ? (
          <Card className="card-premium">
            <CardContent className="pt-16 pb-16 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" aria-hidden="true" />
              <p className="text-muted-foreground font-medium">Chargement des rapports...</p>
            </CardContent>
          </Card>
        ) : filteredChantiers.length === 0 ? (
          <Card className="card-premium">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">Aucun chantier trouvé</p>
              <p className="text-sm text-muted-foreground mt-2">Essayez avec d'autres mots-clés</p>
            </CardContent>
          </Card>
        ) : (
          filteredChantiers.map((chantier) => {
            const membres = chantier.equipe_chantier?.map((ec: any) => ec.membres_equipe) || [];
            const devis = chantier.devis?.find((d: any) => d.actif) || chantier.devis?.[0];
            const factures = chantier.factures_fournisseurs || [];
            const frais = chantier.frais_chantier || [];
            const metrics = chantier.metrics;

            // Utiliser les métriques temps réel au lieu de calculs manuels
            const budget_devis = metrics?.budget_ht || 0;
            const cout_journalier_equipe = metrics?.cout_journalier_equipe || 0;
            const budget_disponible = metrics?.budget_disponible || 0;
            const rentabilite_pct = metrics?.profitability_pct || 0;
            const jour_critique = metrics?.jour_critique || 0;
            const jours_restants_avant_deficit = metrics?.jours_restants_rentables || 0;
            
            const rentabilityBadge = getRentabilityBadge(rentabilite_pct);
            
            let statut: "success" | "warning" | "alert" | "danger";
            if (rentabilite_pct >= 20) statut = "success";
            else if (rentabilite_pct >= 10) statut = "warning";
            else if (rentabilite_pct > 0) statut = "alert";
            else statut = "danger";

            // Calcul des coûts pour compatibilité avec ExportManager
            const coutsFixes = (metrics?.couts_fixes_engages || 0);
            const cout_main_oeuvre = (metrics?.cout_main_oeuvre_reel || 0);

            return (
              <Card key={chantier.id} className="card-premium hover-lift">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="text-2xl font-black">{chantier.nom_chantier}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Client: {chantier.client}
                      </CardDescription>
                    </div>
                    <ExportManager
                      chantierId={chantier.id}
                      chantierData={chantier}
                      membres={membres}
                      devis={devis}
                      factures={factures}
                      frais={frais}
                      calculations={{
                        cout_journalier_equipe: cout_journalier_equipe || 0,
                        budget_disponible: budget_disponible || 0,
                        jour_critique: jour_critique || 0,
                        rentabilite_pct: rentabilite_pct || 0,
                        jours_restants_avant_deficit: jours_restants_avant_deficit || 0,
                        statut,
                        calculerCoutHoraireReel: (membre: any) => {
                          if (!membre || !membre.taux_horaire) return 0;
                          const charges_sal = membre.charges_salariales_pct ?? (membre.charges_salariales ?? 0);
                          const charges_pat = membre.charges_patronales_pct ?? (membre.charges_patronales ?? 0);
                          return membre.taux_horaire * (1 + charges_sal / 100 + charges_pat / 100);
                        },
                        calculerCoutJournalierMembre: (membre: any) => {
                          if (!membre || !membre.taux_horaire) return 0;
                          const charges_sal = membre.charges_salariales_pct ?? (membre.charges_salariales ?? 0);
                          const charges_pat = membre.charges_patronales_pct ?? (membre.charges_patronales ?? 0);
                          const cout_horaire_reel = membre.taux_horaire * (1 + charges_sal / 100 + charges_pat / 100);
                          return cout_horaire_reel * 8;
                        },
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Budget</p>
                      <p className="text-2xl font-black font-mono text-gradient-primary">{budget_devis.toFixed(2)} €</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rentabilité</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-2xl font-black font-mono ${
                          rentabilite_pct >= 20 ? "text-success" :
                          rentabilite_pct >= 10 ? "text-warning" :
                          rentabilite_pct > 0 ? "text-alert" :
                          "text-danger"
                        }`}>
                          {rentabilite_pct.toFixed(1)} %
                        </p>
                        <Badge className={`${rentabilityBadge.bgColor} ${rentabilityBadge.color} border text-xs`}>
                          {rentabilityBadge.emoji}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Jour critique</p>
                      <p className="text-2xl font-black font-mono">{jour_critique > 0 ? jour_critique.toFixed(1) : '-'} j</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Statut</p>
                      <Badge className={`${rentabilityBadge.bgColor} ${rentabilityBadge.color} border text-sm font-bold px-3 py-1`}>
                        {rentabilityBadge.emoji} {rentabilityBadge.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Reports;
