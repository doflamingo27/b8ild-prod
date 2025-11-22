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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Pencil, Trash2, Users, Calculator, UserCheck, Hammer, RefreshCw } from "lucide-react";
import { useCalculations } from "@/hooks/useCalculations";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { labels, placeholders, toasts, emptyStates, tooltips, modals, tables } from "@/lib/content";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TeamManager from "@/components/team/TeamManager";
import MemberTeamAssignment from "@/components/team/MemberTeamAssignment";
import { cn } from "@/lib/utils";

interface Membre {
  id: string;
  prenom: string;
  nom: string;
  poste: string;
  specialite: string;
  taux_horaire: number;
  charges_salariales: number;
  charges_patronales: number;
  statut: 'sur_chantier' | 'disponible' | 'repos' | 'en_arret';
  equipe_id?: string | null;
}

interface Equipe {
  id: string;
  nom: string;
  specialite: string;
}

const Team = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [membres, setMembres] = useState<Membre[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [editingMembre, setEditingMembre] = useState<Membre | null>(null);
  const [filterStatut, setFilterStatut] = useState<'all' | 'sur_chantier' | 'disponible' | 'repos' | 'en_arret'>('all');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingMembreId, setEditingMembreId] = useState<string | null>(null);
  const [newStatut, setNewStatut] = useState<string>('disponible');
  const [filterEquipe, setFilterEquipe] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    poste: "",
    specialite: "",
    taux_horaire: 15,
    charges_salariales: 22,
    charges_patronales: 42,
    equipe_id: "" as string | null,
  });

  const { cout_journalier_equipe, calculerCoutJournalierMembre } = useCalculations({
    membres: membres.filter(m => m.statut === 'sur_chantier' || m.statut === 'disponible'),
  });

  useEffect(() => {
    if (user) {
      loadEntreprise();
    }
  }, [user]);

  useEffect(() => {
    if (entrepriseId) {
      loadMembres();
      loadEquipes();
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
      setMembres((data || []) as any);
    } catch (error: any) {
      console.error("Erreur chargement membres:", error);
    }
  };

  const loadEquipes = async () => {
    try {
      const { data, error } = await supabase
        .from("equipes")
        .select("id, nom, specialite")
        .eq("entreprise_id", entrepriseId)
        .order("nom");

      if (error) throw error;
      setEquipes(data || []);
    } catch (error: any) {
      console.error("Erreur chargement équipes:", error);
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
      equipe_id: membre.equipe_id || null,
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
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "Membre supprimé", description: "Le membre a été supprimé définitivement." });
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
      equipe_id: null,
    });
  };

  // Filtrage des membres
  const filteredMembres = membres.filter(membre => {
    // Filtre par statut
    if (filterStatut !== 'all' && membre.statut !== filterStatut) return false;
    
    // Filtre par équipe
    if (filterEquipe && membre.equipe_id !== filterEquipe) return false;
    
    return true;
  });

  // Calcul des KPIs basés sur les membres filtrés
  const totalMembres = filteredMembres.length;
  const membresSurChantier = filteredMembres.filter(m => m.statut === 'sur_chantier').length;
  const membresDisponibles = filteredMembres.filter(m => m.statut === 'disponible').length;
  const membresRepos = filteredMembres.filter(m => m.statut === 'repos').length;
  const membresEnArret = filteredMembres.filter(m => m.statut === 'en_arret').length;
  const membresActifs = membresSurChantier + membresDisponibles;
  const coutTotalJournalier = filteredMembres
    .filter(m => m.statut === 'sur_chantier' || m.statut === 'disponible')
    .reduce((total, membre) => {
      const coutHoraireReel = membre.taux_horaire * 
        (1 + (membre.charges_salariales / 100) + (membre.charges_patronales / 100));
      const coutJournalierMembre = coutHoraireReel * 8;
      return total + coutJournalierMembre;
    }, 0);
  const coutMoyenHoraire = membresActifs > 0 
    ? filteredMembres.filter(m => m.statut === 'sur_chantier' || m.statut === 'disponible').reduce((sum, m) => sum + m.taux_horaire, 0) / membresActifs 
    : 0;

  // Helper pour badges de statut
  const getStatutBadge = (statut: string) => {
    const badges = {
      sur_chantier: { label: "🚧 Sur chantier", className: "bg-green-500 hover:bg-green-600 text-white" },
      disponible: { label: "✅ Disponible", className: "bg-blue-500 hover:bg-blue-600 text-white" },
      repos: { label: "😴 Repos", className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
      en_arret: { label: "🏥 En arrêt", className: "bg-red-500 hover:bg-red-600 text-white" }
    };
    return badges[statut as keyof typeof badges] || badges.disponible;
  };

  // Fonction de modification du statut
  const handleChangeStatut = async () => {
    try {
      const { error } = await supabase
        .from("membres_equipe")
        .update({ statut: newStatut })
        .eq("id", editingMembreId);

      if (error) throw error;

      toast({ title: "Statut modifié avec succès" });
      setStatusDialogOpen(false);
      loadMembres();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {entrepriseId && (
        <TeamManager 
          entrepriseId={entrepriseId}
          addMemberButton={
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  className="gap-2 font-bold"
                  aria-label="Ajouter un membre"
                  title="Ajouter un membre"
                >
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  Ajouter un membre
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
                  <Label htmlFor="equipe" className="font-semibold">Équipe (optionnel)</Label>
                  <Select
                    value={formData.equipe_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, equipe_id: value === "none" ? null : value })}
                  >
                    <SelectTrigger id="equipe" className="w-full">
                      <SelectValue placeholder="Aucune équipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="none">Aucune équipe</SelectItem>
                      {equipes.map((equipe) => (
                        <SelectItem key={equipe.id} value={equipe.id}>
                          {equipe.nom} {equipe.specialite && `(${equipe.specialite})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          }
        />
      )}
      
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
            Mon Équipe
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gérez vos salariés et leurs coûts
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Total Membres
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalMembres}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Actifs
            </CardTitle>
            <UserCheck className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{membresActifs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Coût Moyen/H
            </CardTitle>
            <Calculator className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">{coutMoyenHoraire.toFixed(2)}€</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Coût Total
            </CardTitle>
            <Calculator className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-600">{coutTotalJournalier.toFixed(2)}€</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        <Button
          variant={filterStatut === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterStatut('all')}
          className="font-semibold"
        >
          Tous
        </Button>
        <Button
          variant={filterStatut === 'sur_chantier' ? 'default' : 'outline'}
          onClick={() => setFilterStatut('sur_chantier')}
          className="font-semibold"
        >
          🚧 Sur chantier
        </Button>
        <Button
          variant={filterStatut === 'disponible' ? 'default' : 'outline'}
          onClick={() => setFilterStatut('disponible')}
          className="font-semibold"
        >
          ✅ Disponibles
        </Button>
        <Button
          variant={filterStatut === 'repos' ? 'default' : 'outline'}
          onClick={() => setFilterStatut('repos')}
          className="font-semibold"
        >
          😴 Repos
        </Button>
        <Button
          variant={filterStatut === 'en_arret' ? 'default' : 'outline'}
          onClick={() => setFilterStatut('en_arret')}
          className="font-semibold"
        >
          🏥 En arrêt
        </Button>
        
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold text-muted-foreground">Équipe:</Label>
          <Select
            value={filterEquipe || "all"}
            onValueChange={(value) => setFilterEquipe(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[200px] bg-background z-50">
              <SelectValue placeholder="Toutes les équipes" />
            </SelectTrigger>
            <SelectContent className="bg-background z-[100]">
              <SelectItem value="all">Toutes les équipes</SelectItem>
              {equipes.map((equipe) => (
                <SelectItem key={equipe.id} value={equipe.id}>
                  {equipe.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Liste des membres</CardTitle>
          <CardDescription className="text-base">
            {filteredMembres.length} membre(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">{tables.team.columns[0]}</TableHead>
                  <TableHead className="font-bold">{tables.team.columns[1]}</TableHead>
                  <TableHead className="font-bold">Équipe</TableHead>
                  <TableHead className="font-bold">{tables.team.columns[2]}</TableHead>
                  <TableHead className="text-right font-bold">{tables.team.columns[3]}</TableHead>
                  <TableHead className="text-right font-bold">{tables.team.columns[5]}</TableHead>
                  <TableHead className="font-bold">{tables.team.columns[6]}</TableHead>
                  <TableHead className="text-right font-bold">{tables.team.columns[7]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembres.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <EmptyState
                        icon={Users}
                        title="Aucun membre pour le moment"
                        text="Ajoutez vos premiers salariés pour pouvoir les affecter aux chantiers"
                        primaryAction={{
                          label: "Ajouter un membre",
                          onClick: () => setDialogOpen(true),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembres.map((membre) => (
                    <TableRow key={membre.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold">
                        {membre.prenom} {membre.nom}
                      </TableCell>
                      <TableCell>{membre.poste}</TableCell>
                      <TableCell>
                        {entrepriseId && (
                          <MemberTeamAssignment
                            membreId={membre.id}
                            currentEquipeId={membre.equipe_id}
                            entrepriseId={entrepriseId}
                            onUpdate={loadMembres}
                          />
                        )}
                      </TableCell>
                      <TableCell>{membre.specialite}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{membre.taux_horaire.toFixed(2)} €</TableCell>
                      <TableCell className="text-right font-mono font-black text-primary">
                        {calculerCoutJournalierMembre(membre).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn("font-semibold", getStatutBadge(membre.statut).className)}
                        >
                          {getStatutBadge(membre.statut).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingMembreId(membre.id);
                              setNewStatut(membre.statut);
                              setStatusDialogOpen(true);
                            }}
                            className="hover:bg-primary/10"
                            aria-label="Changer le statut"
                            title="Changer le statut"
                          >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(membre)}
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

      {/* Dialog de modification du statut */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
            <DialogDescription>
              Changez le statut de ce membre. Le statut sera automatiquement mis à jour 
              "Sur chantier" s'il est affecté à un projet actif.
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup value={newStatut} onValueChange={setNewStatut}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="disponible" id="st-disponible" />
              <Label htmlFor="st-disponible">✅ Disponible</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="repos" id="st-repos" />
              <Label htmlFor="st-repos">😴 Repos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en_arret" id="st-arret" />
              <Label htmlFor="st-arret">🏥 En arrêt (maladie/accident)</Label>
            </div>
          </RadioGroup>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangeStatut}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
