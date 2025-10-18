import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import patternBg from "@/assets/pattern-construction.jpg";

const CTA = () => {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div
        className="absolute inset-0 opacity-5"
        style={{ backgroundImage: `url(${patternBg})`, backgroundSize: "cover" }}
      />
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <h2 className="text-3xl font-extrabold text-foreground lg:text-5xl">
            Votre rentabilité, calculée.
            <br />
            <span className="text-accent">Votre succès, maîtrisé.</span>
          </h2>
          <p className="text-lg text-muted-foreground lg:text-xl">
            Rejoignez les centaines d'artisans qui pilotent leurs chantiers avec B8ild.
            <br />
            Essai gratuit 7 jours, sans carte bancaire.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 bg-accent text-primary hover:bg-accent/90 shadow-glow" asChild>
              <Link to="/auth?mode=signup">
                Commencer maintenant
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#pricing">Planifier une démo</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            ✓ Installation en 5 minutes · ✓ Support français · ✓ Sans engagement
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
