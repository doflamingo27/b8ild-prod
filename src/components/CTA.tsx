import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import patternBg from "@/assets/pattern-construction.jpg";

const CTA = () => {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32 bg-gradient-primary">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute h-96 w-96 rounded-full bg-accent blur-3xl top-10 right-10 animate-pulse" />
      </div>
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-up">
          <h2 className="text-4xl font-black text-white lg:text-5xl">
            Votre rentabilité, calculée.
            <br />
            <span className="text-accent">Votre succès, maîtrisé.</span>
          </h2>
          <p className="text-lg text-white/90 lg:text-xl">
            Rejoignez les centaines d'artisans qui pilotent leurs chantiers avec B8ild.
            <br />
            <span className="font-semibold text-accent">Essai gratuit 7 jours, sans carte bancaire.</span>
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 hover-glow shadow-xl" asChild>
              <Link to="/auth?mode=signup">
                Commencer maintenant
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
              <a href="#pricing">Planifier une démo</a>
            </Button>
          </div>
          <p className="text-sm text-white/80 font-medium">
            ✓ Installation en 5 minutes · ✓ Support français · ✓ Sans engagement
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
