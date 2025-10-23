import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Euro } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Payment {
  id: string;
  montant: number;
  date_paiement: string;
  type: string;
  moyen_paiement: string | null;
  reference: string | null;
  statut: string;
  notes: string | null;
}

interface PaymentManagerProps {
  chantierId: string;
  payments: Payment[];
}

export const PaymentManager = ({ chantierId, payments }: PaymentManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [montant, setMontant] = useState("");
  const [datePayment, setDatePayment] = useState(format(new Date(), "yyyy-MM-dd"));
  const [type, setType] = useState("acompte");
  const [moyenPaiement, setMoyenPaiement] = useState("virement");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalEncaisse = payments
    .filter(p => p.statut === "encaisse")
    .reduce((sum, p) => sum + Number(p.montant), 0);

  const handleAdd = async () => {
    if (!montant || parseFloat(montant) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant valide",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("paiements_clients").insert({
      chantier_id: chantierId,
      montant: parseFloat(montant),
      date_paiement: datePayment,
      type,
      moyen_paiement: moyenPaiement,
      reference: reference || null,
      notes: notes || null,
      statut: "encaisse"
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le paiement",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Paiement ajouté avec succès",
    });

    setIsAdding(false);
    setMontant("");
    setReference("");
    setNotes("");
    queryClient.invalidateQueries({ queryKey: ["project-payments"] });
  };

  const handleDelete = async (paymentId: string) => {
    const { error } = await supabase
      .from("paiements_clients")
      .delete()
      .eq("id", paymentId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le paiement",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Paiement supprimé",
    });

    queryClient.invalidateQueries({ queryKey: ["project-payments"] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Trésorerie Client
          </CardTitle>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total encaissé</p>
            <p className="text-2xl font-bold text-success">
              {totalEncaisse.toLocaleString("fr-FR")} €
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding ? (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montant">Montant (€)</Label>
                <Input
                  id="montant"
                  type="number"
                  step="0.01"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={datePayment}
                  onChange={(e) => setDatePayment(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acompte">Acompte</SelectItem>
                    <SelectItem value="solde">Solde</SelectItem>
                    <SelectItem value="avance">Avance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="moyen">Moyen de paiement</Label>
                <Select value={moyenPaiement} onValueChange={setMoyenPaiement}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="carte">Carte bancaire</SelectItem>
                    <SelectItem value="prelevement">Prélèvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° de chèque, référence virement..."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1">
                Enregistrer
              </Button>
              <Button onClick={() => setIsAdding(false)} variant="outline">
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un paiement
          </Button>
        )}

        <div className="space-y-2">
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun paiement enregistré
            </p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {Number(payment.montant).toLocaleString("fr-FR")} €
                    </span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {payment.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.date_paiement), "dd MMMM yyyy", { locale: fr })}
                    {payment.moyen_paiement && ` • ${payment.moyen_paiement}`}
                    {payment.reference && ` • Réf: ${payment.reference}`}
                  </p>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(payment.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};