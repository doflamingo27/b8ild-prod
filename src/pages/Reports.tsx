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

            const calculations = useCalculations({
              membres,
              budget_devis: devis?.montant_ht || 0,
              couts_fixes: coutsFixes,
              jours_effectifs: chantier.duree_estimee || 0,
            });

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
                      calculations={calculations}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Budget</p>
                      <p className="text-2xl font-black font-mono text-primary">{(devis?.montant_ht || 0).toFixed(2)} €</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rentabilité</p>
                      <p className={`text-2xl font-black font-mono ${
                        calculations.rentabilite_pct >= 20 ? "text-success" :
                        calculations.rentabilite_pct >= 10 ? "text-warning" :
                        calculations.rentabilite_pct > 0 ? "text-alert" :
                        "text-danger"
                      }`}>
                        {calculations.rentabilite_pct.toFixed(1)} %
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Jour critique</p>
                      <p className="text-2xl font-black font-mono">{calculations.jour_critique.toFixed(1)} j</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Statut</p>
                      <Badge 
                        variant={
                          calculations.statut === "success" ? "default" :
                          calculations.statut === "warning" ? "secondary" :
                          calculations.statut === "alert" ? "outline" :
                          "destructive"
                        }
                        className="text-sm font-bold px-3 py-1"
                      >
                        {calculations.statut === "success" ? "Excellent" :
                         calculations.statut === "warning" ? "Bon" :
                         calculations.statut === "alert" ? "Attention" :
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
