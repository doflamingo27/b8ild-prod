import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface QuoteManagerProps {
  chantierId: string;
  devis: any;
  onUpdate: () => void;
}

const QuoteManager = ({ chantierId, devis, onUpdate }: QuoteManagerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    montant_ht: devis?.montant_ht || 0,
    tva: devis?.tva || 20,
    montant_ttc: devis?.montant_ttc || 0,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setExtracting(true);

    try {
      // Upload temporaire pour OCR avec signed URL
      const fileExt = selectedFile.name.split('.').pop();
      const tempFileName = `temp-${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('devis')
        .upload(tempFileName, selectedFile);

      if (uploadError) throw uploadError;

      // Créer une signed URL valide 60 secondes
      const { data: signedData, error: signedError } = await supabase.storage
        .from('devis')
        .createSignedUrl(uploadData.path, 60);

      if (signedError) throw signedError;

      // Appel à l'edge function d'extraction avec signed URL
      const { data: extractedData, error: extractError } = await supabase.functions
        .invoke('extract-document-data', {
          body: { fileUrl: signedData.signedUrl, documentType: 'quote' }
        });

      if (extractError) {
        console.error('Erreur Edge Function:', extractError);
        throw new Error(`Extraction failed: ${extractError.message || 'Unknown error'}`);
      }

      if (!extractedData) {
        throw new Error('Aucune donnée extraite du document');
      }

      // Pré-remplir le formulaire avec les données extraites
      if (extractedData) {
        setFormData({
          montant_ht: extractedData.montant_ht || 0,
          tva: extractedData.tva || 20,
          montant_ttc: extractedData.montant_ttc || 0,
        });
        toast({
          title: "Extraction réussie",
          description: "Les données ont été extraites automatiquement",
        });
      }

      // Supprimer le fichier temporaire
      await supabase.storage.from('devis').remove([tempFileName]);
    } catch (error) {
      console.error('Erreur extraction OCR:', error);
      toast({
        title: "Extraction impossible",
        description: "Veuillez remplir manuellement les informations",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

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
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{devis ? "Modifier" : "Ajouter"} un devis</DialogTitle>
                  <DialogDescription>
                    Uploadez votre devis et saisissez les montants
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Fichier (PDF, Image)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      disabled={loading || extracting}
                    />
                    {extracting && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ✨ Extraction automatique en cours...
                      </p>
                    )}
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
