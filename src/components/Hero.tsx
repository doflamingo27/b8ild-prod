import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-construction.jpg";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
      <div className="absolute inset-0 bg-grid-white/5" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-block rounded-full bg-accent/10 px-4 py-2">
              <span className="text-sm font-semibold text-accent">
                Solution BTP 100% Française
              </span>
            </div>
            
            <h1 className="text-4xl font-extrabold leading-tight text-white lg:text-6xl">
              Pilotez la rentabilité de vos chantiers{" "}
              <span className="text-accent">en temps réel</span>
            </h1>
            
            <p className="text-lg text-white/80 lg:text-xl">
              B8ild calcule automatiquement le jour exact où votre chantier devient déficitaire.
              <span className="mt-2 block font-semibold text-accent">
                Ne perdez plus un seul euro sur vos chantiers.
              </span>
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2 bg-accent text-primary hover:bg-accent/90 shadow-glow" asChild>
                <Link to="/auth?mode=signup">
                  Essayer gratuitement 7 jours
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20" asChild>
                <a href="#how-it-works">
                  <Play className="h-5 w-5" />
                  Voir la démo
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-accent">68%</div>
                <div className="text-sm text-white/70">d'artisans découvrent leurs pertes après</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">-15k€</div>
                <div className="text-sm text-white/70">perte moyenne par chantier non suivi</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
              <img
                src={heroImage}
                alt="Interface B8ild - Dashboard de gestion de chantier"
                className="w-full rounded-xl"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute -left-6 -top-6 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
