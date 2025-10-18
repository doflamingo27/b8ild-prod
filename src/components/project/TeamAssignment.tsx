import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeamAssignmentProps {
  chantierId: string;
  membres: any[];
  onUpdate: () => void;
  coutJournalier: number;
}

const TeamAssignment = ({ chantierId, membres, onUpdate, coutJournalier }: TeamAssignmentProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableMembers();
  }, []);

  const loadAvailableMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entreprise } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user.id)
        .single();

      if (!entreprise) return;
      setEntrepriseId(entreprise.id);

      const { data } = await supabase
        .from("membres_equipe")
        .select("*")
        .eq("entreprise_id", entreprise.id)
        .eq("actif", true);

      setAvailableMembers(data || []);
    } catch (error) {
      console.error("Erreur chargement membres:", error);
    }
  };

  const handleToggleMember = (membreId: string) => {
    setSelectedMembers(prev => 
      prev.includes(membreId) 
        ? prev.filter(id => id !== membreId)
        : [...prev, membreId]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Supprimer les anciennes affectations
      await supabase
        .from("equipe_chantier")
        .delete()
        .eq("chantier_id", chantierId);

      // Ajouter les nouvelles affectations
      const newAssignments = selectedMembers.map(membreId => ({
        chantier_id: chantierId,
        membre_id: membreId,
      }));

      if (newAssignments.length > 0) {
        const { error } = await supabase
          .from("equipe_chantier")
          .insert(newAssignments);

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "L'équipe a été mise à jour",
      });

      setOpen(false);
      setSelectedMembers([]);
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

  const handleRemoveMember = async (membreId: string) => {
    try {
      const { error } = await supabase
        .from("equipe_chantier")
        .delete()
        .eq("chantier_id", chantierId)
        .eq("membre_id", membreId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Membre retiré de l'équipe",
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

  const calculerCoutJournalierMembre = (membre: any) => {
    const coutHoraireReel = membre.taux_horaire * (1 + membre.charges_salariales / 100 + membre.charges_patronales / 100);
    return coutHoraireReel * 8;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Équipe affectée</CardTitle>
            <CardDescription>
              Coût journalier total : {coutJournalier.toFixed(2)} €
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Affecter des membres
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Affecter des membres à l'équipe</DialogTitle>
                <DialogDescription>
                  Sélectionnez les membres à affecter à ce chantier
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {availableMembers.map((membre) => (
                  <div key={membre.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={membre.id}
                      checked={selectedMembers.includes(membre.id)}
                      onCheckedChange={() => handleToggleMember(membre.id)}
                    />
                    <label
                      htmlFor={membre.id}
                      className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {membre.prenom} {membre.nom} - {membre.poste}
                      <span className="text-muted-foreground ml-2">
                        ({calculerCoutJournalierMembre(membre).toFixed(2)} €/j)
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Valider
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {membres.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead className="text-right">Coût journalier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membres.map((membre) => (
                <TableRow key={membre.id}>
                  <TableCell className="font-medium">
                    {membre.prenom} {membre.nom}
                  </TableCell>
                  <TableCell>{membre.poste}</TableCell>
                  <TableCell className="text-right font-mono">
                    {calculerCoutJournalierMembre(membre).toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveMember(membre.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            Aucun membre affecté. Cliquez sur "Affecter des membres" pour commencer.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamAssignment;
