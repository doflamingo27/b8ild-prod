import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Building2, Users, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  type: "chantier" | "membre" | "facture";
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const results: SearchResult[] = [];

    try {
      // Recherche dans chantiers
      const { data: chantiers } = await supabase
        .from("chantiers")
        .select("id, nom_chantier, client, adresse")
        .or(`nom_chantier.ilike.%${searchQuery}%,client.ilike.%${searchQuery}%,adresse.ilike.%${searchQuery}%`)
        .limit(5);

      if (chantiers) {
        results.push(
          ...chantiers.map((c) => ({
            type: "chantier" as const,
            id: c.id,
            title: c.nom_chantier,
            subtitle: `${c.client} • ${c.adresse || "Pas d'adresse"}`,
            link: `/projects/${c.id}`,
          }))
        );
      }

      // Recherche dans membres équipe
      const { data: membres } = await supabase
        .from("membres_equipe")
        .select("id, nom, prenom, poste")
        .or(`nom.ilike.%${searchQuery}%,prenom.ilike.%${searchQuery}%,poste.ilike.%${searchQuery}%`)
        .limit(5);

      if (membres) {
        results.push(
          ...membres.map((m) => ({
            type: "membre" as const,
            id: m.id,
            title: `${m.prenom} ${m.nom}`,
            subtitle: m.poste || "Aucun poste",
            link: "/team",
          }))
        );
      }

      // Recherche dans factures fournisseurs
      const { data: factures } = await supabase
        .from("factures_fournisseurs")
        .select("id, fournisseur, montant_ht, categorie")
        .ilike("fournisseur", `%${searchQuery}%`)
        .limit(5);

      if (factures) {
        results.push(
          ...factures.map((f) => ({
            type: "facture" as const,
            id: f.id,
            title: f.fournisseur || "Fournisseur inconnu",
            subtitle: `${f.categorie} • ${Number(f.montant_ht).toLocaleString("fr-FR")} €`,
            link: "/projects",
          }))
        );
      }

      setResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.link);
    onOpenChange(false);
    setQuery("");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "chantier":
        return <Building2 className="h-4 w-4" />;
      case "membre":
        return <Users className="h-4 w-4" />;
      case "facture":
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "chantier":
        return "Chantier";
      case "membre":
        return "Membre";
      case "facture":
        return "Facture";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recherche globale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un chantier, membre, facture..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {loading && (
            <p className="text-center text-muted-foreground py-8">Recherche...</p>
          )}

          {!loading && query && results.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Aucun résultat trouvé</p>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{result.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(result.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};