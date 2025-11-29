import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Comment B8ild calcule-t-il la rentabilité en temps réel ?",
    answer: "B8ild agrège automatiquement tous vos coûts (devis, factures fournisseurs importées par OCR, coûts main-d'œuvre de vos équipes, frais annexes) et les compare au budget du chantier. Le calcul se met à jour instantanément à chaque nouvelle dépense ou affectation d'équipe, vous donnant une vision précise de votre marge actuelle et de votre marge finale projetée.",
  },
  {
    question: "L'import automatique de factures fonctionne-t-il avec tous les fournisseurs ?",
    answer: "Oui, notre système OCR avancé reconnaît les factures de tous formats (PDF, images) et extrait automatiquement les informations clés : fournisseur, montants HT/TTC, TVA, date, SIRET. Le système s'améliore continuellement et gère même les factures manuscrites ou avec des formats non standards. En cas d'extraction incomplète, vous pouvez corriger manuellement en 30 secondes.",
  },
  {
    question: "Qu'est-ce que le 'jour critique' et comment est-il calculé ?",
    answer: "Le jour critique est le jour précis où votre chantier bascule de rentable à déficitaire. B8ild projette tous vos coûts futurs (équipes, durée restante, frais prévus) et calcule mathématiquement le moment où vos dépenses dépasseront votre budget. Vous recevez des alertes automatiques 7, 3 et 1 jour avant ce seuil pour réagir à temps : renégocier, accélérer, ou ajuster l'équipe.",
  },
  {
    question: "Mes données sont-elles sécurisées ? Où sont-elles hébergées ?",
    answer: "Absolument. Toutes vos données sont hébergées en France sur des serveurs sécurisés (Supabase/AWS EU-West), chiffrées en transit (TLS) et au repos (AES-256). Nous sommes 100% conformes RGPD avec des politiques de sécurité au niveau ligne (RLS) garantissant que seul vous pouvez accéder à vos chantiers. Aucune donnée n'est jamais partagée avec des tiers. Vous pouvez exporter ou supprimer vos données à tout moment.",
  },
  {
    question: "Combien de temps faut-il pour prendre en main B8ild ?",
    answer: "La plupart de nos utilisateurs sont opérationnels en moins de 15 minutes. L'interface est conçue pour être intuitive et ne nécessite aucune formation. Créez votre premier chantier, importez un devis, ajoutez votre équipe et vos factures fournisseurs : le calcul de rentabilité se fait automatiquement. Notre support réactif (réponse <2h) est disponible par chat si besoin.",
  },
  {
    question: "Puis-je essayer B8ild gratuitement avant de m'abonner ?",
    answer: "Oui, nous offrons un essai gratuit de 14 jours sans carte bancaire requise. Vous avez accès à toutes les fonctionnalités (import factures, calcul rentabilité, alertes, gestion équipe, export PDF) sur un nombre illimité de chantiers. Aucun engagement, aucune limite artificielle. Si B8ild ne vous convient pas, rien à payer, aucune question posée.",
  },
  {
    question: "B8ild est-il compatible avec mon logiciel de facturation existant ?",
    answer: "B8ild n'est pas un logiciel de facturation mais un outil de pilotage de rentabilité. Il s'intègre parfaitement avec votre flux de travail existant : vous continuez à utiliser votre logiciel de facturation (Henrri, Abby, etc.) et vous importez simplement vos factures fournisseurs dans B8ild (par OCR en 1 clic) pour suivre vos coûts. L'export PDF enrichi de B8ild peut servir de base pour vos bilans financiers.",
  },
  {
    question: "Que se passe-t-il si je dépasse le nombre de chantiers de mon forfait ?",
    answer: "Nos forfaits sont conçus pour s'adapter à votre activité : le plan Starter (49€/mois) permet 10 chantiers actifs, le plan Pro (99€/mois) 50 chantiers, et le plan Business (249€/mois) un nombre illimité. Les chantiers terminés/archivés ne comptent pas dans cette limite. Si vous approchez de votre limite, nous vous préviendrons à l'avance et vous pourrez facilement upgrader votre forfait en 1 clic, avec facturation au prorata.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Questions <span className="text-gradient-accent">fréquentes</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Tout ce que vous devez savoir sur B8ild
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-border rounded-xl px-6 animate-fade-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <AccordionTrigger className="text-left text-lg font-bold text-foreground hover:text-primary transition-smooth py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center p-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
          <p className="text-lg font-bold text-foreground mb-2">Vous avez d'autres questions ?</p>
          <p className="text-muted-foreground mb-4">Notre équipe support est là pour vous aider</p>
          <a
            href="mailto:support@b8ild.fr"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-smooth"
          >
            Contactez-nous
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
