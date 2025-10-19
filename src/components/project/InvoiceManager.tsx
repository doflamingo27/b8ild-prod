import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface InvoiceManagerProps {
  chantierId: string;
  factures: any[];
  onUpdate: () => void;
}

const InvoiceManager = ({ chantierId, factures, onUpdate }: InvoiceManagerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    fournisseur: "",
    montant_ht: 0,
    categorie: "Matériaux",
    date_facture: new Date().toISOString().split('T')[0],
  });

  const categories = [
    "Matériaux",
    "Sous-traitance",
    "Location",
    "Autres",
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setExtracting(true);

    try {
      // Upload temporaire pour OCR
      const fileExt = selectedFile.name.split('.').pop();
      const tempFileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('factures')
        .upload(tempFileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('factures')
        .getPublicUrl(uploadData.path);

      // Appel à l'edge function d'extraction
      const { data: extractedData, error: extractError } = await supabase.functions
        .invoke('extract-document-data', {
          body: { fileUrl: publicUrl, documentType: 'invoice' }
        });

      if (extractError) throw extractError;

      // Pré-remplir le formulaire avec les données extraites
      if (extractedData) {
        setFormData(prev => ({
          ...prev,
          fournisseur: extractedData.fournisseur || prev.fournisseur,
          montant_ht: extractedData.montant_ht || prev.montant_ht,
          date_facture: extractedData.date_facture || prev.date_facture,
        }));
        toast({
          title: "Extraction réussie",
          description: "Les données ont été extraites automatiquement",
        });
      }

      // Supprimer le fichier temporaire
      await supabase.storage.from('factures').remove([tempFileName]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fichier_url = null;

      // Upload du fichier
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${chantierId}-facture-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('factures')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('factures')
          .getPublicUrl(fileName);
        
        fichier_url = publicUrl;
      }

      // Créer la facture
      const { error } = await supabase
        .from("factures_fournisseurs")
        .insert({
          ...formData,
          chantier_id: chantierId,
          fichier_url,
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La facture a été ajoutée avec succès",
      });

      setOpen(false);
      setFormData({
        fournisseur: "",
        montant_ht: 0,
        categorie: "Matériaux",
        date_facture: new Date().toISOString().split('T')[0],
      });
      setFile(null);
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("factures_fournisseurs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La facture a été supprimée",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalFactures = factures.reduce((sum, f) => sum + Number(f.montant_ht), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Factures Fournisseurs</CardTitle>
            <CardDescription>
              Total : {totalFactures.toLocaleString()} € HT
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une facture
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Ajouter une facture fournisseur</DialogTitle>
                  <DialogDescription>
                    Uploadez la facture et saisissez les informations
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

                  <div className="space-y-2">
                    <Label htmlFor="fournisseur">Fournisseur</Label>
                    <Input
                      id="fournisseur"
                      value={formData.fournisseur}
                      onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categorie">Catégorie</Label>
                    <Select
                      value={formData.categorie}
                      onValueChange={(value) => setFormData({ ...formData, categorie: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="montant_ht">Montant HT (€)</Label>
                      <Input
                        id="montant_ht"
                        type="number"
                        step="0.01"
                        value={formData.montant_ht}
                        onChange={(e) => setFormData({ ...formData, montant_ht: parseFloat(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_facture">Date</Label>
                      <Input
                        id="date_facture"
                        type="date"
                        value={formData.date_facture}
                        onChange={(e) => setFormData({ ...formData, date_facture: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajouter
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {factures.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant HT</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factures.map((facture) => (
                <TableRow key={facture.id}>
                  <TableCell className="font-medium">{facture.fournisseur}</TableCell>
                  <TableCell>{facture.categorie}</TableCell>
                  <TableCell>{new Date(facture.date_facture).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(facture.montant_ht).toLocaleString()} €
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {facture.fichier_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={facture.fichier_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(facture.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucune facture enregistrée. Cliquez sur "Ajouter" pour commencer.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceManager;
