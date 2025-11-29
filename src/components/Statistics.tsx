import { useEffect, useState } from "react";
import { TrendingUp, Users, Clock, Target } from "lucide-react";

const statistics = [
  {
    icon: Users,
    value: 500,
    suffix: "+",
    label: "Artisans actifs",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Target,
    value: 2400,
    suffix: "+",
    label: "Chantiers pilotés",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: TrendingUp,
    value: 18,
    suffix: "%",
    label: "Marge améliorée",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Clock,
    value: 15,
    suffix: "min/jour",
    label: "Temps économisé",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

const AnimatedCounter = ({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = (currentTime - startTime) / duration;

      if (progress < 1) {
        setCount(Math.floor(end * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
};

const Statistics = () => {
  return (
    <section className="py-24 lg:py-32 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-primary blur-3xl"></div>
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-accent blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Les chiffres parlent <span className="text-gradient-accent">d'eux-mêmes</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Des résultats mesurables pour votre entreprise BTP
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="text-center animate-fade-up group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl ${stat.bgColor} mb-6 group-hover:scale-110 transition-smooth`}>
                  <Icon className={`h-10 w-10 ${stat.color}`} />
                </div>

                <div className="mb-3">
                  <p className="text-5xl font-black text-foreground lg:text-6xl">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </p>
                </div>

                <p className="text-lg font-bold text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block p-6 bg-card rounded-2xl shadow-elegant border border-border">
            <p className="text-sm text-muted-foreground mb-2">Satisfaction client</p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-3xl text-warning">★</span>
                ))}
              </div>
              <span className="text-3xl font-black text-foreground">4.9/5</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Basé sur 127 avis vérifiés</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Statistics;
