import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";

interface MemberTeamAssignmentProps {
  membreId: string;
  currentEquipeId?: string | null;
  entrepriseId: string;
  onUpdate: () => void;
}

const MemberTeamAssignment = ({ membreId, currentEquipeId, entrepriseId, onUpdate }: MemberTeamAssignmentProps) => {
  const { toast } = useToast();
  const [equipes, setEquipes] = useState<any[]>([]);
  const [selectedEquipeId, setSelectedEquipeId] = useState<string | null>(currentEquipeId || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEquipes();
  }, [entrepriseId]);

  const loadEquipes = async () => {
    try {
      const { data, error } = await supabase
        .from("equipes")
        .select("*")
        .eq("entreprise_id", entrepriseId)
        .order("nom");

      if (error) throw error;
      setEquipes(data || []);
    } catch (error: any) {
      console.error("Erreur chargement équipes:", error);
    }
  };

  const handleAssign = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("membres_equipe")
        .update({ equipe_id: selectedEquipeId })
        .eq("id", membreId);

      if (error) throw error;

      toast({
        title: selectedEquipeId ? "Membre affecté à l'équipe" : "Membre retiré de l'équipe",
      });
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

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground">Équipe:</Label>
      <Select
        value={selectedEquipeId || "none"}
        onValueChange={(value) => setSelectedEquipeId(value === "none" ? null : value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Aucune équipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucune équipe</SelectItem>
          {equipes.map((equipe) => (
            <SelectItem key={equipe.id} value={equipe.id}>
              {equipe.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedEquipeId !== currentEquipeId && (
        <Button
          size="sm"
          onClick={handleAssign}
          disabled={loading}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Affecter
        </Button>
      )}
    </div>
  );
};

export default MemberTeamAssignment;
