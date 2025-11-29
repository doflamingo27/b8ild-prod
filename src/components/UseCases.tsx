import { Zap, Droplet, Hammer, PaintBucket, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const useCases = [
  {
    icon: Zap,
    metier: "Électricien",
    probleme: "Dépassements sur gros chantiers tertiaires",
    solution: "Suivi précis du coût main-d'œuvre par zone, alertes sur dépassement matériel",
    benefice: "+22% de marge sur chantiers >50k€",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Droplet,
    metier: "Plombier",
    probleme: "Factures fournisseurs multiples difficiles à suivre",
    solution: "Import automatique factures, consolidation coûts par chantier",
    benefice: "2h/semaine économisées, 0 facture oubliée",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Hammer,
    metier: "Maçon",
    probleme: "Équipes multiples, coûts main-d'œuvre explosent",
    solution: "Calcul automatique coût/jour par équipe, jour critique visible",
    benefice: "Détection 3 chantiers déficitaires évités",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: PaintBucket,
    metier: "Peintre",
    probleme: "Prix au m² serrés, marge qui fond vite",
    solution: "Rentabilité temps réel, simulation impact retards",
    benefice: "+15% marge grâce aux ajustements rapides",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Home,
    metier: "Couvreur",
    probleme: "Intempéries = retards = pénalités non anticipées",
    solution: "Simulateur pénalités retard intégré, projection marge finale",
    benefice: "Renégociation délais avant pénalités",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
];

const UseCases = () => {
  return (
    <section id="use-cases" className="py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Adapté à <span className="text-gradient-accent">votre métier</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Problèmes réels, solutions concrètes pour chaque corps de métier du BTP
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <Card
                key={index}
                className="card-premium hover-lift group animate-fade-up overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-6 relative">
                  {/* Background icon decorative */}
                  <div className="absolute top-0 right-0 opacity-5 group-hover:opacity-10 transition-smooth">
                    <Icon className="h-32 w-32" />
                  </div>

                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${useCase.bgColor} mb-4 group-hover:scale-110 transition-smooth`}>
                    <Icon className={`h-7 w-7 ${useCase.color}`} />
                  </div>

                  <h3 className="text-2xl font-black text-foreground mb-3">
                    {useCase.metier}
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3 bg-destructive/5 rounded-lg border-l-4 border-destructive/40">
                      <p className="text-xs font-bold text-destructive mb-1">❌ Problème</p>
                      <p className="text-sm text-muted-foreground">{useCase.probleme}</p>
                    </div>

                    <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary/40">
                      <p className="text-xs font-bold text-primary mb-1">✅ Solution B8ild</p>
                      <p className="text-sm text-muted-foreground">{useCase.solution}</p>
                    </div>

                    <div className="p-3 bg-gradient-to-r from-accent/10 to-transparent rounded-lg">
                      <p className="text-xs font-bold text-accent mb-1">📈 Résultat</p>
                      <p className="text-sm font-bold text-foreground">{useCase.benefice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
