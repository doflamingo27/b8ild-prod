import { Building2 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-secondary/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                B<span className="text-accent">8</span>ild
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Pilotez la rentabilité de vos chantiers en temps réel.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold text-foreground">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  Tarifs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Démo
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold text-foreground">Entreprise</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  À propos
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold text-foreground">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  CGU
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Confidentialité
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Mentions légales
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 B8ild. Tous droits réservés. Solution française pour le BTP.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
