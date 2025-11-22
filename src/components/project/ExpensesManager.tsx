import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSecureInsert } from "@/hooks/useSecureInsert";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ExpensesManagerProps {
  chantierId: string;
  frais: any[];
  onUpdate: () => void;
}

const ExpensesManager = ({ chantierId, frais, onUpdate }: ExpensesManagerProps) => {
  const { toast } = useToast();
  const { secureInsert } = useSecureInsert();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type_frais: "Autre",
    montant_total: 0,
    description: "",
    date_frais: new Date().toISOString().split('T')[0],
  });

  const expenseCategories = [
    { value: "Location de véhicule", label: "Location de véhicule", icon: "🚗" },
    { value: "Achat d'outillage", label: "Achat d'outillage", icon: "🔧" },
    { value: "Location d'outillage", label: "Location d'outillage", icon: "🔨" },
    { value: "Consommables", label: "Consommables", icon: "🍞" },
    { value: "Frais de déplacement", label: "Frais de déplacement", icon: "🚙" },
    { value: "Frais d'hébergement", label: "Frais d'hébergement", icon: "🏠" },
    { value: "Assurance", label: "Assurance", icon: "🛡️" },
    { value: "Permis & autorisations", label: "Permis & autorisations", icon: "📄" },
    { value: "Sous-traitant", label: "Sous-traitant", icon: "👷" },
    { value: "Pénalité de retard", label: "Pénalité de retard", icon: "⚠️" },
    { value: "Autre", label: "Autre", icon: "📦" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Récupérer entreprise_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user.id)
        .single();

      if (!entreprise) throw new Error("Entreprise introuvable");

      // Utiliser la RPC sécurisée
      const newId = await secureInsert({
        table: 'frais_chantier',
        data: {
          chantier_id: chantierId,
          type_frais: formData.type_frais,
          montant_total: formData.montant_total,
          date_frais: formData.date_frais,
          description: formData.description,
        },
        entrepriseId: entreprise.id
      });

      if (!newId) {
        throw new Error("Échec de l'insertion");
      }

      setOpen(false);
      setFormData({
        type_frais: "Autre",
        montant_total: 0,
        description: "",
        date_frais: new Date().toISOString().split('T')[0],
      });
      onUpdate();
    } catch (error: any) {
      console.error('[ExpensesManager] Insert error:', error);
      
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le frais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("frais_chantier")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le frais a été supprimé",
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

  const totalFrais = frais.reduce((sum, f) => sum + Number(f.montant_total), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Coûts annexes</CardTitle>
            <CardDescription>
              Total : {totalFrais.toLocaleString()} €
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle dépense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Ajouter un coût annexe</DialogTitle>
                  <DialogDescription>
                    Enregistrez les coûts annexes du chantier
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type_frais">Type de coût</Label>
                    <Select
                      value={formData.type_frais}
                      onValueChange={(value) => setFormData({ ...formData, type_frais: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="montant_total">Montant (€)</Label>
                      <Input
                        id="montant_total"
                        type="number"
                        step="0.01"
                        value={formData.montant_total}
                        onChange={(e) => setFormData({ ...formData, montant_total: parseFloat(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_frais">Date</Label>
                      <Input
                        id="date_frais"
                        type="date"
                        value={formData.date_frais}
                        onChange={(e) => setFormData({ ...formData, date_frais: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Détails des frais..."
                    />
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
        {frais.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frais.map((fraisItem) => {
                const category = expenseCategories.find(c => c.value === fraisItem.type_frais);
                const icon = category?.icon || "📦";
                
                return (
                  <TableRow key={fraisItem.id}>
                    <TableCell className="font-medium">
                      {icon} {fraisItem.type_frais}
                    </TableCell>
                    <TableCell>{fraisItem.description || "-"}</TableCell>
                    <TableCell>{new Date(fraisItem.date_frais).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(fraisItem.montant_total).toLocaleString()} €
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(fraisItem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucun coût annexe pour le moment. Cliquez sur "Nouvelle dépense" pour commencer.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpensesManager;
