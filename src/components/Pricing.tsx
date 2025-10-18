import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Essai Gratuit",
    price: "0",
    duration: "7 jours",
    description: "Testez B8ild sans engagement",
    features: [
      "1 chantier maximum",
      "Gestion d'équipe complète",
      "Calculs de rentabilité",
      "Alertes par email",
      "Support par email",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Pro",
    price: "49",
    duration: "mois",
    description: "Pour les artisans et petites équipes",
    features: [
      "Chantiers illimités",
      "Équipes illimitées",
      "Calculs avancés",
      "Alertes temps réel",
      "Export PDF/CSV",
      "Support prioritaire",
      "Intégrations comptables",
    ],
    cta: "Choisir Pro",
    popular: true,
  },
  {
    name: "Annuel",
    price: "490",
    duration: "an",
    badge: "-2 mois offerts",
    description: "La meilleure offre pour votre entreprise",
    features: [
      "Tout du plan Pro",
      "2 mois offerts (490€ au lieu de 588€)",
      "Support prioritaire 7j/7",
      "Formation personnalisée",
      "Accès anticipé aux nouvelles fonctionnalités",
    ],
    cta: "Choisir Annuel",
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-extrabold text-foreground lg:text-5xl">
            Un tarif simple, <span className="text-accent">transparent</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Choisissez la formule adaptée à votre activité
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${
                plan.popular
                  ? "border-accent shadow-lg shadow-accent/20"
                  : "border-border/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1">
                  <span className="text-sm font-bold text-primary">
                    Le plus populaire
                  </span>
                </div>
              )}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-success px-4 py-1">
                  <span className="text-sm font-bold text-white">
                    {plan.badge}
                  </span>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="mt-2">
                  {plan.description}
                </CardDescription>
                <div className="mt-6">
                  <span className="text-5xl font-extrabold text-foreground font-mono">
                    {plan.price}€
                  </span>
                  <span className="text-muted-foreground">/{plan.duration}</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className={`mb-6 w-full ${
                    plan.popular
                      ? "bg-accent text-primary hover:bg-accent/90 shadow-glow"
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  asChild
                >
                  <Link to="/auth?mode=signup">{plan.cta}</Link>
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Tous les prix sont HT. TVA applicable selon votre pays.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
