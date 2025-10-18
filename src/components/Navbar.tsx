import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-6 w-6 text-accent" />
          </div>
          <span className="text-2xl font-extrabold text-foreground">
            B<span className="text-accent">8</span>ild
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Fonctionnalités
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Tarifs
          </a>
          <a
            href="#"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth?mode=login">Connexion</Link>
          </Button>
          <Button size="sm" className="bg-accent text-primary hover:bg-accent/90" asChild>
            <Link to="/auth?mode=signup">Essai gratuit</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
