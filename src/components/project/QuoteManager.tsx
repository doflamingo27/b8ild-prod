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
import AutoExtractUploader from "@/components/AutoExtractUploader";
import { useQuery } from "@tanstack/react-query";

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
    montant_ht: 0,
    tva: 20,
    montant_ttc: 0,
    statut: 'brouillon',
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

  const devisList = Array.isArray(devis) ? devis : [];
  const devisActif = devisList.find(d => d.actif);

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
      let fichier_url = null;

      // Upload du fichier si présent
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${chantierId}-devis-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('devis')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('devis')
          .getPublicUrl(fileName);
        
        fichier_url = publicUrl;
      }

      // Auto-incrémenter la version
      const maxVersion = devisList.length > 0 
        ? Math.max(...devisList.map(d => parseInt(d.version?.replace('V', '') || '0'))) 
        : 0;
      const newVersion = `V${maxVersion + 1}`;

      // Désactiver tous les autres devis si c'est le premier
      if (devisList.length === 0) {
        await supabase
          .from("devis")
          .update({ actif: false })
          .eq("chantier_id", chantierId);
      }

      const devisData = {
        ...formData,
        chantier_id: chantierId,
        fichier_url,
        version: newVersion,
        actif: devisList.length === 0, // Premier devis = actif
      };

      const { error } = await supabase
        .from("devis")
        .insert(devisData);
      
      if (error) throw error;

      toast({
        title: "Succès",
        description: `Devis ${newVersion} créé avec succès`,
      });

      setOpen(false);
      setFormData({
        montant_ht: 0,
        tva: 20,
        montant_ttc: 0,
        statut: 'brouillon',
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
      montant_ht: d.montant_ht,
      tva: d.tva,
      montant_ttc: d.montant_ttc,
      statut: d.statut,
    });
    setEditOpen(true);
  };

  const handleUpdateDevis = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("devis")
        .update({
          montant_ht: formData.montant_ht,
          tva: formData.tva,
          montant_ttc: formData.montant_ttc,
          statut: formData.statut,
        })
        .eq("id", editingDevis.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis modifié avec succès",
      });

      setEditOpen(false);
      setEditingDevis(null);
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
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Créer un nouveau devis</DialogTitle>
                <DialogDescription>
                  Uploadez votre devis pour extraction automatique (OCR.space)
                </DialogDescription>
              </DialogHeader>

              {entreprise?.id && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm font-semibold mb-3">📄 Option 1 : Extraction automatique (recommandé)</p>
                  <AutoExtractUploader 
                    module="devis"
                    entrepriseId={entreprise.id}
                    chantierId={chantierId}
                    onSaved={async (devisId) => {
                      toast({
                        title: "✅ Devis enregistré",
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
                  <p className="text-sm font-semibold">✍️ Option 2 : Saisie manuelle</p>
                  
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
            {/* KPI - Devis actif */}
            {devisActif && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">💰 Devis actif ({devisActif.version})</p>
                    <p className="text-2xl font-bold">{devisActif.montant_ttc?.toLocaleString() || 0} € TTC</p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">ACTIF</Badge>
                </div>
              </div>
            )}

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
