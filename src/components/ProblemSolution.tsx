import { AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const ProblemSolution = () => {
  return (
    <section className="py-24 lg:py-32 bg-destructive/5">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-foreground lg:text-5xl">
            68% des artisans découvrent leurs <span className="text-destructive">pertes trop tard</span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Un chantier non suivi = -15 000€ de marge en moyenne. Le problème ? Vous ne le savez qu'à la fin.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Problème */}
          <Card className="p-8 border-destructive/20 hover:border-destructive/40 transition-smooth animate-fade-up">
            <AlertTriangle className="h-12 w-12 text-destructive mb-6" />
            <h3 className="text-2xl font-black text-foreground mb-4">Le Problème</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Suivi manuel des coûts fastidieux et incomplet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Factures éparpillées, calculs approximatifs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Dépassements découverts après coup</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>Impossible d'anticiper les pertes</span>
              </li>
            </ul>
          </Card>

          {/* Impact */}
          <Card className="p-8 border-warning/20 hover:border-warning/40 transition-smooth animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <TrendingDown className="h-12 w-12 text-warning mb-6" />
            <h3 className="text-2xl font-black text-foreground mb-4">L'Impact</h3>
            <div className="space-y-4">
              <div className="bg-destructive/10 p-4 rounded-lg">
                <p className="text-3xl font-black text-destructive mb-1">-15 000€</p>
                <p className="text-sm text-muted-foreground">Perte moyenne par chantier non suivi</p>
              </div>
              <div className="bg-warning/10 p-4 rounded-lg">
                <p className="text-3xl font-black text-warning mb-1">3 sur 10</p>
                <p className="text-sm text-muted-foreground">Chantiers finissent en déficit</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-3xl font-black text-muted-foreground mb-1">50h/mois</p>
                <p className="text-sm text-muted-foreground">Perdues en suivi manuel</p>
              </div>
            </div>
          </Card>

          {/* Solution */}
          <Card className="p-8 border-primary/20 hover:border-primary/40 transition-smooth bg-gradient-to-br from-primary/5 to-transparent animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <CheckCircle2 className="h-12 w-12 text-primary mb-6" />
            <h3 className="text-2xl font-black text-foreground mb-4">La Solution B8ild</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Calcul automatique</strong> de rentabilité en temps réel</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Alertes 7, 3, 1 jour</strong> avant le déficit</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Import factures</strong> en 1 clic par OCR</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Jour critique précis</strong> : sachez exactement quand vous basculez en perte</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-bold text-primary">Résultat :</p>
              <p className="text-2xl font-black text-foreground">+18% de marge</p>
              <p className="text-xs text-muted-foreground mt-1">En moyenne après 3 mois d'utilisation</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;
