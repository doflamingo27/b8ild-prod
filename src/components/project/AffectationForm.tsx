import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Calculator } from "lucide-react";
import { format, differenceInBusinessDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AffectationFormProps {
  chantierId: string;
  entrepriseId: string;
  affectation?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const AffectationForm = ({ chantierId, entrepriseId, affectation, onSuccess, onCancel }: AffectationFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [membres, setMembres] = useState<any[]>([]);
  const [equipes, setEquipes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<"membre" | "equipe">(affectation?.membre_equipe_id ? "membre" : "equipe");
  const [formData, setFormData] = useState({
    membre_equipe_id: affectation?.membre_equipe_id || "",
    equipe_id: affectation?.equipe_id || "",
    date_debut: affectation?.date_debut ? new Date(affectation.date_debut) : new Date(),
    date_fin: affectation?.date_fin ? new Date(affectation.date_fin) : new Date(),
    jours_travailles: affectation?.jours_travailles || 1,
    heures_par_jour: affectation?.heures_par_jour || 7,
    taux_horaire_specifique: affectation?.taux_horaire_specifique || "",
    useTauxSpecifique: !!affectation?.taux_horaire_specifique,
    notes: affectation?.notes || "",
  });

  const [calculatedCost, setCalculatedCost] = useState(0);

  useEffect(() => {
    loadData();
  }, [entrepriseId]);

  useEffect(() => {
    calculateCost();
  }, [formData, membres, equipes, selectedType]);

  const loadData = async () => {
    try {
      const [membresRes, equipesRes] = await Promise.all([
        supabase
          .from("membres_equipe")
          .select("*")
          .eq("entreprise_id", entrepriseId)
          .eq("actif", true)
          .order("nom"),
        supabase
          .from("equipes")
          .select("*")
          .eq("entreprise_id", entrepriseId)
          .order("nom"),
      ]);

      setMembres(membresRes.data || []);
      setEquipes(equipesRes.data || []);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    }
  };

  const calculateCost = () => {
    const { jours_travailles, heures_par_jour, taux_horaire_specifique, useTauxSpecifique, membre_equipe_id, equipe_id } = formData;

    let totalCout = 0;

    if (selectedType === "membre" && membre_equipe_id) {
      const membre = membres.find(m => m.id === membre_equipe_id);
      if (membre) {
        const tauxHoraire = useTauxSpecifique && taux_horaire_specifique 
          ? parseFloat(taux_horaire_specifique) 
          : membre.taux_horaire;
        const charges = 1 + (membre.charges_salariales / 100) + (membre.charges_patronales / 100);
        totalCout = jours_travailles * heures_par_jour * tauxHoraire * charges;
      }
    } else if (selectedType === "equipe" && equipe_id) {
      // Pour une équipe, calculer le coût total de tous les membres
      const membresEquipe = membres.filter(m => m.equipe_id === equipe_id);
      totalCout = membresEquipe.reduce((sum, membre) => {
        const tauxHoraire = membre.taux_horaire;
        const charges = 1 + (membre.charges_salariales / 100) + (membre.charges_patronales / 100);
        const coutMembre = jours_travailles * heures_par_jour * tauxHoraire * charges;
        return sum + coutMembre;
      }, 0);
    }

    setCalculatedCost(totalCout);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedType === "membre") {
        // Affectation d'un membre individuel
        const membre = membres.find(m => m.id === formData.membre_equipe_id);
        if (!membre) throw new Error("Membre non trouvé");

        const dataToSubmit = {
          chantier_id: chantierId,
          membre_equipe_id: formData.membre_equipe_id,
          equipe_id: formData.equipe_id || null,
          date_debut: format(formData.date_debut, "yyyy-MM-dd"),
          date_fin: format(formData.date_fin, "yyyy-MM-dd"),
          jours_travailles: formData.jours_travailles,
          heures_par_jour: formData.heures_par_jour,
          taux_horaire_specifique: formData.useTauxSpecifique && formData.taux_horaire_specifique 
            ? parseFloat(formData.taux_horaire_specifique) 
            : membre.taux_horaire,
          charges_salariales_pct: membre.charges_salariales,
          charges_patronales_pct: membre.charges_patronales,
          notes: formData.notes,
        };

        if (affectation) {
          const { error } = await supabase
            .from("affectations_chantiers")
            .update(dataToSubmit)
            .eq("id", affectation.id);

          if (error) throw error;
          toast({ title: "Affectation modifiée" });
        } else {
          const { error } = await supabase
            .from("affectations_chantiers")
            .insert(dataToSubmit);

          if (error) throw error;
          toast({ title: "Affectation créée" });
        }
      } else {
        // Affectation d'une équipe complète - créer une affectation pour chaque membre
        const membresEquipe = membres.filter(m => m.equipe_id === formData.equipe_id);
        
        if (membresEquipe.length === 0) {
          throw new Error("Cette équipe n'a aucun membre. Ajoutez des membres à l'équipe d'abord.");
        }

        const affectationsToInsert = membresEquipe.map(membre => ({
          chantier_id: chantierId,
          membre_equipe_id: membre.id,
          equipe_id: formData.equipe_id,
          date_debut: format(formData.date_debut, "yyyy-MM-dd"),
          date_fin: format(formData.date_fin, "yyyy-MM-dd"),
          jours_travailles: formData.jours_travailles,
          heures_par_jour: formData.heures_par_jour,
          taux_horaire_specifique: membre.taux_horaire,
          charges_salariales_pct: membre.charges_salariales,
          charges_patronales_pct: membre.charges_patronales,
          notes: formData.notes,
        }));

        const { error } = await supabase
          .from("affectations_chantiers")
          .insert(affectationsToInsert);

        if (error) throw error;
        toast({ 
          title: `${membresEquipe.length} membre${membresEquipe.length > 1 ? 's' : ''} affecté${membresEquipe.length > 1 ? 's' : ''}`,
          description: `L'équipe a été affectée avec succès`
        });
      }

      onSuccess();
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

  const autoCalculateJours = () => {
    const jours = differenceInBusinessDays(formData.date_fin, formData.date_debut) + 1;
    setFormData({ ...formData, jours_travailles: Math.max(1, jours) });
  };

  const selectedMembre = membres.find(m => m.id === formData.membre_equipe_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Type d'affectation</Label>
        <RadioGroup value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="membre" id="type-membre" />
            <Label htmlFor="type-membre">Membre individuel</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="equipe" id="type-equipe" />
            <Label htmlFor="type-equipe">Équipe complète</Label>
          </div>
        </RadioGroup>
      </div>

      {selectedType === "membre" ? (
        <div className="space-y-2">
          <Label htmlFor="membre">Membre *</Label>
          <Select
            value={formData.membre_equipe_id}
            onValueChange={(value) => setFormData({ ...formData, membre_equipe_id: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un membre" />
            </SelectTrigger>
            <SelectContent>
              {membres.map((membre) => (
                <SelectItem key={membre.id} value={membre.id}>
                  {membre.prenom} {membre.nom} - {membre.poste} ({membre.taux_horaire}€/h)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="equipe">Équipe *</Label>
          <Select
            value={formData.equipe_id}
            onValueChange={(value) => setFormData({ ...formData, equipe_id: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une équipe" />
            </SelectTrigger>
            <SelectContent>
              {equipes.map((equipe) => (
                <SelectItem key={equipe.id} value={equipe.id}>
                  {equipe.nom} {equipe.specialite && `- ${equipe.specialite}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date début *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.date_debut && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date_debut ? format(formData.date_debut, "PPP", { locale: fr }) : "Choisir"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date_debut}
                onSelect={(date) => date && setFormData({ ...formData, date_debut: date })}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Date fin *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.date_fin && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date_fin ? format(formData.date_fin, "PPP", { locale: fr }) : "Choisir"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date_fin}
                onSelect={(date) => date && setFormData({ ...formData, date_fin: date })}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jours">Jours travaillés *</Label>
          <div className="flex gap-2">
            <Input
              id="jours"
              type="number"
              step="0.5"
              min="0.5"
              value={formData.jours_travailles}
              onChange={(e) => setFormData({ ...formData, jours_travailles: parseFloat(e.target.value) })}
              required
            />
            <Button type="button" variant="outline" size="icon" onClick={autoCalculateJours} title="Calculer automatiquement">
              <Calculator className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="heures">Heures par jour *</Label>
          <Input
            id="heures"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={formData.heures_par_jour}
            onChange={(e) => setFormData({ ...formData, heures_par_jour: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>

      {selectedType === "membre" && selectedMembre && (
        <div className="space-y-2">
          <Label>Taux horaire</Label>
          <RadioGroup
            value={formData.useTauxSpecifique ? "specifique" : "normal"}
            onValueChange={(value) => setFormData({ ...formData, useTauxSpecifique: value === "specifique" })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="normal" id="taux-normal" />
              <Label htmlFor="taux-normal">Utiliser taux du membre ({selectedMembre.taux_horaire}€/h)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specifique" id="taux-specifique" />
              <Label htmlFor="taux-specifique">Taux spécifique:</Label>
              {formData.useTauxSpecifique && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="€/h"
                  value={formData.taux_horaire_specifique}
                  onChange={(e) => setFormData({ ...formData, taux_horaire_specifique: e.target.value })}
                  className="w-32"
                />
              )}
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Ex: Semaine de finition, Travaux gros-œuvre..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold">COÛT CALCULÉ:</span>
          <span className="text-2xl font-bold text-primary">
            {calculatedCost.toFixed(2)} €
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : affectation ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
};

export default AffectationForm;
