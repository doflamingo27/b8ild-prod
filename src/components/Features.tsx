import { Calculator, AlertTriangle, Users, TrendingUp, FileText, Bell, Sparkles, BarChart3, Clock } from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Calcul automatique de rentabilité",
    description: "Suivez en temps réel le coût de votre main-d'œuvre, vos charges et votre marge. Tout est automatique.",
    details: [
      "Agrégation automatique de tous les coûts (factures, équipes, frais)",
      "Mise à jour instantanée à chaque nouvelle dépense",
      "Projection de la marge finale selon l'avancement",
      "Comparaison budget prévu vs dépensé"
    ],
    color: "text-accent",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop",
    direction: "left",
    badge: "Nouveau",
  },
  {
    icon: AlertTriangle,
    title: "Alertes avant déficit",
    description: "Recevez des notifications 7, 3 et 1 jour avant que votre chantier ne devienne déficitaire.",
    details: [
      "Alertes par email et notification in-app",
      "Détection précoce des dérapages budgétaires",
      "Recommandations d'actions correctives automatiques",
      "Historique des alertes et actions prises"
    ],
    color: "text-danger",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop",
    direction: "right",
  },
  {
    icon: Users,
    title: "Gestion d'équipe complète",
    description: "Gérez vos équipes, coûts horaires, charges sociales et affectations par chantier.",
    details: [
      "Calcul automatique du coût/jour par membre",
      "Suivi des affectations et disponibilités",
      "Gestion des congés et absences",
      "Statistiques de productivité par équipe"
    ],
    color: "text-primary",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=400&fit=crop",
    direction: "left",
  },
  {
    icon: TrendingUp,
    title: "Jour critique précis",
    description: "Connaissez exactement le jour où votre chantier bascule en perte.",
    details: [
      "Projection mathématique basée sur vos coûts réels",
      "Visualisation graphique de l'évolution de la marge",
      "Simulation d'impact des retards et ajustements",
      "Compteur de jours rentables restants"
    ],
    color: "text-success",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
    direction: "right",
    badge: "Populaire",
  },
  {
    icon: FileText,
    title: "Import factures intelligent",
    description: "Importez vos devis et factures fournisseurs en 1 clic grâce à l'OCR avancé.",
    details: [
      "Reconnaissance automatique de tous formats PDF/images",
      "Extraction HT, TVA, TTC, fournisseur, date, SIRET",
      "Correction manuelle rapide si besoin",
      "Association automatique aux chantiers par référence"
    ],
    color: "text-accent",
    image: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&h=400&fit=crop",
    direction: "left",
  },
  {
    icon: BarChart3,
    title: "Rapports PDF enrichis",
    description: "Exportez des bilans financiers complets avec graphiques et métriques détaillées.",
    details: [
      "Export PDF professionnel en 1 clic",
      "Synthèse rentabilité avec badges colorés",
      "Comparaison prévisionnel vs réel",
      "Sections devis, factures, équipes, coûts annexes"
    ],
    color: "text-purple-500",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
    direction: "right",
  },
  {
    icon: Sparkles,
    title: "IA d'analyse de chantier",
    description: "Intelligence artificielle qui analyse vos chantiers et recommande des optimisations.",
    details: [
      "Détection automatique des problèmes et risques",
      "Recommandations concrètes et actionnables",
      "Comparaison aux standards BTP français",
      "Prévisions de coût final et rentabilité"
    ],
    color: "text-pink-500",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
    direction: "left",
    badge: "IA",
  },
  {
    icon: Clock,
    title: "Simulateur pénalités retard",
    description: "Anticipez l'impact financier des retards avec des simulations instantanées.",
    details: [
      "Configuration flexible des clauses de pénalités",
      "Graphiques d'impact selon jours de retard",
      "Comparateur de scénarios multi-paramètres",
      "Alertes intelligentes et actions recommandées"
    ],
    color: "text-orange-500",
    image: "https://images.unsplash.com/photo-1495592822108-9e6261896da8?w=600&h=400&fit=crop",
    direction: "right",
  },
  {
    icon: Bell,
    title: "Notifications intelligentes",
    description: "Alertes par email et dans l'app pour ne jamais manquer un seuil critique.",
    details: [
      "Notifications personnalisables par type d'alerte",
      "Résumé quotidien de tous vos chantiers",
      "Historique des notifications et actions prises",
      "Désactivation granulaire par catégorie"
    ],
    color: "text-warning",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop",
    direction: "left",
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

        <div className="space-y-24">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLeft = feature.direction === "left";
            
            return (
              <div
                key={index}
                className={`grid gap-12 lg:grid-cols-2 items-center animate-fade-up ${
                  isLeft ? "" : "lg:grid-flow-dense"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className={`relative group ${isLeft ? "" : "lg:col-start-2"}`}>
                  <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-2xl group-hover:opacity-30 transition-smooth rounded-3xl"></div>
                  <div className="relative overflow-hidden rounded-2xl shadow-elegant border border-border">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-[300px] object-cover group-hover:scale-105 transition-smooth"
                    />
                    {feature.badge && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {feature.badge}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={isLeft ? "" : "lg:col-start-1 lg:row-start-1"}>
                  <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 hover:scale-110 transition-smooth`}>
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                  </div>

                  <h3 className="mb-4 text-3xl font-black text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    {feature.description}
                  </p>

                  <ul className="space-y-3">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <div className={`h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <div className={`h-2 w-2 rounded-full ${feature.color.replace('text-', 'bg-')}`}></div>
                        </div>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
