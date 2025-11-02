import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCalculations } from "@/hooks/useCalculations";
import { useChantierMetrics } from "@/hooks/useChantierMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Building, Users, FileText, Receipt, 
  AlertTriangle, TrendingUp, Calendar, MapPin, Edit, Trash2 
} from "lucide-react";
import QuoteManager from "@/components/project/QuoteManager";
import InvoiceManager from "@/components/project/InvoiceManager";
import TeamAssignment from "@/components/project/TeamAssignment";
import ExpensesManager from "@/components/project/ExpensesManager";
import ExportManager from "@/components/ExportManager";
import ChantierKpis from "@/components/ChantierKpis";
import ChantierCharts from "@/components/ChantierCharts";

interface Chantier {
  id: string;
  nom_chantier: string;
  client: string;
  adresse: string;
  description: string;
  duree_estimee: number;
  statut: string;
  date_creation: string;
  date_debut: string | null;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Hook temps réel pour les métriques
  const { metrics, loading: metricsLoading } = useChantierMetrics(id || '');
  
  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [devis, setDevis] = useState<any>(null);
  const [factures, setFactures] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [frais, setFrais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nom_chantier: "",
    client: "",
    adresse: "",
    duree_estimee: 30,
    description: "",
    statut: "actif",
  });

  // Calculs automatiques
  const totalFactures = factures.reduce((sum, f) => sum + Number(f.montant_ht), 0);
  const totalFrais = frais.reduce((sum, f) => sum + Number(f.montant_total), 0);
  const coutsFixes = totalFactures + totalFrais;

  const calculations = useCalculations({
    membres,
    budget_devis: devis?.montant_ttc || 0,
    couts_fixes: coutsFixes,
    date_debut: chantier?.date_debut,
  });

  useEffect(() => {
    if (id && user) {
      loadProjectData();
    }
  }, [id, user]);

  const loadProjectData = async () => {
    try {
      setLoading(true);

      // Charger le chantier
      const { data: chantierData, error: chantierError } = await supabase
        .from("chantiers")
        .select("*")
        .eq("id", id)
        .single();

      if (chantierError) throw chantierError;
      setChantier(chantierData);

      // Charger le devis
      const { data: devisData } = await supabase
        .from("devis")
        .select("*")
        .eq("chantier_id", id)
        .maybeSingle();
      setDevis(devisData);

      // Charger les factures
      const { data: facturesData } = await supabase
        .from("factures_fournisseurs")
        .select("*")
        .eq("chantier_id", id);
      setFactures(facturesData || []);

      // Charger les membres affectés avec leurs jours
      const { data: equipeData } = await supabase
        .from("equipe_chantier")
        .select("*, membres_equipe(*)")
        .eq("chantier_id", id);
      
      const membresAffectes = equipeData?.map(e => ({
        ...e.membres_equipe,
        jours_travailles: e.jours_travailles || 0
      })) || [];
      setMembres(membresAffectes);

      // Charger les frais
      const { data: fraisData } = await supabase
        .from("frais_chantier")
        .select("*")
        .eq("chantier_id", id);
      setFrais(fraisData || []);

    } catch (error: any) {
      console.error("Erreur chargement projet:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du chantier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const { statut, rentabilite_pct } = calculations;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      warning: "secondary",
      alert: "outline",
      danger: "destructive",
    };
    
    const labels: Record<string, string> = {
      success: "Excellent",
      warning: "Bon",
      alert: "Attention",
      danger: "Déficit",
    };

    return (
      <Badge variant={variants[statut]}>
        {labels[statut]} - {rentabilite_pct.toFixed(1)}%
      </Badge>
    );
  };

  const handleUpdateChantier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("chantiers")
        .update(editFormData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Chantier modifié avec succès",
      });

      setEditDialogOpen(false);
      loadProjectData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteChantier = async () => {
    try {
      const { error } = await supabase
        .from("chantiers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Chantier supprimé avec succès",
      });

      navigate("/projects");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = () => {
    if (chantier) {
      setEditFormData({
        nom_chantier: chantier.nom_chantier,
        client: chantier.client,
        adresse: chantier.adresse,
        duree_estimee: chantier.duree_estimee,
        description: chantier.description || "",
        statut: chantier.statut,
      });
      setEditDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-16 pb-16 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg font-medium">Chargement du chantier...</p>
        </CardContent>
      </Card>
    );
  }

  if (!chantier) {
    return (
      <Card className="card-premium">
        <CardContent className="pt-16 pb-16 text-center">
          <Building className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl font-semibold text-muted-foreground mb-4">Chantier introuvable</p>
          <Button onClick={() => navigate("/projects")} variant="primary" size="lg" className="hover-lift">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour aux chantiers
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <Button onClick={() => navigate("/projects")} variant="ghost" className="mb-6 hover-lift">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux chantiers
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
              <Building className="h-9 w-9 text-primary" />
              {chantier.nom_chantier}
            </h1>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {chantier.client} - {chantier.adresse}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
            <ExportManager
              chantierId={id!}
              chantierData={chantier}
              membres={membres}
              devis={devis}
              factures={factures}
              frais={frais}
              calculations={calculations}
            />
          </div>
        </div>
      </div>

      {/* Métriques temps réel */}
      {!metricsLoading && metrics && (
        <>
          <ChantierKpis metrics={metrics} />
          <ChantierCharts chantierId={id!} />
        </>
      )}

      {metricsLoading && (
        <Card className="card-premium">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des métriques...</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs de gestion */}
      <Card className="card-premium">
        <Tabs defaultValue="quote" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-muted/50 p-1">
            <TabsTrigger value="quote" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <FileText className="h-5 w-5 mr-2" />
              Devis
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Receipt className="h-5 w-5 mr-2" />
              Factures
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Users className="h-5 w-5 mr-2" />
              Équipe
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Receipt className="h-5 w-5 mr-2" />
              Frais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quote" className="mt-6">
            <QuoteManager chantierId={id!} devis={devis} onUpdate={loadProjectData} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <InvoiceManager chantierId={id!} factures={factures} onUpdate={loadProjectData} />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <TeamAssignment 
              chantierId={id!} 
              membres={membres} 
              onUpdate={loadProjectData}
              coutJournalier={calculations.cout_journalier_equipe}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpensesManager chantierId={id!} frais={frais} onUpdate={loadProjectData} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Dialog de modification */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleUpdateChantier}>
            <DialogHeader>
              <DialogTitle>Modifier le chantier</DialogTitle>
              <DialogDescription>
                Modifiez les informations du chantier
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom du chantier</Label>
                <Input
                  id="edit-nom"
                  value={editFormData.nom_chantier}
                  onChange={(e) => setEditFormData({ ...editFormData, nom_chantier: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client">Client</Label>
                <Input
                  id="edit-client"
                  value={editFormData.client}
                  onChange={(e) => setEditFormData({ ...editFormData, client: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-adresse">Adresse</Label>
                <Input
                  id="edit-adresse"
                  value={editFormData.adresse}
                  onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-duree">Durée estimée (jours)</Label>
                <Input
                  id="edit-duree"
                  type="number"
                  value={editFormData.duree_estimee}
                  onChange={(e) => setEditFormData({ ...editFormData, duree_estimee: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le chantier "{chantier?.nom_chantier}" 
              et toutes ses données associées (devis, factures, équipe, frais) 
              seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChantier} className="bg-destructive hover:bg-destructive/90">
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetail;
