import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AutoExtractUploader from "@/components/AutoExtractUploader";
import { useQuery } from "@tanstack/react-query";

interface QuoteManagerProps {
  chantierId: string;
  devis: any;
  onUpdate: () => void;
}

const QuoteManager = ({ chantierId, devis, onUpdate }: QuoteManagerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    montant_ht: devis?.montant_ht || 0,
    tva: devis?.tva || 20,
    montant_ttc: devis?.montant_ttc || 0,
  });

  // Récupérer entrepriseId pour AutoExtractUploader
  const { data: entreprise } = useQuery({
    queryKey: ['entreprise'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      
      const { data } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user.id)
        .single();
      
      return data;
    }
  });


  const calculateTTC = (ht: number, tva: number) => {
    return ht * (1 + tva / 100);
  };

  const handleHTChange = (value: string) => {
    const ht = parseFloat(value) || 0;
    const ttc = calculateTTC(ht, formData.tva);
    setFormData({ ...formData, montant_ht: ht, montant_ttc: ttc });
  };

  const handleTVAChange = (value: string) => {
    const tva = parseFloat(value) || 0;
    const ttc = calculateTTC(formData.montant_ht, tva);
    setFormData({ ...formData, tva, montant_ttc: ttc });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fichier_url = devis?.fichier_url;

      // Upload du fichier si présent
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${chantierId}-devis-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('devis')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('devis')
          .getPublicUrl(fileName);
        
        fichier_url = publicUrl;
      }

      // Créer ou mettre à jour le devis
      const devisData = {
        ...formData,
        chantier_id: chantierId,
        fichier_url,
      };

      if (devis) {
        const { error } = await supabase
          .from("devis")
          .update(devisData)
          .eq("id", devis.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("devis")
          .insert(devisData);
        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "Le devis a été enregistré avec succès",
      });

      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Devis</CardTitle>
            <CardDescription>
              Gestion du devis du chantier
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                {devis ? "Modifier" : <><Plus className="mr-2 h-4 w-4" />Ajouter</>}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{devis ? "Modifier" : "Ajouter"} un devis</DialogTitle>
                <DialogDescription>
                  Uploadez votre devis pour extraction automatique (OCR.space)
                </DialogDescription>
              </DialogHeader>

              {entreprise?.id && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm font-semibold mb-3">Option 1 : Upload automatique (recommandé)</p>
                  <AutoExtractUploader 
                    module="factures"
                    entrepriseId={entreprise.id}
                    chantierId={chantierId}
                    onSaved={async (factureId) => {
                      // Récupérer la facture créée
                      const { data: facture } = await supabase
                        .from('factures_fournisseurs')
                        .select('*')
                        .eq('id', factureId)
                        .single();
                      
                      if (facture) {
                        // Créer/Mettre à jour le devis à partir de la facture
                        const devisData = {
                          chantier_id: chantierId,
                          montant_ht: facture.montant_ht || 0,
                          tva: facture.tva_pct || 20,
                          montant_ttc: facture.montant_ttc || 0,
                        };
                        
                        if (devis?.id) {
                          await supabase
                            .from('devis')
                            .update(devisData)
                            .eq('id', devis.id);
                        } else {
                          await supabase
                            .from('devis')
                            .insert(devisData);
                        }
                        
                        // Supprimer la facture temporaire
                        await supabase
                          .from('factures_fournisseurs')
                          .delete()
                          .eq('id', factureId);
                        
                        toast({
                          title: "✅ Devis enregistré",
                          description: "L'extraction OCR a réussi",
                        });
                        setOpen(false);
                        onUpdate();
                      }
                    }}
                  />
                </div>
              )}
              
              <div className="text-center text-sm text-muted-foreground my-4">
                — ou —
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Option 2 : Saisie manuelle</p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="file">Fichier (optionnel)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={loading}
                    />
                  </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="montant_ht">Montant HT (€)</Label>
                        <Input
                          id="montant_ht"
                          type="number"
                          step="0.01"
                          value={formData.montant_ht}
                          onChange={(e) => handleHTChange(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tva">TVA (%)</Label>
                        <Input
                          id="tva"
                          type="number"
                          step="0.01"
                          value={formData.tva}
                          onChange={(e) => handleTVAChange(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="montant_ttc">Montant TTC (€)</Label>
                      <Input
                        id="montant_ttc"
                        type="number"
                        step="0.01"
                        value={formData.montant_ttc}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enregistrer
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {devis ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Montant HT</p>
                <p className="text-xl font-bold">{devis.montant_ht.toLocaleString()} €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TVA</p>
                <p className="text-xl font-bold">{devis.tva}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant TTC</p>
                <p className="text-xl font-bold">{devis.montant_ttc.toLocaleString()} €</p>
              </div>
            </div>

            {devis.fichier_url && (
              <Button variant="outline" asChild>
                <a href={devis.fichier_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Voir le fichier
                </a>
              </Button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucun devis enregistré. Cliquez sur "Ajouter" pour commencer.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteManager;
