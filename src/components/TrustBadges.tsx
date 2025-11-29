import { Shield, MapPin, Headphones, Lock, Award, Zap } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "100% RGPD",
    description: "Conformité totale réglementation européenne",
    color: "text-primary",
  },
  {
    icon: MapPin,
    title: "Hébergé en France",
    description: "Serveurs sécurisés en Union Européenne",
    color: "text-blue-500",
  },
  {
    icon: Lock,
    title: "Données chiffrées",
    description: "Encryption AES-256 bout en bout",
    color: "text-purple-500",
  },
  {
    icon: Headphones,
    title: "Support réactif",
    description: "Réponse <2h par chat et email",
    color: "text-warning",
  },
  {
    icon: Award,
    title: "Certifié sécurisé",
    description: "Audits de sécurité réguliers",
    color: "text-success",
  },
  {
    icon: Zap,
    title: "99.9% Uptime",
    description: "Disponibilité garantie",
    color: "text-accent",
  },
];

const TrustBadges = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-muted/50 to-muted/20 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Pourquoi nous faire confiance</p>
          <h3 className="text-2xl font-black text-foreground">Sécurité et conformité garanties</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div
                key={index}
                className="text-center group animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-card border border-border mb-3 group-hover:scale-110 group-hover:border-primary/40 transition-smooth">
                  <Icon className={`h-8 w-8 ${badge.color}`} />
                </div>
                <p className="text-sm font-bold text-foreground mb-1">{badge.title}</p>
                <p className="text-xs text-muted-foreground leading-tight">{badge.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 opacity-60">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Certifié</p>
            <Shield className="h-12 w-12 text-primary mx-auto" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Soutenu par</p>
            <Award className="h-12 w-12 text-warning mx-auto" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Partenaire</p>
            <Zap className="h-12 w-12 text-accent mx-auto" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
