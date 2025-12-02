import { Building2, Users, Calculator, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: Building2,
    title: "Créez votre chantier BTP",
    description: "Ajoutez un nouveau chantier BTP avec le devis et les informations client en moins de 2 minutes.",
    details: "Renseignez nom du chantier, client, référence, dates prévisionnelles et budget. Importez votre devis par OCR en 1 clic, comme sur vos chantiers réels.",
    color: "text-primary",
  },
  {
    number: "02",
    icon: Users,
    title: "Affectez votre équipe terrain",
    description: "Assignez les membres de votre équipe chantier avec leurs coûts horaires et charges (chef de chantier, compagnons, apprentis…).",
    details: "Sélectionnez les membres, définissez les jours travaillés et les taux horaires. Le coût main-d'œuvre BTP se calcule automatiquement.",
    color: "text-accent",
  },
  {
    number: "03",
    icon: Calculator,
    title: "Suivez les coûts BTP",
    description: "Importez vos factures fournisseurs matériaux et frais de chantier en temps réel.",
    details: "Upload de factures par OCR : extraction automatique HT, TVA, TTC. Ajoutez les coûts annexes (location, outillage, déplacements, sous-traitants).",
    color: "text-warning",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Pilotez en temps réel",
    description: "Consultez votre rentabilité et le jour critique à tout moment, depuis le bureau, la base vie ou le camion.",
    details: "Dashboard avec KPIs en temps réel, graphiques d'évolution, alertes automatiques et export PDF enrichi. Réagissez avant qu'il soit trop tard.",
    color: "text-success",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-muted/30 py-24 lg:py-32 relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-accent/20 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Simple, rapide, <span className="text-gradient-accent">efficace</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            4 étapes pour que votre entreprise BTP prenne le contrôle de ses chantiers et évite les pertes.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-accent">
            Aucun paramétrage complexe — pensé pour les artisans, pas pour les équipes IT.
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-success hidden lg:block"></div>

          <div className="space-y-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === steps.length - 1;
              
              return (
                <div
                  key={index}
                  className="relative flex gap-8 items-start animate-fade-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Step number circle */}
                  <div className="relative flex-shrink-0 hidden lg:flex">
                    <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center text-white font-black text-xl shadow-glow z-10 hover-scale">
                      {step.number}
                    </div>
                  </div>

                  {/* Content card */}
                  <div className="flex-1 bg-card rounded-2xl p-8 shadow-elegant border border-border hover-lift group">
                    <div className="flex items-start gap-6">
                      {/* Icon */}
                      <div className={`h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-smooth`}>
                        <Icon className={`h-7 w-7 ${step.color}`} />
                      </div>

                      {/* Text content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 lg:hidden">
                          <span className="text-4xl font-black text-accent/20 font-mono">{step.number}</span>
                        </div>
                        
                        <h3 className="text-2xl font-black text-foreground mb-3">
                          {step.title}
                        </h3>
                        
                        <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                          {step.description}
                        </p>

                        <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary/40">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <span className="font-bold text-foreground">💡 Astuce : </span>
                            {step.details}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    {!isLast && (
                      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>Passez à l'étape suivante</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA at the end */}
        <div className="mt-16 text-center animate-fade-up" style={{ animationDelay: "0.6s" }}>
          <div className="inline-block p-8 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent rounded-2xl border border-primary/20">
            <p className="text-xl font-bold text-foreground mb-4">
              Prêt à reprendre le contrôle de vos chantiers ?
            </p>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Rejoignez les 500+ artisans et PME du BTP qui pilotent déjà leurs chantiers avec B8ild
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="btn-ripple shadow-glow">
                Commencer maintenant gratuitement
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">14 jours d'essai • Sans carte bancaire • Annulation facile</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
