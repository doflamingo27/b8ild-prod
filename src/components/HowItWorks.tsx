import { Building2, Users, Calculator, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Building2,
    title: "Créez votre chantier",
    description: "Ajoutez un nouveau chantier avec le devis et les informations client.",
  },
  {
    number: "02",
    icon: Users,
    title: "Affectez votre équipe",
    description: "Assignez les membres de votre équipe avec leurs coûts horaires.",
  },
  {
    number: "03",
    icon: Calculator,
    title: "Suivez les coûts",
    description: "Importez vos factures fournisseurs et frais de chantier.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Pilotez en temps réel",
    description: "Consultez votre rentabilité et le jour critique à tout moment.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-muted/30 py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Simple, rapide, <span className="text-gradient-accent">efficace</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            4 étapes pour prendre le contrôle de vos chantiers
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative animate-fade-up" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-6xl font-black text-accent/20 font-mono">
                    {step.number}
                  </span>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg hover-scale">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="mb-3 text-xl font-black text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="absolute right-0 top-14 hidden h-0.5 w-full bg-gradient-to-r from-accent/40 to-transparent lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
