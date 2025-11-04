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
import { labels, toasts } from "@/lib/content";
import AutoExtractUploader from "@/components/AutoExtractUploader";
import { useQuery } from "@tanstack/react-query";

interface InvoiceManagerProps {
  chantierId: string;
  factures: any[];
  onUpdate: () => void;
}

const InvoiceManager = ({ chantierId, factures, onUpdate }: InvoiceManagerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fournisseur: "",
    montant_ht: 0,
    categorie: "Matériaux",
    date_facture: new Date().toISOString().split('T')[0],
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

  const categories = [
    "Matériaux",
    "Sous-traitance",
    "Location",
    "Autres",
  ];


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
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${entreprise.id}/factures/${Date.now()}.${fileExt}`;
          
          console.log('[InvoiceManager] Uploading file:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('factures')
            .upload(fileName, file);

          if (uploadError) {
            console.error('[InvoiceManager] Upload error:', uploadError);
            throw new Error(`Échec d'upload: ${uploadError.message}`);
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('factures')
            .getPublicUrl(fileName);
          
          fichier_url = publicUrl;
          console.log('[InvoiceManager] File uploaded:', publicUrl);
        } catch (uploadErr: any) {
          // Continuer sans fichier mais avertir l'utilisateur
          console.warn('[InvoiceManager] Could not upload file:', uploadErr);
          toast({
            title: "⚠️ Avertissement",
            description: "La facture sera enregistrée sans fichier attaché",
            variant: "default",
          });
        }
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
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Ajouter une facture fournisseur</DialogTitle>
                  <DialogDescription>
                    Uploadez une facture pour extraction automatique (OCR.space)
                  </DialogDescription>
                </DialogHeader>
                
                {entreprise?.id && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-semibold mb-3">Option 1 : Upload automatique (recommandé)</p>
                    <AutoExtractUploader 
                      module="factures"
                      entrepriseId={entreprise.id}
                      chantierId={chantierId}
                      onSaved={(id) => {
                        toast({
                          title: "✅ Facture enregistrée",
                          description: "L'extraction OCR a réussi",
                        });
                        setOpen(false);
                        onUpdate();
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
