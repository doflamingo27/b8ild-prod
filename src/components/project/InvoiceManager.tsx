import React, { useState } from "react";
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
import ConfirmDialog from "@/components/ConfirmDialog";
import { FastFixUI } from "@/components/document/FastFixUI";
import { useDocumentExtraction } from "@/hooks/useDocumentExtraction";
import { useTemplateManager } from "@/hooks/useTemplateManager";
import { labels, toasts, tooltips } from "@/lib/content";

interface InvoiceManagerProps {
  chantierId: string;
  factures: any[];
  onUpdate: () => void;
}

const InvoiceManager = ({ chantierId, factures, onUpdate }: InvoiceManagerProps) => {
  const { toast } = useToast();
  const { extractDocument, isExtracting } = useDocumentExtraction();
  const { saveTemplate } = useTemplateManager();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);
  const [extractionDebug, setExtractionDebug] = useState<any>(null);
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
    
    // Créer URL pour le fallback
    const url = URL.createObjectURL(selectedFile);
    setFileUrl(url);

    // Extraire les données
    const result = await extractDocument(selectedFile, 'facture');
    
    setExtractionConfidence(result.confidence || 0);
    setExtractionDebug(result.data?.debug);
    
    if (result.needsFallback) {
      setExtractedData(result.partialData);
      setShowFallback(true);
    } else if (result.success && result.data) {
      // Pré-remplir le formulaire
      setFormData(prev => ({
        ...prev,
        fournisseur: result.data.fournisseur_nom || result.data.fournisseur || prev.fournisseur,
        montant_ht: result.data.montant_ht || prev.montant_ht,
        date_facture: result.data.date_document_iso || prev.date_facture,
      }));
      setExtractedData(result.data);
    }
  };

  const handleFallbackSave = async (data: any) => {
    setExtractedData(data);
    setFormData(prev => ({
      ...prev,
      fournisseur: data.fournisseur_nom || data.fournisseur || prev.fournisseur,
      montant_ht: data.montant_ht || prev.montant_ht,
      date_facture: data.date_document_iso || prev.date_facture,
    }));
    setShowFallback(false);
    
    // Optionnel: proposer d'enregistrer un template si SIRET détecté
    if (data.siret && data.fournisseur_nom) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: entreprise } = await supabase
          .from('entreprises')
          .select('id')
          .eq('proprietaire_user_id', user.id)
          .single();
        
        if (entreprise) {
          await saveTemplate({
            fournisseur_nom: data.fournisseur_nom,
            siret: data.siret,
            anchors: [],
            field_positions: {
              montant_ht: [{ label: 'Total HT' }],
              montant_ttc: [{ label: 'Total TTC' }]
            }
          }, entreprise.id);
        }
      }
    }
    
    toast({
      title: "Données validées",
      description: "Vous pouvez maintenant enregistrer la facture."
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Récupérer entreprise_id et user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user.id)
        .single();

      if (!entreprise) throw new Error("Entreprise introuvable");

      let fichier_url = null;

      // Upload du fichier
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${entreprise.id}/factures/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('factures')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('factures')
          .getPublicUrl(fileName);
        
        fichier_url = publicUrl;
      }

      // Insertion DIRECTE dans la table (les triggers vont recalculer automatiquement)
      const { data: newFacture, error: insertError } = await supabase
        .from('factures_fournisseurs')
        .insert({
          chantier_id: chantierId,
          entreprise_id: entreprise.id,
          created_by: user.id,
          fournisseur: formData.fournisseur,
          montant_ht: formData.montant_ht,
          categorie: formData.categorie,
          date_facture: formData.date_facture,
          fichier_url,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "✅ Facture ajoutée",
        description: "Les métriques vont se mettre à jour automatiquement",
      });

      setOpen(false);
      setFormData({
        fournisseur: "",
        montant_ht: 0,
        categorie: "Matériaux",
        date_facture: new Date().toISOString().split('T')[0],
      });
      setFile(null);
      setExtractedData(null);
      setShowFallback(false);
      onUpdate(); // Recharger la liste

    } catch (error: any) {
      console.error('[InvoiceManager] Insert error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la facture.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    
    try {
      const { error } = await supabase
        .from("factures_fournisseurs")
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      toast({ title: toasts.deleted });
      setDeleteTarget(null);
      onUpdate();
    } catch (error: any) {
      toast({
        title: toasts.errorGeneric,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalFactures = factures.reduce((sum, f) => sum + Number(f.montant_ht), 0);

  return (
    <>
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
                <Button aria-label={labels.actions.add} title={labels.actions.add}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
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
                      disabled={loading || isExtracting}
                    />
                    {isExtracting && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ✨ {tooltips.uploadOCR}
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
                    <Button type="submit" disabled={loading} aria-label={labels.actions.add}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                      {labels.actions.add}
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
                          <Button variant="ghost" size="sm" asChild aria-label={labels.actions.viewDetails} title={labels.actions.viewDetails}>
                            <a href={facture.fichier_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4" aria-hidden="true" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setDeleteTarget(facture.id)}
                          aria-label={labels.actions.delete}
                          title={labels.actions.delete}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
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

      {/* Fallback UI pour extraction manuelle */}
      <Dialog open={showFallback} onOpenChange={setShowFallback}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          {fileUrl && (
            <FastFixUI
              documentUrl={fileUrl}
              partialData={extractedData}
              documentType="facture"
              confidence={extractionConfidence}
              debug={extractionDebug}
              onSave={handleFallbackSave}
              onCancel={() => {
                setShowFallback(false);
                setFileUrl(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        variant="delete"
      />
    </>
  );
};

export default InvoiceManager;
