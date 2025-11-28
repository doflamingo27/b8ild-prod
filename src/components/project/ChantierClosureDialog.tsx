import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CheckCircle2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ChantierBilan from "./ChantierBilan";

interface ChantierClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string;
  chantierData: any;
  metrics: any;
  membres: any[];
  devis: any[];
  factures: any[];
  frais: any[];
  onClosed: () => void;
}

const ChantierClosureDialog = ({
  open,
  onOpenChange,
  chantierId,
  chantierData,
  metrics,
  membres,
  devis,
  factures,
  frais,
  onClosed,
}: ChantierClosureDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'confirm' | 'bilan'>('confirm');
  const [dateFinReelle, setDateFinReelle] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("chantiers")
        .update({
          etat_chantier: 'termine',
          date_fin_reelle: dateFinReelle,
        })
        .eq("id", chantierId);

      if (error) throw error;

      toast({
        title: "✅ Chantier terminé",
        description: "Le chantier a été marqué comme terminé avec succès.",
      });

      // Passer à l'affichage du bilan (ne pas fermer le dialog)
      setStep('bilan');
    } catch (error: any) {
      console.error("Erreur clôture chantier:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    const wasOnBilan = step === 'bilan'; // Sauvegarder l'état AVANT de le modifier
    setStep('confirm');
    onOpenChange(false);
    if (wasOnBilan) {
      onClosed(); // Notifier le parent seulement si on ferme après avoir vu le bilan
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Terminer le chantier
              </DialogTitle>
              <DialogDescription>
                Vous êtes sur le point de marquer ce chantier comme terminé. Cette action mettra à jour l'état du projet et générera un bilan complet.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date-fin-reelle" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date de fin réelle
                </Label>
                <Input
                  id="date-fin-reelle"
                  type="date"
                  value={dateFinReelle}
                  onChange={(e) => setDateFinReelle(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Renseignez la date effective de fin du chantier (par défaut: aujourd'hui)
                </p>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h4 className="font-semibold mb-2">📊 Résumé du chantier</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom:</span> <strong>{chantierData.nom_chantier}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Client:</span> <strong>{chantierData.client}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Durée estimée:</span> <strong>{chantierData.duree_estimee_jours || chantierData.duree_estimee} jours</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Budget:</span> <strong>{(metrics?.budget_ht || 0).toLocaleString()} € HT</strong>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleDialogClose}>
                Annuler
              </Button>
              <Button 
                onClick={handleClose} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Traitement..." : "✅ Terminer le chantier"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-primary" />
                Bilan de clôture
              </DialogTitle>
              <DialogDescription>
                Voici le bilan complet du chantier terminé
              </DialogDescription>
            </DialogHeader>

            <ChantierBilan
              chantierData={chantierData}
              metrics={metrics}
              membres={membres}
              devis={devis}
              factures={factures}
              frais={frais}
              dateFinReelle={dateFinReelle}
            />

            <DialogFooter>
              <Button onClick={handleDialogClose}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChantierClosureDialog;
