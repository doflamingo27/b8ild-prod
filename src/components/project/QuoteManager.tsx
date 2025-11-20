import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Loader2, CheckCircle2, Clock, Send, XCircle, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuoteManagerProps {
  chantierId: string;
  devis: any[];
  onUpdate: () => void;
}

const QuoteManager = ({ chantierId, devis = [], onUpdate }: QuoteManagerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [editingDevis, setEditingDevis] = useState<any>(null);
  const [formData, setFormData] = useState({
    montant_ht: '',
    tva: '20',
    montant_ttc: 0,
    statut: 'brouillon',
  });


  const devisList = Array.isArray(devis) ? devis : [];
  const devisActif = devisList.find(d => d.actif);

  const calculateTTC = (ht: number, tva: number) => {
    return ht * (1 + tva / 100);
  };

  const handleHTChange = (value: string) => {
    const ht = parseFloat(value) || 0;
    const tva = parseFloat(formData.tva) || 0;
    const ttc = calculateTTC(ht, tva);
    setFormData({ ...formData, montant_ht: value, montant_ttc: ttc });
  };

  const handleTVAChange = (value: string) => {
    const tva = parseFloat(value) || 0;
    const ht = parseFloat(formData.montant_ht) || 0;
    const ttc = calculateTTC(ht, tva);
    setFormData({ ...formData, tva: value, montant_ttc: ttc });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation critique : vérifier que chantierId existe
      if (!chantierId) {
        throw new Error("ID du chantier manquant. Impossible de créer le devis.");
      }
      
      console.log('[QuoteManager] Début création devis pour chantier:', chantierId);

      // Normalisation des montants : remplacer virgule par point pour format français
      const montantHtStr = formData.montant_ht.toString().replace(',', '.');
      const tvaStr = formData.tva.toString().replace(',', '.');
      
      const montant_ht = parseFloat(montantHtStr) || 0;
      const tva = parseFloat(tvaStr) || 0;

      console.log('[QuoteManager] Montants normalisés:', { montant_ht, tva, montant_ttc: formData.montant_ttc });

      if (montant_ht <= 0) {
        throw new Error("Le montant HT doit être supérieur à 0");
      }

      let fichier_url = null;

      // Upload du fichier si présent
      if (file) {
        console.log('[QuoteManager] Début upload fichier:', file.name);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('devis')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[QuoteManager] Erreur upload fichier:', uploadError);
          toast({
            title: "Erreur d'upload",
            description: `Impossible d'uploader le fichier: ${uploadError.message}`,
            variant: "destructive",
          });
          return; // Stop ici si l'upload échoue
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('devis')
          .getPublicUrl(fileName);
        
        fichier_url = publicUrl;
        console.log('[QuoteManager] Fichier uploadé avec succès:', fichier_url);
      }

      // Auto-incrémenter la version
      const maxVersion = devisList.length > 0 
        ? Math.max(...devisList.map(d => parseInt(d.version?.replace('V', '') || '0'))) 
        : 0;
      const newVersion = `V${maxVersion + 1}`;

      const isFirstDevis = devisList.length === 0;

      // Désactiver tous les autres devis si c'est le premier
      if (isFirstDevis) {
        console.log('[QuoteManager] Premier devis, désactivation des anciens devis');
        await supabase
          .from("devis")
          .update({ actif: false })
          .eq("chantier_id", chantierId);
      }

      const devisData = {
        montant_ht,
        tva,
        montant_ttc: formData.montant_ttc,
        statut: formData.statut,
        chantier_id: chantierId,
        fichier_url,
        version: newVersion,
        actif: isFirstDevis, // Premier devis = actif
      };

      console.log('[QuoteManager] DevisData envoyé à la base:', devisData);

      const { error } = await supabase
        .from("devis")
        .insert(devisData);
      
      if (error) {
        console.error('[QuoteManager] Erreur insertion devis:', error);
        throw error;
      }

      console.log('[QuoteManager] Devis créé avec succès');

      toast({
        title: "Succès",
        description: `Devis ${newVersion} créé avec succès`,
      });

      setOpen(false);
      setFormData({
        montant_ht: '',
        tva: '20',
        montant_ttc: 0,
        statut: 'brouillon',
      });
      setFile(null);
      onUpdate();
    } catch (error: any) {
      console.error('[QuoteManager] Erreur création devis:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActif = async (devisId: string) => {
    try {
      // Désactiver tous les autres devis
      await supabase
        .from("devis")
        .update({ actif: false })
        .eq("chantier_id", chantierId);

      // Activer le devis sélectionné
      const { error } = await supabase
        .from("devis")
        .update({ actif: true })
        .eq("id", devisId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis actif mis à jour",
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

  const handleOpenEdit = (d: any) => {
    setEditingDevis(d);
    setFormData({
      montant_ht: d.montant_ht.toString(),
      tva: d.tva.toString(),
      montant_ttc: d.montant_ttc,
      statut: d.statut,
    });
    setEditOpen(true);
  };

  const handleUpdateDevis = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[QuoteManager] Début modification devis:', editingDevis?.id);
      
      // Normalisation des montants : remplacer virgule par point pour format français
      const montantHtStr = formData.montant_ht.toString().replace(',', '.');
      const tvaStr = formData.tva.toString().replace(',', '.');
      
      const montant_ht = parseFloat(montantHtStr) || 0;
      const tva = parseFloat(tvaStr) || 0;

      console.log('[QuoteManager] Montants normalisés pour update:', { montant_ht, tva, montant_ttc: formData.montant_ttc });

      const { error } = await supabase
        .from("devis")
        .update({
          montant_ht,
          tva,
          montant_ttc: formData.montant_ttc,
          statut: formData.statut,
        })
        .eq("id", editingDevis.id);

      if (error) {
        console.error('[QuoteManager] Erreur modification devis:', error);
        throw error;
      }

      console.log('[QuoteManager] Devis modifié avec succès');

      toast({
        title: "Succès",
        description: "Devis modifié avec succès",
      });

      setEditOpen(false);
      setEditingDevis(null);
      onUpdate();
    } catch (error: any) {
      console.error('[QuoteManager] Erreur modification devis:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevis = async (devisId: string) => {
    try {
      const { error } = await supabase
        .from("devis")
        .delete()
        .eq("id", devisId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis supprimé avec succès",
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

  const getStatutBadge = (statut: string) => {
    const config = {
      brouillon: { label: "Brouillon", variant: "secondary" as const, icon: Clock },
      envoye: { label: "Envoyé", variant: "default" as const, icon: Send },
      accepte: { label: "Accepté", variant: "default" as const, icon: CheckCircle2 },
      refuse: { label: "Refusé", variant: "destructive" as const, icon: XCircle },
    };
    const { label, variant, icon: Icon } = config[statut as keyof typeof config] || config.brouillon;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Devis</CardTitle>
            <CardDescription>
              Gestion des devis du chantier
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau devis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un nouveau devis</DialogTitle>
                <DialogDescription>
                  Saisissez les informations du devis manuellement
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="statut">Statut</Label>
                      <Select 
                        value={formData.statut} 
                        onValueChange={(value) => setFormData({ ...formData, statut: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brouillon">Brouillon</SelectItem>
                          <SelectItem value="envoye">Envoyé</SelectItem>
                          <SelectItem value="accepte">Accepté</SelectItem>
                          <SelectItem value="refuse">Refusé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                      value={formData.montant_ttc.toFixed(2)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer le devis
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {devisList.length > 0 ? (
          <div className="space-y-4">
            {/* Tableau des devis */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant HT</TableHead>
                  <TableHead>TVA</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devisList.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.version}</TableCell>
                    <TableCell>{getStatutBadge(d.statut)}</TableCell>
                    <TableCell>{d.montant_ht?.toFixed(2)} €</TableCell>
                    <TableCell>{d.tva}%</TableCell>
                    <TableCell className="font-bold">{d.montant_ttc?.toFixed(2)} €</TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant={d.actif ? "default" : "outline"}
                        size="sm"
                        onClick={() => !d.actif && handleToggleActif(d.id)}
                        disabled={d.actif}
                      >
                        {d.actif ? <CheckCircle2 className="h-4 w-4" /> : "Activer"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {d.fichier_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={d.fichier_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEdit(d)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer le devis {d.version} ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteDevis(d.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold text-muted-foreground mb-2">
              Aucun devis enregistré
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier devis pour commencer à suivre la rentabilité du chantier
            </p>
          </div>
        )}
      </CardContent>

      {/* Dialog d'édition */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le devis {editingDevis?.version}</DialogTitle>
            <DialogDescription>
              Modifiez les montants et le statut du devis
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateDevis}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_statut">Statut</Label>
                <Select 
                  value={formData.statut} 
                  onValueChange={(value) => setFormData({ ...formData, statut: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="envoye">Envoyé</SelectItem>
                    <SelectItem value="accepte">Accepté</SelectItem>
                    <SelectItem value="refuse">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_montant_ht">Montant HT (€)</Label>
                  <Input
                    id="edit_montant_ht"
                    type="number"
                    step="0.01"
                    value={formData.montant_ht}
                    onChange={(e) => handleHTChange(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_tva">TVA (%)</Label>
                  <Input
                    id="edit_tva"
                    type="number"
                    step="0.01"
                    value={formData.tva}
                    onChange={(e) => handleTVAChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_montant_ttc">Montant TTC (€)</Label>
                <Input
                  id="edit_montant_ttc"
                  type="number"
                  step="0.01"
                  value={formData.montant_ttc.toFixed(2)}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuoteManager;
