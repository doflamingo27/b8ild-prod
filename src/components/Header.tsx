import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users, FolderKanban, FileText, User, CreditCard, LogOut, HardHat, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import { labels, toasts } from "@/lib/content";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erreur",
        description: toasts.errorGeneric,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Déconnecté",
        description: "À bientôt !",
      });
      navigate("/auth");
    }
  };

  const navItems = [
    { path: "/dashboard", label: labels.nav.dashboard, icon: Home },
    { path: "/team", label: labels.nav.team, icon: Users },
    { path: "/projects", label: labels.nav.projects, icon: FolderKanban },
    { path: "/rentabilite", label: "Rentabilité", icon: DollarSign },
    { path: "/reports", label: labels.nav.reports, icon: FileText },
    { path: "/profile", label: labels.nav.profile, icon: User },
    { path: "/subscription", label: labels.nav.billing, icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="p-2 rounded-xl bg-primary group-hover:shadow-glow-primary transition-smooth">
            <HardHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black text-gradient-primary">{labels.app.name}</span>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 transition-all duration-200",
                    isActive && "shadow-md"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout} 
            className="gap-2 hover:border-destructive hover:text-destructive"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
