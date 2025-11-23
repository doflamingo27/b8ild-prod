import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useChantiersRealtime } from "@/hooks/useChantiersRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrendingUp, DollarSign, TrendingDown, Percent, Search, MapPin, AlertCircle, ChevronDown } from "lucide-react";
import { getRentabilityBadge } from "@/lib/rentabilityBadge";

interface ChantierMetrics {
  id: string;
  nom_chantier: string;
  client: string;
  adresse: string;
  etat_chantier: string;
  budget_ht: number;
  metrics?: {
    couts_fixes_engages: number;
    cout_main_oeuvre_reel: number;
    marge_a_date: number;
    profitability_pct: number;
    marge_finale_pct: number;
  };
}

const Rentabilite = () => {
  const { user } = useAuth();
  const [chantiers, setChantiers] = useState<ChantierMetrics[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>('en_cours');
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEntreprise();
    }
  }, [user]);

  useEffect(() => {
    if (entrepriseId) {
      loadChantiers();
    }
  }, [entrepriseId]);

  // Setup Realtime subscriptions
  const handleRealtimeChange = useCallback(() => {
    loadChantiers();
  }, []);

  useChantiersRealtime(entrepriseId, handleRealtimeChange);

  const loadEntreprise = async () => {
    try {
      const { data, error } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user?.id)
        .single();

      if (error) throw error;
      setEntrepriseId(data.id);
    } catch (error: any) {
      console.error("Erreur chargement entreprise:", error);
    }
  };

  const loadChantiers = async () => {
    try {
      const { data, error } = await supabase
        .from("chantiers")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .order("date_creation", { ascending: false });

      if (error) throw error;

      // Charger les métriques pour chaque chantier
      const chantiersWithMetrics = await Promise.all(
        (data || []).map(async (chantier) => {
          const { data: metricsData } = await supabase
            .from("chantier_metrics_realtime")
            .select("metrics")
            .eq("chantier_id", chantier.id)
            .single();

          return {
            id: chantier.id,
            nom_chantier: chantier.nom_chantier,
            client: chantier.client,
            adresse: chantier.adresse,
            etat_chantier: chantier.etat_chantier,
            budget_ht: chantier.budget_ht,
            metrics: metricsData?.metrics as any,
          } as ChantierMetrics;
        })
      );

      setChantiers(chantiersWithMetrics);
    } catch (error: any) {
      console.error("Erreur chargement chantiers:", error);
    }
  };

  const etatConfig: Record<string, { label: string; color: string; icon: string }> = {
    'brouillon': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: '📝' },
    'projection': { label: 'Projection', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: '🔮' },
    'attente_signature': { label: 'En attente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300', icon: '✍️' },
    'en_cours': { label: 'En cours', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: '🚧' },
    'suspendu': { label: 'Suspendu', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', icon: '⏸️' },
    'termine': { label: 'Terminé', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300', icon: '✅' },
    'annule': { label: 'Annulé', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: '❌' },
  };

  // Filtrer les chantiers
  const filteredChantiers = chantiers.filter(chantier => {
    const matchesSearch = 
      chantier.nom_chantier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chantier.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (chantier.adresse || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      chantier.etat_chantier === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Calcul des KPIs globaux sur TOUS les chantiers
  const revenusTotaux = chantiers.reduce((sum, c) => sum + (c.budget_ht || 0), 0);
  const coutsTotaux = chantiers.reduce((sum, c) => {
    const couts = (c.metrics?.couts_fixes_engages || 0) + (c.metrics?.cout_main_oeuvre_reel || 0);
    return sum + couts;
  }, 0);
  const margeGlobale = revenusTotaux - coutsTotaux;
  const tauxMargeMoyen = chantiers.length > 0 
    ? chantiers.reduce((sum, c) => sum + (c.metrics?.marge_finale_pct || 0), 0) / chantiers.length 
    : 0;

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
          <TrendingUp className="h-9 w-9 text-primary" aria-hidden="true" />
          Rentabilité des Chantiers
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Vue d'ensemble de la rentabilité de tous vos chantiers
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Revenus Totaux
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{revenusTotaux.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              {chantiers.length} chantier(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Coûts Totaux
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-600">{coutsTotaux.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              Coûts réels engagés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Marge Globale
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{margeGlobale.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taux: {revenusTotaux > 0 ? ((margeGlobale / revenusTotaux) * 100).toFixed(2) : 0.00}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Taux de Marge Moyen
            </CardTitle>
            <Percent className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{tauxMargeMoyen.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sur {chantiers.length} chantier(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Rechercher un chantier..."
            className="pl-12 h-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un chantier"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[200px] font-semibold h-12 justify-between">
              {etatConfig[filterStatus]?.icon} {etatConfig[filterStatus]?.label || 'Tous'}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] bg-background border-border">
            <DropdownMenuItem onClick={() => setFilterStatus('all')} className="font-semibold cursor-pointer">
              Tous
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('brouillon')} className="font-semibold cursor-pointer">
              📝 Brouillon
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('projection')} className="font-semibold cursor-pointer">
              🔮 Projection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('attente_signature')} className="font-semibold cursor-pointer">
              ✍️ En attente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('en_cours')} className="font-semibold cursor-pointer">
              🚧 En cours
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('suspendu')} className="font-semibold cursor-pointer">
              ⏸️ Suspendu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('termine')} className="font-semibold cursor-pointer">
              ✅ Terminé
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus('annule')} className="font-semibold cursor-pointer">
              ❌ Annulé
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Liste des chantiers */}
      <div className="space-y-4">
        {filteredChantiers.length === 0 ? (
          <Card className="card-premium">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">Aucun chantier trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filteredChantiers.map((chantier) => {
            const etat = etatConfig[chantier.etat_chantier] || etatConfig['brouillon'];
            const hasMetrics = chantier.metrics && chantier.budget_ht > 0;
            const rentabilityBadge = getRentabilityBadge(chantier.metrics?.marge_finale_pct || 0);

            return (
              <Card key={chantier.id} className="card-premium hover-lift cursor-pointer transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${etat.color} font-semibold px-3 py-1`}>
                          {etat.icon} {etat.label}
                        </Badge>
                        <h3 className="text-xl font-black">{chantier.nom_chantier}</h3>
                        {hasMetrics && (
                          <Badge className={`font-bold px-3 py-1 border-2 ${rentabilityBadge.bgColor} ${rentabilityBadge.color}`}>
                            {rentabilityBadge.emoji} {rentabilityBadge.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{chantier.adresse || 'Aucune adresse'}</span>
                      </div>
                    </div>

                    {hasMetrics ? (
                      <div className="flex gap-10 items-center">
                        <div className="text-right min-w-[120px]">
                          <p className="text-xs text-muted-foreground uppercase mb-1">Revenus</p>
                          <p className="text-xl font-black text-green-600">
                            {chantier.budget_ht.toFixed(2)} €
                          </p>
                        </div>
                        <div className="text-right min-w-[120px]">
                          <p className="text-xs text-muted-foreground uppercase mb-1">Coûts</p>
                          <p className="text-xl font-black text-orange-600">
                            {((chantier.metrics?.couts_fixes_engages || 0) + (chantier.metrics?.cout_main_oeuvre_reel || 0)).toFixed(2)} €
                          </p>
                        </div>
                        <div className="text-right min-w-[120px]">
                          <p className="text-xs text-muted-foreground uppercase mb-1">Marge</p>
                          <p className="text-xl font-black text-emerald-600">
                            {(chantier.metrics?.marge_a_date || 0).toFixed(2)} €
                          </p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-xs text-muted-foreground uppercase mb-1">Taux</p>
                          <p className={`text-2xl font-black ${
                            (chantier.metrics?.marge_finale_pct || 0) >= 10 
                              ? 'text-green-600' 
                              : (chantier.metrics?.marge_finale_pct || 0) >= 0 
                              ? 'text-amber-600' 
                              : 'text-red-600'
                          }`}>
                            {(chantier.metrics?.marge_finale_pct || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Aucune donnée financière</span>
                      </div>
                    )}
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

export default Rentabilite;
