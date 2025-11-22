import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, User, Calendar, Clock, Euro, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AffectationForm from "./AffectationForm";
import { useAffectationsRealtime } from "@/hooks/useAffectationsRealtime";

interface AffectationsListProps {
  chantierId: string;
  entrepriseId: string;
}

const AffectationsList = ({ chantierId, entrepriseId }: AffectationsListProps) => {
  const { toast } = useToast();
  const [affectations, setAffectations] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [equipes, setEquipes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAffectation, setEditingAffectation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [chantierId]);

  // ✨ Subscription Realtime pour les affectations
  const handleRealtimeChange = useCallback(() => {
    console.log('[AffectationsList] Changement détecté, rechargement...');
    loadData();
  }, []);

  useAffectationsRealtime(chantierId, handleRealtimeChange);

  const loadData = async () => {
    setLoading(true);
    try {
      const [affectationsRes, membresRes, equipesRes] = await Promise.all([
        supabase
          .from("affectations_chantiers")
          .select("*")
          .eq("chantier_id", chantierId)
          .order("date_debut", { ascending: false }),
        supabase
          .from("membres_equipe")
          .select("*")
          .eq("entreprise_id", entrepriseId),
        supabase
          .from("equipes")
          .select("*")
          .eq("entreprise_id", entrepriseId),
      ]);

      setAffectations(affectationsRes.data || []);
      setMembres(membresRes.data || []);
      setEquipes(equipesRes.data || []);
    } catch (error) {
      console.error("Erreur chargement affectations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette affectation ?")) return;

    try {
      const { error } = await supabase
        .from("affectations_chantiers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Affectation supprimée" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (affectation: any) => {
    setEditingAffectation(affectation);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingAffectation(null);
    loadData();
  };

  // Grouper par membre/équipe
  const groupedAffectations = affectations.reduce((acc, aff) => {
    const key = aff.membre_equipe_id || aff.equipe_id || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(aff);
    return acc;
  }, {} as Record<string, any[]>);

  type AffectationGroup = [string, any[]];

  // Calculer les totaux
  const totalCout = affectations.reduce((sum, aff) => {
    const cout = aff.jours_travailles * aff.heures_par_jour * 
      (aff.taux_horaire_specifique || 0) * 
      (1 + (aff.charges_salariales_pct || 0) / 100 + (aff.charges_patronales_pct || 0) / 100);
    return sum + cout;
  }, 0);

  const totalJours = affectations.reduce((sum, aff) => sum + aff.jours_travailles, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Équipe affectée
            </CardTitle>
            <CardDescription>
              Gérez les périodes de travail des membres et équipes
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingAffectation(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Affecter un membre/équipe
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : Object.keys(groupedAffectations).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune affectation</p>
            <p className="text-sm">Affectez des membres ou équipes pour commencer</p>
          </div>
        ) : (
          <>
            {(Object.entries(groupedAffectations) as AffectationGroup[]).map(([key, affs]) => {
              const isMembre = affs[0].membre_equipe_id;
              const entity = isMembre 
                ? membres.find(m => m.id === affs[0].membre_equipe_id)
                : equipes.find(e => e.id === affs[0].equipe_id);

              if (!entity) return null;

              const totalJoursMembre = affs.reduce((sum, a) => sum + a.jours_travailles, 0);
              const totalCoutMembre = affs.reduce((sum, aff) => {
                const cout = aff.jours_travailles * aff.heures_par_jour * 
                  (aff.taux_horaire_specifique || 0) * 
                  (1 + (aff.charges_salariales_pct || 0) / 100 + (aff.charges_patronales_pct || 0) / 100);
                return sum + cout;
              }, 0);

              return (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isMembre ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      <div>
                        <p className="font-semibold">
                          {isMembre ? `${entity.prenom} ${entity.nom}` : entity.nom}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isMembre ? entity.poste : entity.specialite}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">TOTAL</p>
                      <p className="font-bold">{totalJoursMembre} jours | {totalCoutMembre.toFixed(2)} €</p>
                    </div>
                  </div>

                  <div className="space-y-2 pl-7">
                    {affs.map((aff) => (
                      <div key={aff.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(aff.date_debut), "dd/MM", { locale: fr })} → {format(new Date(aff.date_fin), "dd/MM", { locale: fr })}
                            </span>
                          </div>
                          <Badge variant="secondary">
                            {aff.jours_travailles}j
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{aff.heures_par_jour}h/j</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4" />
                            <span>
                              {(aff.jours_travailles * aff.heures_par_jour * 
                                (aff.taux_horaire_specifique || 0) * 
                                (1 + (aff.charges_salariales_pct || 0) / 100 + (aff.charges_patronales_pct || 0) / 100)
                              ).toFixed(2)} €
                            </span>
                          </div>
                          {aff.notes && (
                            <span className="text-muted-foreground italic">"{aff.notes}"</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(aff)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(aff.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-7"
                    onClick={() => {
                      setEditingAffectation({ 
                        membre_equipe_id: isMembre ? entity.id : null,
                        equipe_id: !isMembre ? entity.id : null,
                      });
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter période
                  </Button>
                </div>
              );
            })}

            <div className="border-t pt-4 flex items-center justify-between text-lg font-bold">
              <span>💰 COÛT TOTAL MAIN D'ŒUVRE:</span>
              <span className="text-primary">{totalCout.toFixed(2)} €</span>
            </div>
            <p className="text-sm text-muted-foreground text-right">
              {totalJours} jours-homme travaillés
            </p>
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAffectation?.id ? "Modifier l'affectation" : "Affecter un membre/équipe"}
              </DialogTitle>
              <DialogDescription>
                Définissez la période et les conditions de travail
              </DialogDescription>
            </DialogHeader>
            <AffectationForm
              chantierId={chantierId}
              entrepriseId={entrepriseId}
              affectation={editingAffectation}
              onSuccess={handleSuccess}
              onCancel={() => { setDialogOpen(false); setEditingAffectation(null); }}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AffectationsList;
