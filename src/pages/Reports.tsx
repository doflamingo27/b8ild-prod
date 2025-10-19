import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCalculations } from "@/hooks/useCalculations";
import ExportManager from "@/components/ExportManager";

const Reports = () => {
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChantiers();
  }, []);

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

      const { data } = await supabase
        .from("chantiers")
        .select(`
          *,
          devis (montant_ht, montant_ttc, tva),
          factures_fournisseurs (*),
          equipe_chantier (
            membre_id,
            membres_equipe (*)
          ),
          frais_chantier (*)
        `)
        .eq("entreprise_id", entreprise.id)
        .order("created_at", { ascending: false });

      setChantiers(data || []);
    } catch (error) {
      console.error("Error loading chantiers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
          <FileText className="h-9 w-9 text-primary" />
          Rapports
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Consultez et exportez vos rapports de chantiers
        </p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <Card className="card-premium">
            <CardContent className="pt-16 pb-16 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground font-medium">Chargement des rapports...</p>
            </CardContent>
          </Card>
        ) : chantiers.length === 0 ? (
          <Card className="card-premium">
            <CardContent className="pt-16 pb-16 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-muted-foreground mb-2">
                Aucun rapport disponible
              </p>
              <p className="text-muted-foreground">
                Créez un chantier pour générer des rapports
              </p>
            </CardContent>
          </Card>
        ) : (
          chantiers.map((chantier) => {
            const membres = chantier.equipe_chantier?.map((ec: any) => ec.membres_equipe) || [];
            const devis = chantier.devis?.[0];
            const factures = chantier.factures_fournisseurs || [];
            const frais = chantier.frais_chantier || [];

            const coutsFixes = factures.reduce((sum: number, f: any) => sum + (f.montant_ht || 0), 0) +
                               frais.reduce((sum: number, f: any) => sum + (f.montant_total || 0), 0);

            // Calculs manuels sans hook
            const budget_devis = devis?.montant_ht || 0;
            const cout_journalier_equipe = membres.reduce((total: number, membre: any) => {
              const cout_horaire_reel = membre.taux_horaire * (1 + membre.charges_salariales / 100 + membre.charges_patronales / 100);
              return total + (cout_horaire_reel * 8);
            }, 0);
            const budget_disponible = budget_devis - coutsFixes;
            const rentabilite_pct = budget_devis > 0 ? (budget_disponible / budget_devis) * 100 : 0;
            const jour_critique = cout_journalier_equipe > 0 ? budget_disponible / cout_journalier_equipe : Infinity;
            const jours_effectifs = chantier.date_debut 
              ? Math.max(0, Math.floor((new Date().getTime() - new Date(chantier.date_debut).getTime()) / (1000 * 60 * 60 * 24)))
              : 0;
            const jours_restants_avant_deficit = Math.max(0, Math.floor(jour_critique - jours_effectifs));
            
            let statut: "success" | "warning" | "alert" | "danger";
            if (rentabilite_pct >= 20) statut = "success";
            else if (rentabilite_pct >= 10) statut = "warning";
            else if (rentabilite_pct > 0) statut = "alert";
            else statut = "danger";

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
                        cout_journalier_equipe,
                        budget_disponible,
                        jour_critique,
                        rentabilite_pct,
                        jours_restants_avant_deficit,
                        statut,
                        calculerCoutHoraireReel: (membre: any) => {
                          return membre.taux_horaire * (1 + membre.charges_salariales / 100 + membre.charges_patronales / 100);
                        },
                        calculerCoutJournalierMembre: (membre: any) => {
                          const cout_horaire_reel = membre.taux_horaire * (1 + membre.charges_salariales / 100 + membre.charges_patronales / 100);
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
                      <p className="text-2xl font-black font-mono text-gradient-primary">{(devis?.montant_ht || 0).toFixed(2)} €</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rentabilité</p>
                      <p className={`text-2xl font-black font-mono ${
                        rentabilite_pct >= 20 ? "text-success" :
                        rentabilite_pct >= 10 ? "text-warning" :
                        rentabilite_pct > 0 ? "text-alert" :
                        "text-danger"
                      }`}>
                        {rentabilite_pct.toFixed(1)} %
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Jour critique</p>
                      <p className="text-2xl font-black font-mono">{jour_critique.toFixed(1)} j</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Statut</p>
                      <Badge 
                        variant={
                          statut === "success" ? "default" :
                          statut === "warning" ? "secondary" :
                          statut === "alert" ? "outline" :
                          "destructive"
                        }
                        className="text-sm font-bold px-3 py-1"
                      >
                        {statut === "success" ? "Excellent" :
                         statut === "warning" ? "Bon" :
                         statut === "alert" ? "Attention" :
                         "Critique"}
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
