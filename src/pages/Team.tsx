import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Pencil, Trash2, Users, Calculator } from "lucide-react";
import { useCalculations } from "@/hooks/useCalculations";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { labels, placeholders, toasts, emptyStates, tooltips, modals, tables } from "@/lib/content";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Membre {
  id: string;
  prenom: string;
  nom: string;
  poste: string;
  specialite: string;
  taux_horaire: number;
  charges_salariales: number;
  charges_patronales: number;
  actif: boolean;
}

const Team = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [membres, setMembres] = useState<Membre[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [editingMembre, setEditingMembre] = useState<Membre | null>(null);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    poste: "",
    specialite: "",
    taux_horaire: 15,
    charges_salariales: 22,
    charges_patronales: 42,
  });

  const { cout_journalier_equipe, calculerCoutJournalierMembre } = useCalculations({
    membres: membres.filter(m => m.actif),
  });

  useEffect(() => {
    if (user) {
      loadEntreprise();
    }
  }, [user]);

  useEffect(() => {
    if (entrepriseId) {
      loadMembres();
    }
  }, [entrepriseId]);

  const loadEntreprise = async () => {
    try {
      const { data, error } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user?.id)
        .single();

      if (error) throw error;
      setEntrepriseId(data.id);
    } catch (error: any) {
      console.error("Erreur chargement entreprise:", error);
    }
  };

  const loadMembres = async () => {
    try {
      const { data, error } = await supabase
        .from("membres_equipe")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembres(data || []);
    } catch (error: any) {
      console.error("Erreur chargement membres:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingMembre) {
        const { error } = await supabase
          .from("membres_equipe")
          .update(formData)
          .eq("id", editingMembre.id);

        if (error) throw error;
        toast({ title: toasts.updated, description: "Les informations ont été enregistrées." });
      } else {
        const { error } = await supabase
          .from("membres_equipe")
          .insert({
            ...formData,
            entreprise_id: entrepriseId,
            actif: true,
          });

        if (error) throw error;
        toast({ title: toasts.created, description: "Le membre a été ajouté à votre équipe." });
      }

      setDialogOpen(false);
      resetForm();
      loadMembres();
    } catch (error: any) {
      toast({ title: "Erreur", description: toasts.errorGeneric, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (membre: Membre) => {
    setEditingMembre(membre);
    setFormData({
      prenom: membre.prenom,
      nom: membre.nom,
      poste: membre.poste,
      specialite: membre.specialite,
      taux_horaire: membre.taux_horaire,
      charges_salariales: membre.charges_salariales,
      charges_patronales: membre.charges_patronales,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("membres_equipe")
        .update({ actif: false })
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: toasts.deactivated, description: "Le membre a été retiré de l'équipe." });
      loadMembres();
    } catch (error: any) {
      toast({ title: "Erreur", description: toasts.errorGeneric, variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setEditingMembre(null);
    setFormData({
      prenom: "",
      nom: "",
      poste: "",
      specialite: "",
      taux_horaire: 15,
      charges_salariales: 22,
      charges_patronales: 42,
    });
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmDelete}
        variant="delete"
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
            <Users className="h-9 w-9 text-primary" aria-hidden="true" />
            {labels.nav.team}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gérez les membres de votre équipe et leurs coûts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              className="gap-2 font-bold"
              aria-label={labels.actions.add}
              title={labels.actions.add}
            >
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              {emptyStates.team.primary}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">
                  {editingMembre ? "Modifier le membre" : "Ajouter un membre"}
                </DialogTitle>
                <DialogDescription className="text-base">
                  Renseignez les informations du membre de l'équipe
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom" className="font-semibold">{labels.forms.memberFirstname}</Label>
                    <Input
                      id="prenom"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      placeholder={placeholders.team.firstname}
                      required
                      aria-label={labels.forms.memberFirstname}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="font-semibold">{labels.forms.memberLastname}</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      placeholder={placeholders.team.lastname}
                      required
                      aria-label={labels.forms.memberLastname}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="poste" className="font-semibold">{labels.forms.memberRole}</Label>
                    <Input
                      id="poste"
                      value={formData.poste}
                      onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                      placeholder={placeholders.team.role}
                      required
                      aria-label={labels.forms.memberRole}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialite" className="font-semibold">{labels.forms.memberSkill}</Label>
                    <Input
                      id="specialite"
                      value={formData.specialite}
                      onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                      placeholder={placeholders.team.skill}
                      required
                      aria-label={labels.forms.memberSkill}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taux_horaire" className="font-semibold">{labels.forms.hourlyRate}</Label>
                  <Input
                    id="taux_horaire"
                    type="number"
                    step="0.01"
                    value={formData.taux_horaire}
                    onChange={(e) => setFormData({ ...formData, taux_horaire: parseFloat(e.target.value) })}
                    placeholder={placeholders.team.rate}
                    required
                    aria-label={labels.forms.hourlyRate}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="charges_salariales" className="font-semibold">{labels.forms.employeeCharges}</Label>
                    <Input
                      id="charges_salariales"
                      type="number"
                      step="0.01"
                      value={formData.charges_salariales}
                      onChange={(e) => setFormData({ ...formData, charges_salariales: parseFloat(e.target.value) })}
                      required
                      aria-label={labels.forms.employeeCharges}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charges_patronales" className="font-semibold">{labels.forms.employerCharges}</Label>
                    <Input
                      id="charges_patronales"
                      type="number"
                      step="0.01"
                      value={formData.charges_patronales}
                      onChange={(e) => setFormData({ ...formData, charges_patronales: parseFloat(e.target.value) })}
                      required
                      aria-label={labels.forms.employerCharges}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} size="lg" className="font-bold">
                  {editingMembre ? labels.actions.edit : labels.actions.add}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-black">
            <Calculator className="h-6 w-6 text-primary" aria-hidden="true" />
            Coût total de l'équipe
          </CardTitle>
          <CardDescription className="text-base">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help underline decoration-dotted">
                    {tooltips.kpiTeamCost}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltips.kpiTeamCost}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-black font-mono text-gradient-primary">
            {cout_journalier_equipe.toFixed(2)} €<span className="text-xl text-muted-foreground font-sans">/jour</span>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Liste des membres</CardTitle>
          <CardDescription className="text-base">
            {membres.filter(m => m.actif).length} membre(s) actif(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">{tables.team.columns[0]}</TableHead>
                  <TableHead className="font-bold">{tables.team.columns[1]}</TableHead>
                  <TableHead className="font-bold">{tables.team.columns[2]}</TableHead>
                  <TableHead className="text-right font-bold">{tables.team.columns[3]}</TableHead>
                  <TableHead className="text-right font-bold">{tables.team.columns[5]}</TableHead>
                  <TableHead className="font-bold">{tables.team.columns[6]}</TableHead>
                  <TableHead className="text-right font-bold">{tables.team.columns[7]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membres.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <EmptyState
                        icon={Users}
                        title={emptyStates.team.title}
                        text={emptyStates.team.text}
                        primaryAction={{
                          label: emptyStates.team.primary,
                          onClick: () => setDialogOpen(true),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  membres.map((membre) => (
                    <TableRow key={membre.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold">
                        {membre.prenom} {membre.nom}
                      </TableCell>
                      <TableCell>{membre.poste}</TableCell>
                      <TableCell>{membre.specialite}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{membre.taux_horaire.toFixed(2)} €</TableCell>
                      <TableCell className="text-right font-mono font-black text-primary">
                        {calculerCoutJournalierMembre(membre).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Badge variant={membre.actif ? "default" : "secondary"} className="font-semibold">
                          {membre.actif ? labels.forms.active : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(membre)}
                            disabled={!membre.actif}
                            className="hover:bg-primary/10"
                            aria-label={labels.actions.edit}
                            title={labels.actions.edit}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(membre.id)}
                            disabled={!membre.actif}
                            className="hover:bg-danger/10"
                            aria-label={labels.actions.delete}
                            title={labels.actions.delete}
                          >
                            <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
