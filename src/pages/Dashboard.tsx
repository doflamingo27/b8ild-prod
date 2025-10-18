import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-lg font-black text-primary-foreground">B8</span>
            </div>
            <span className="text-xl font-black text-foreground">ild</span>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Déconnexion
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue {user?.email} ! Le dashboard complet sera implémenté dans la phase 2.
        </p>
      </main>
    </div>
  );
};

export default Dashboard;
