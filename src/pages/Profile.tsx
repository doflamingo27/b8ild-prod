import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building, Upload, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [entreprise, setEntreprise] = useState({
    nom: "",
    adresse: "",
    siret: "",
    specialite_metier: "",
    logo_url: "",
  });

  useEffect(() => {
    if (user) {
      loadEntreprise();
    }
  }, [user]);

  const loadEntreprise = async () => {
    try {
      const { data, error } = await supabase
        .from("entreprises")
        .select("*")
        .eq("proprietaire_user_id", user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setEntreprise(data);
      }
    } catch (error: any) {
      console.error("Erreur chargement entreprise:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("entreprises")
        .update({
          nom: entreprise.nom,
          adresse: entreprise.adresse,
          siret: entreprise.siret,
          specialite_metier: entreprise.specialite_metier,
        })
        .eq("proprietaire_user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Les informations de votre entreprise ont été enregistrées.",
      });
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("entreprises")
        .update({ logo_url: publicUrl })
        .eq("proprietaire_user_id", user?.id);

      if (updateError) throw updateError;

      setEntreprise({ ...entreprise, logo_url: publicUrl });

      toast({
        title: "Logo mis à jour",
        description: "Votre logo a été téléchargé avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-black text-gradient-primary">Profil Entreprise</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gérez les informations de votre entreprise
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-black">
              <Building className="h-6 w-6 text-primary" />
              Logo de l'entreprise
            </CardTitle>
            <CardDescription className="text-base">
              Téléchargez le logo de votre entreprise (PNG, JPG - max 2MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-28 w-28 border-4 border-border shadow-lg">
                <AvatarImage src={entreprise.logo_url} alt={entreprise.nom} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-black">
                  {entreprise.nom?.[0]?.toUpperCase() || "E"}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all font-semibold">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    <span>
                      {uploading ? "Téléchargement..." : "Changer le logo"}
                    </span>
                  </div>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Informations entreprise</CardTitle>
            <CardDescription className="text-base">
              Mettez à jour les informations de votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom" className="font-semibold">Nom de l'entreprise</Label>
                <Input
                  id="nom"
                  value={entreprise.nom}
                  onChange={(e) => setEntreprise({ ...entreprise, nom: e.target.value })}
                  placeholder="Ex: Bâtiment Pro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siret" className="font-semibold">SIRET</Label>
                <Input
                  id="siret"
                  value={entreprise.siret}
                  onChange={(e) => setEntreprise({ ...entreprise, siret: e.target.value })}
                  placeholder="Ex: 123 456 789 00010"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialite" className="font-semibold">Spécialité métier</Label>
                <Input
                  id="specialite"
                  value={entreprise.specialite_metier}
                  onChange={(e) => setEntreprise({ ...entreprise, specialite_metier: e.target.value })}
                  placeholder="Ex: Électricité, Plomberie, Maçonnerie..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse" className="font-semibold">Adresse</Label>
                <Input
                  id="adresse"
                  value={entreprise.adresse}
                  onChange={(e) => setEntreprise({ ...entreprise, adresse: e.target.value })}
                  placeholder="Ex: 123 Rue du Bâtiment, 75001 Paris"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full font-bold" size="lg">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer les modifications
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
