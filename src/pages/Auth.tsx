import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const signUpSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  prenom: z.string().min(2, { message: "Le prénom doit contenir au moins 2 caractères" }),
  nom: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  nomEntreprise: z.string().min(2, { message: "Le nom de l'entreprise est requis" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    prenom: "",
    nom: "",
    nomEntreprise: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (mode === "signup") {
        const validation = signUpSchema.safeParse(formData);
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error: signUpError } = await signUp(
          formData.email,
          formData.password,
          {
            prenom: formData.prenom,
            nom: formData.nom,
          }
        );

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast({
              title: "Erreur",
              description: "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erreur lors de l'inscription",
              description: signUpError.message,
              variant: "destructive",
            });
          }
          setLoading(false);
          return;
        }

        // Create company after signup
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          const { error: companyError } = await supabase
            .from('entreprises')
            .insert({
              nom: formData.nomEntreprise,
              proprietaire_user_id: newUser.id,
            });

          if (companyError) {
            console.error("Error creating company:", companyError);
          }
        }

        toast({
          title: "Bienvenue sur B8ild !",
          description: "Votre compte a été créé avec succès.",
        });
        navigate("/dashboard");
      } else {
        const validation = signInSchema.safeParse(formData);
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error: signInError } = await signIn(formData.email, formData.password);

        if (signInError) {
          if (signInError.message.includes("Invalid login credentials")) {
            toast({
              title: "Erreur",
              description: "Email ou mot de passe incorrect.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erreur de connexion",
              description: signInError.message,
              variant: "destructive",
            });
          }
          setLoading(false);
          return;
        }

        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur B8ild !",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xl font-black text-primary-foreground">B8</span>
            </div>
            <span className="text-2xl font-black text-foreground">ild</span>
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Connectez-vous pour accéder à votre tableau de bord"
              : "Commencez votre essai gratuit de 7 jours"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      name="prenom"
                      type="text"
                      value={formData.prenom}
                      onChange={handleChange}
                      disabled={loading}
                      className={errors.prenom ? "border-destructive" : ""}
                    />
                    {errors.prenom && (
                      <p className="text-xs text-destructive">{errors.prenom}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      name="nom"
                      type="text"
                      value={formData.nom}
                      onChange={handleChange}
                      disabled={loading}
                      className={errors.nom ? "border-destructive" : ""}
                    />
                    {errors.nom && (
                      <p className="text-xs text-destructive">{errors.nom}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomEntreprise">Nom de l'entreprise</Label>
                  <Input
                    id="nomEntreprise"
                    name="nomEntreprise"
                    type="text"
                    value={formData.nomEntreprise}
                    onChange={handleChange}
                    disabled={loading}
                    className={errors.nomEntreprise ? "border-destructive" : ""}
                  />
                  {errors.nomEntreprise && (
                    <p className="text-xs text-destructive">{errors.nomEntreprise}</p>
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@exemple.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              {mode === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline font-medium"
                    disabled={loading}
                  >
                    Créer un compte
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline font-medium"
                    disabled={loading}
                  >
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;

import { supabase } from "@/integrations/supabase/client";
