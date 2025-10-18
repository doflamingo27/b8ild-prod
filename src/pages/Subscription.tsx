import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, Zap, Loader2 } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

const Subscription = () => {
  const { subscribed, planName, subscriptionEnd, loading, openCheckout, openCustomerPortal } = useSubscription();

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
      priceId: "price_1SJg6KQbGfkLt4CuZqQBG9RQ",
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
      priceId: "price_1SJg6LQbGfkLt4Cui1lUWvcf",
      features: [
        "Tout du plan Pro",
        "-2 mois offerts",
        "Support premium",
        "Accès anticipé aux nouvelles fonctionnalités",
      ],
      isPopular: false,
    },
  ];

  const handleSubscribe = async (priceId: string) => {
    await openCheckout(priceId);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
          <CreditCard className="h-9 w-9 text-primary" />
          Mon Abonnement
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gérez votre abonnement et votre facturation
        </p>
      </div>

      {/* Statut actuel */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Statut actuel</CardTitle>
          <CardDescription className="text-base">Votre abonnement en cours</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black">Plan {planName}</p>
                  {subscriptionEnd && (
                    <p className="text-base text-muted-foreground mt-1">
                      Expire le {new Date(subscriptionEnd).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <Badge 
                  variant={subscribed ? "default" : "secondary"}
                  className="text-base font-bold px-4 py-2"
                >
                  {subscribed ? "Actif" : "Essai"}
                </Badge>
              </div>
              {subscribed && (
                <Button variant="outline" className="w-full font-bold" size="lg" onClick={openCustomerPortal}>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Gérer mon abonnement
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans disponibles */}
      <div>
        <h2 className="text-3xl font-black mb-6">Plans disponibles</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card 
              key={plan.name}
              className={`card-premium ${plan.isPopular ? "border-accent shadow-xl shadow-accent/20 scale-105" : ""} animate-fade-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                {plan.isPopular && (
                  <Badge className="w-fit mb-3 bg-gradient-accent text-primary font-bold px-3 py-1.5">
                    <Zap className="h-4 w-4 mr-1" />
                    Populaire
                  </Badge>
                )}
                <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                <CardDescription className="text-base mt-2">
                  <span className="text-4xl font-black text-gradient-primary block">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full font-bold ${plan.isPopular ? "hover-glow" : ""}`}
                  variant={plan.isPopular ? "default" : "outline"}
                  size="lg"
                  onClick={() => plan.priceId && handleSubscribe(plan.priceId)}
                  disabled={loading || plan.name === "Gratuit" || (planName === plan.name && subscribed)}
                >
                  {plan.name === "Gratuit" 
                    ? "Plan actuel" 
                    : (planName === plan.name && subscribed) 
                      ? "Plan actif" 
                      : "Choisir ce plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Informations supplémentaires */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Méthode de paiement</CardTitle>
          <CardDescription className="text-base">
            Gérez vos informations de paiement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribed ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Gérez vos informations de paiement via le portail client Stripe.
              </p>
              <Button variant="outline" size="lg" className="font-bold" onClick={openCustomerPortal}>
                <CreditCard className="mr-2 h-5 w-5" />
                Gérer mes moyens de paiement
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucune carte enregistrée. Souscrivez à un plan payant pour ajouter une carte.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
