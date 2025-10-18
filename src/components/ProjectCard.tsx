import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Building, Calendar, TrendingUp, AlertTriangle } from "lucide-react";

interface ProjectCardProps {
  id: string;
  nom_chantier: string;
  client: string;
  rentabilite: number;
  jours_restants?: number;
  budget_devis?: number;
  couts_engages?: number;
}

const ProjectCard = ({ 
  id, 
  nom_chantier, 
  client, 
  rentabilite, 
  jours_restants,
  budget_devis = 0,
  couts_engages = 0 
}: ProjectCardProps) => {
  const getStatusColor = (rentabilite: number) => {
    if (rentabilite >= 20) return "bg-success";
    if (rentabilite >= 10) return "bg-warning";
    if (rentabilite > 0) return "bg-alert";
    return "bg-danger";
  };

  const getStatusLabel = (rentabilite: number) => {
    if (rentabilite >= 20) return "Excellent";
    if (rentabilite >= 10) return "Bon";
    if (rentabilite > 0) return "Attention";
    return "Déficit";
  };

  const getStatusVariant = (rentabilite: number): "default" | "secondary" | "destructive" | "outline" => {
    if (rentabilite >= 20) return "default";
    if (rentabilite >= 10) return "secondary";
    if (rentabilite > 0) return "outline";
    return "destructive";
  };

  const progressValue = budget_devis > 0 ? (couts_engages / budget_devis) * 100 : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              {nom_chantier}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{client}</p>
          </div>
          <Badge variant={getStatusVariant(rentabilite)}>{getStatusLabel(rentabilite)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Budget utilisé</span>
            <span className="font-mono font-bold">{progressValue.toFixed(0)}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-xs text-muted-foreground">Rentabilité</p>
            <p className="text-2xl font-black font-mono">{rentabilite.toFixed(1)}%</p>
          </div>
          {jours_restants !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Jours restants
              </p>
              <p className={`text-2xl font-black font-mono ${jours_restants <= 3 ? "text-danger" : ""}`}>
                {jours_restants > 0 ? jours_restants : 0}j
              </p>
            </div>
          )}
        </div>

        {jours_restants !== undefined && jours_restants <= 7 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-alert/10 text-alert">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {jours_restants <= 1 ? "Alerte critique!" : "Attention requise"}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link to={`/projects/${id}`}>Voir détails</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
