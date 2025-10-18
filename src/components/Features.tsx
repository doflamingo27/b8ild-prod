import { Calculator, AlertTriangle, Users, TrendingUp, FileText, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calculator,
    title: "Calcul automatique de rentabilité",
    description: "Suivez en temps réel le coût de votre main-d'œuvre, vos charges et votre marge.",
    color: "text-accent",
  },
  {
    icon: AlertTriangle,
    title: "Alertes avant déficit",
    description: "Recevez des notifications 7, 3 et 1 jour avant que votre chantier ne devienne déficitaire.",
    color: "text-danger",
  },
  {
    icon: Users,
    title: "Gestion d'équipe complète",
    description: "Gérez vos équipes, coûts horaires, charges sociales et affectations par chantier.",
    color: "text-primary",
  },
  {
    icon: TrendingUp,
    title: "Jour critique précis",
    description: "Connaissez exactement le jour où votre chantier bascule en perte.",
    color: "text-success",
  },
  {
    icon: FileText,
    title: "Devis & Factures",
    description: "Importez vos devis et factures fournisseurs pour un suivi complet des coûts.",
    color: "text-accent",
  },
  {
    icon: Bell,
    title: "Notifications intelligentes",
    description: "Alertes par email et dans l'app pour ne jamais manquer un seuil critique.",
    color: "text-warning",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Anticipez, ajustez, <span className="text-gradient-accent">rentabilisez</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Tous les outils dont vous avez besoin pour piloter vos chantiers comme un pro
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="card-premium hover-lift group animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-6">
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-smooth">
                    <Icon className={`h-7 w-7 ${feature.color} group-hover:scale-110 transition-smooth`} />
                  </div>
                  <h3 className="mb-3 text-xl font-black text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
