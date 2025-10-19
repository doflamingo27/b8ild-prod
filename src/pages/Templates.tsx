import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { TemplateManager } from "@/components/TemplateManager";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Templates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: entreprise } = useQuery({
    queryKey: ["entreprise", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("entreprises")
        .select("*")
        .eq("proprietaire_user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleUseTemplate = async (template: any) => {
    toast({
      title: "Template sélectionné",
      description: "Redirection vers la création de chantier...",
    });
    
    // Stocker le template dans sessionStorage pour l'utiliser lors de la création
    sessionStorage.setItem("selectedTemplate", JSON.stringify(template));
    navigate("/projects/new");
  };

  if (!entreprise) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Templates de chantiers</h1>
          <p className="text-muted-foreground">
            Gagnez du temps en créant vos chantiers à partir de templates pré-configurés
          </p>
        </div>

        <TemplateManager
          entrepriseId={entreprise.id}
          onUseTemplate={handleUseTemplate}
        />
      </div>
    </DashboardLayout>
  );
};

export default Templates;