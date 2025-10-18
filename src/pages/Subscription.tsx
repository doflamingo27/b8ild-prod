import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Subscription = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      name: "Gratuit",
      price: "0€",
      period: "7 jours d'essai",
      features: [
        "1 chantier maximum",
        "Toutes les fonctionnalités",
        "Support par email",
      ],
      isPopular: false,
    },
    {
      name: "Pro",
      price: "49€",
      period: "/mois",
      features: [
        "Chantiers illimités",
        "Calculs automatiques",
        "Alertes en temps réel",
        "Exports PDF/CSV",
        "Support prioritaire",
      ],
      isPopular: true,
    },
    {
      name: "Annuel",
      price: "490€",
      period: "/an",
      features: [
        "Tout du plan Pro",
        "-2 mois offerts",
        "Support premium",
        "Accès anticipé aux nouvelles fonctionnalités",
      ],
      isPopular: false,
    },
  ];

  const handleSubscribe = async (planName: string) => {
    setLoading(true);
    
    try {
      // TODO: Intégrer Stripe Checkout
      toast({
        title: "En cours de développement",
        description: "L'intégration Stripe sera disponible prochainement",
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Mon Abonnement
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre abonnement et votre facturation
        </p>
      </div>

      {/* Statut actuel */}
      <Card>
        <CardHeader>
          <CardTitle>Statut actuel</CardTitle>
          <CardDescription>Votre abonnement en cours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">Plan Gratuit (Essai)</p>
              <p className="text-sm text-muted-foreground">
                7 jours restants
              </p>
            </div>
            <Badge>Essai</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Plans disponibles */}
      <div>
        <h2 className="text-2xl font-black mb-4">Plans disponibles</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={plan.isPopular ? "border-accent shadow-glow" : ""}
            >
              <CardHeader>
                {plan.isPopular && (
                  <Badge className="w-fit mb-2 bg-accent text-accent-foreground">
                    <Zap className="h-3 w-3 mr-1" />
                    Populaire
                  </Badge>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-black text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loading || plan.name === "Gratuit"}
                >
                  {plan.name === "Gratuit" ? "Plan actuel" : "Choisir ce plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Informations supplémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de paiement</CardTitle>
          <CardDescription>
            Gérez vos informations de paiement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucune carte enregistrée pour le moment.
          </p>
          <Button variant="outline" className="mt-4">
            <CreditCard className="mr-2 h-4 w-4" />
            Ajouter une carte
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
