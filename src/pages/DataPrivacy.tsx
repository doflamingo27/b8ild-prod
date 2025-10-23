import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DataPrivacy = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExportData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data");

      if (error) throw error;

      // Créer un lien de téléchargement pour le fichier JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Succès",
        description: "Vos données ont été exportées",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter vos données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");

      if (error) throw error;

      toast({
        title: "Compte supprimé",
        description: "Vos données ont été anonymisées",
      });

      // Déconnexion automatique
      await supabase.auth.signOut();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer votre compte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">Confidentialité et données</h1>
          <p className="text-muted-foreground">
            Gérez vos données personnelles conformément au RGPD
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Vos droits RGPD
            </CardTitle>
            <CardDescription>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous
              disposez des droits suivants sur vos données personnelles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Droit d'accès */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-1">Droit d'accès</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Téléchargez une copie complète de toutes vos données personnelles stockées
                  sur la plateforme.
                </p>
              </div>
              <Button onClick={handleExportData} disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger mes données
              </Button>
            </div>

            {/* Droit à l'effacement */}
            <div className="space-y-3 pt-6 border-t">
              <div>
                <h3 className="font-semibold mb-1 text-destructive">
                  Droit à l'effacement ("droit à l'oubli")
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Supprimez définitivement votre compte et anonymisez toutes vos données.
                  Cette action est irréversible.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={loading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer mon compte
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Cette action est <span className="font-bold">irréversible</span>.
                      </p>
                      <p>
                        Votre compte sera définitivement supprimé et toutes vos données
                        personnelles seront anonymisées. Les données de chantiers seront
                        conservées de manière anonyme pour des raisons légales et comptables.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Oui, supprimer mon compte
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Informations supplémentaires */}
            <div className="pt-6 border-t space-y-4">
              <h3 className="font-semibold">Informations complémentaires</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong>Conservation des données :</strong> Vos données sont conservées
                  tant que votre compte est actif. Après suppression, certaines données
                  peuvent être conservées de manière anonyme pour des obligations légales.
                </p>
                <p>
                  <strong>Exercice de vos droits :</strong> Pour toute question ou demande
                  concernant vos données, contactez-nous à privacy@b8ild.com
                </p>
                <p>
                  <strong>Sécurité :</strong> Vos données sont chiffrées et stockées de
                  manière sécurisée. Nous ne partageons jamais vos données avec des tiers
                  sans votre consentement explicite.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DataPrivacy;