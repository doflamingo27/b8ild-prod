import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  numero_facture: string;
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  date_emission: string;
  date_echeance: string;
  statut: string;
  notes: string | null;
}

interface ClientInvoiceManagerProps {
  chantierId: string;
  invoices: Invoice[];
  clientName: string;
}

export const ClientInvoiceManager = ({ chantierId, invoices, clientName }: ClientInvoiceManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [montantHT, setMontantHT] = useState("");
  const [tva, setTva] = useState("20");
  const [dateEcheance, setDateEcheance] = useState(
    format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [notes, setNotes] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateInvoiceNumber = () => {
    const now = new Date();
    return `FAC-${format(now, "yyyyMMdd")}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const handleAdd = async () => {
    if (!montantHT || parseFloat(montantHT) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant valide",
        variant: "destructive",
      });
      return;
    }

    const ht = parseFloat(montantHT);
    const tvaValue = parseFloat(tva);
    const ttc = ht * (1 + tvaValue / 100);

    const { error } = await supabase.from("factures_clients").insert({
      chantier_id: chantierId,
      numero_facture: generateInvoiceNumber(),
      montant_ht: ht,
      tva: tvaValue,
      montant_ttc: ttc,
      date_emission: format(new Date(), "yyyy-MM-dd"),
      date_echeance: dateEcheance,
      statut: "emise",
      notes: notes || null
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la facture",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Facture créée avec succès",
    });

    setIsAdding(false);
    setMontantHT("");
    setNotes("");
    queryClient.invalidateQueries({ queryKey: ["client-invoices"] });
  };

  const handleDelete = async (invoiceId: string) => {
    const { error } = await supabase
      .from("factures_clients")
      .delete()
      .eq("id", invoiceId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la facture",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Facture supprimée",
    });

    queryClient.invalidateQueries({ queryKey: ["client-invoices"] });
  };

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      brouillon: { label: "Brouillon", variant: "secondary" },
      emise: { label: "Émise", variant: "default" },
      payee: { label: "Payée", variant: "outline" },
      annulee: { label: "Annulée", variant: "destructive" },
      en_retard: { label: "En retard", variant: "destructive" },
    };
    const config = variants[statut] || variants.emise;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Facturation Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding ? (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montant_ht">Montant HT (€)</Label>
                <Input
                  id="montant_ht"
                  type="number"
                  step="0.01"
                  value={montantHT}
                  onChange={(e) => setMontantHT(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="tva">TVA (%)</Label>
                <Input
                  id="tva"
                  type="number"
                  step="0.1"
                  value={tva}
                  onChange={(e) => setTva(e.target.value)}
                />
              </div>
            </div>

            {montantHT && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Montant TTC</p>
                <p className="text-2xl font-bold">
                  {(parseFloat(montantHT) * (1 + parseFloat(tva) / 100)).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="echeance">Date d'échéance</Label>
              <Input
                id="echeance"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
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
                Créer la facture
              </Button>
              <Button onClick={() => setIsAdding(false)} variant="outline">
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Créer une facture client
          </Button>
        )}

        <div className="space-y-2">
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune facture client
            </p>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm">{invoice.numero_facture}</span>
                    {getStatusBadge(invoice.statut)}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold">
                      {Number(invoice.montant_ttc).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} € TTC
                    </span>
                    <span className="text-muted-foreground">
                      Échéance: {format(new Date(invoice.date_echeance), "dd/MM/yyyy", { locale: fr })}
                    </span>
                  </div>
                  {invoice.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{invoice.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(invoice.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};