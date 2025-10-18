import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users, FolderKanban, FileText, User, CreditCard, LogOut, HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt !",
    });
    navigate("/auth");
  };

  const navItems = [
    { path: "/dashboard", label: "Tableau de bord", icon: Home },
    { path: "/team", label: "Équipe", icon: Users },
    { path: "/projects", label: "Chantiers", icon: FolderKanban },
    { path: "/reports", label: "Rapports", icon: FileText },
    { path: "/profile", label: "Profil", icon: User },
    { path: "/subscription", label: "Abonnement", icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="p-2 rounded-xl bg-primary group-hover:shadow-glow-primary transition-smooth">
            <HardHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black text-gradient-primary">B8ild</span>
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

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout} 
          className="gap-2 hover:border-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </header>
  );
};

export default Header;
