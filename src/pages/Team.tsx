import { useState, useEffect } from "react";
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
        toast({ title: "Membre mis à jour", description: "Les informations ont été enregistrées." });
      } else {
        const { error } = await supabase
          .from("membres_equipe")
          .insert({
            ...formData,
            entreprise_id: entrepriseId,
            actif: true,
          });

        if (error) throw error;
        toast({ title: "Membre ajouté", description: "Le membre a été ajouté à votre équipe." });
      }

      setDialogOpen(false);
      resetForm();
      loadMembres();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) return;

    try {
      const { error } = await supabase
        .from("membres_equipe")
        .update({ actif: false })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Membre désactivé", description: "Le membre a été retiré de l'équipe." });
      loadMembres();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestion de l'équipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les membres de votre équipe et leurs coûts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingMembre ? "Modifier le membre" : "Ajouter un membre"}
                </DialogTitle>
                <DialogDescription>
                  Renseignez les informations du membre de l'équipe
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="poste">Poste</Label>
                    <Input
                      id="poste"
                      value={formData.poste}
                      onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                      placeholder="Ex: Chef de chantier"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialite">Spécialité</Label>
                    <Input
                      id="specialite"
                      value={formData.specialite}
                      onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                      placeholder="Ex: Électricité"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taux_horaire">Taux horaire (€/h)</Label>
                  <Input
                    id="taux_horaire"
                    type="number"
                    step="0.01"
                    value={formData.taux_horaire}
                    onChange={(e) => setFormData({ ...formData, taux_horaire: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="charges_salariales">Charges salariales (%)</Label>
                    <Input
                      id="charges_salariales"
                      type="number"
                      step="0.01"
                      value={formData.charges_salariales}
                      onChange={(e) => setFormData({ ...formData, charges_salariales: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charges_patronales">Charges patronales (%)</Label>
                    <Input
                      id="charges_patronales"
                      type="number"
                      step="0.01"
                      value={formData.charges_patronales}
                      onChange={(e) => setFormData({ ...formData, charges_patronales: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {editingMembre ? "Mettre à jour" : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Coût total de l'équipe
          </CardTitle>
          <CardDescription>
            Coût journalier de l'équipe complète (membres actifs uniquement)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black font-mono">
            {cout_journalier_equipe.toFixed(2)} €<span className="text-lg text-muted-foreground">/jour</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des membres</CardTitle>
          <CardDescription>
            {membres.filter(m => m.actif).length} membre(s) actif(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead className="text-right">Taux horaire</TableHead>
                <TableHead className="text-right">Coût/jour</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membres.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun membre dans l'équipe. Ajoutez votre premier membre.
                  </TableCell>
                </TableRow>
              ) : (
                membres.map((membre) => (
                  <TableRow key={membre.id}>
                    <TableCell className="font-medium">
                      {membre.prenom} {membre.nom}
                    </TableCell>
                    <TableCell>{membre.poste}</TableCell>
                    <TableCell>{membre.specialite}</TableCell>
                    <TableCell className="text-right font-mono">{membre.taux_horaire.toFixed(2)} €</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {calculerCoutJournalierMembre(membre).toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Badge variant={membre.actif ? "default" : "secondary"}>
                        {membre.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(membre)}
                          disabled={!membre.actif}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(membre.id)}
                          disabled={!membre.actif}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
