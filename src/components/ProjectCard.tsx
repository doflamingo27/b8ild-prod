import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { Building, Calendar, AlertTriangle, MoreVertical, Edit, Trash2 } from "lucide-react";

interface ProjectCardProps {
  id: string;
  nom_chantier: string;
  client: string;
  rentabilite: number;
  jours_restants?: number;
  budget_devis?: number;
  couts_engages?: number;
  etat_chantier?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ProjectCard = ({ 
  id, 
  nom_chantier, 
  client, 
  rentabilite, 
  jours_restants,
  budget_devis = 0,
  couts_engages = 0,
  etat_chantier = 'en_cours',
  onEdit,
  onDelete 
}: ProjectCardProps) => {
  const navigate = useNavigate();
  
  const etatConfig: Record<string, { label: string; color: string; icon: string }> = {
    'brouillon': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: '📝' },
    'projection': { label: 'Projection', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: '🔮' },
    'attente_signature': { label: 'En attente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300', icon: '✍️' },
    'en_cours': { label: 'En cours', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: '🚧' },
    'suspendu': { label: 'Suspendu', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', icon: '⏸️' },
    'termine': { label: 'Terminé', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300', icon: '✅' },
    'annule': { label: 'Annulé', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: '❌' },
  };
  
  const currentEtat = etatConfig[etat_chantier] || etatConfig['en_cours'];
  
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
    <Card className="card-premium hover-lift group animate-scale-in">
      <CardHeader>
          <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${currentEtat.color} font-semibold px-2 py-1`}>
                {currentEtat.icon} {currentEtat.label}
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 group-hover:text-primary transition-smooth">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-smooth">
                <Building className="h-5 w-5 text-primary" />
              </div>
              {nom_chantier}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2 font-medium">{client}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={getStatusVariant(rentabilite)}
              className="font-bold px-3 py-1"
            >
              {getStatusLabel(rentabilite)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-muted-foreground font-medium">Budget utilisé</span>
            <span className="font-mono font-bold text-foreground">{progressValue.toFixed(0)}%</span>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Rentabilité</p>
            <p className={`text-3xl font-black font-mono ${
              rentabilite >= 20 ? "text-success" : 
              rentabilite >= 10 ? "text-warning" : 
              rentabilite > 0 ? "text-alert" : "text-danger"
            }`}>
              {rentabilite.toFixed(1)}%
            </p>
          </div>
          {jours_restants !== undefined && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Jours restants
              </p>
              <p className={`text-3xl font-black font-mono ${
                jours_restants <= 3 ? "text-danger" : 
                jours_restants <= 7 ? "text-warning" : "text-foreground"
              }`}>
                {jours_restants > 0 ? jours_restants : 0}j
              </p>
            </div>
          )}
        </div>

        {jours_restants !== undefined && jours_restants <= 7 && (
          <div className={`flex items-center gap-2 p-3 rounded-xl ${
            jours_restants <= 1 
              ? "bg-danger/10 text-danger border border-danger/20" 
              : "bg-alert/10 text-alert border border-alert/20"
          }`}>
            <AlertTriangle className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-bold">
              {jours_restants <= 1 ? "Alerte critique!" : "Attention requise"}
            </span>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button asChild variant="outline" className="w-full font-semibold group/btn">
          <Link to={`/projects/${id}`}>
            Voir détails
            <span className="ml-2 group-hover/btn:translate-x-1 transition-transform">→</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
