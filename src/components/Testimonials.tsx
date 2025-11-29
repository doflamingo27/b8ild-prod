import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Marc Dubois",
    role: "Électricien",
    location: "Lyon",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marc",
    rating: 5,
    quote: "Avant B8ild, je perdais 10 000€ par an sans m'en rendre compte. Maintenant je sais exactement où j'en suis sur chaque chantier. Le jour critique m'a sauvé 3 fois cette année !",
  },
  {
    name: "Sophie Martin",
    role: "Plombière",
    location: "Marseille",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
    rating: 5,
    quote: "L'import automatique des factures me fait gagner 2h par semaine. Les alertes m'ont permis de réagir avant qu'il soit trop tard sur 2 chantiers. Je recommande à tous mes collègues.",
  },
  {
    name: "Pierre Leroy",
    role: "Maçon",
    location: "Toulouse",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pierre",
    rating: 5,
    quote: "Simple et efficace. J'ai enfin une vision claire de mes coûts. En 3 mois, j'ai augmenté ma marge de 15%. L'équipe support répond en moins de 2h, c'est impressionnant.",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Ils ont repris le <span className="text-gradient-accent">contrôle</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            +500 artisans du BTP utilisent B8ild chaque jour pour piloter leurs chantiers
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="card-premium hover-lift animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-16 w-16 rounded-full border-2 border-primary/20"
                  />
                  <div>
                    <h3 className="font-black text-foreground">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">{testimonial.role} • {testimonial.location}</p>
                  </div>
                </div>

                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>

                <blockquote className="text-muted-foreground italic leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-full">
            <Star className="h-5 w-5 fill-warning text-warning" />
            <span className="font-bold text-foreground">4.9/5</span>
            <span className="text-muted-foreground">• 127 avis vérifiés</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
