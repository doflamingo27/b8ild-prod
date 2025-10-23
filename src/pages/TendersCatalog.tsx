import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Filter, Download, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { labels, emptyStates } from "@/lib/content";
import EmptyState from "@/components/EmptyState";

const TendersCatalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");

  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ["tenders-catalog", keyword, department],
    queryFn: async () => {
      let query = supabase
        .from("tenders")
        .select("*")
        .order("created_at", { ascending: false });

      if (keyword) {
        query = query.or(`title.ilike.%${keyword}%,buyer.ilike.%${keyword}%,city.ilike.%${keyword}%`);
      }

      if (department) {
        query = query.eq("department", department);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["tender-matches-map", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_matches")
        .select("tender_id, score")
        .eq("user_id", user?.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const matchesMap = new Map(matches.map((m: any) => [m.tender_id, m.score]));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{labels.nav.tendersCatalog}</h1>
            <p className="text-muted-foreground mt-1">
              Parcourez tous les appels d'offres disponibles
            </p>
          </div>
          <Link to="/tenders/import">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Importer AO
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Mot-clé (titre, acheteur, ville)"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="Département (ex: 75)"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {tenders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={emptyStates.tendersCatalog.title}
            text={emptyStates.tendersCatalog.text}
            primaryAction={{
              label: emptyStates.tendersCatalog.primary || "Importer un AO",
              onClick: () => navigate("/tenders/import")
            }}
          />
        ) : (
          <div className="space-y-3">
            {tenders.map((tender: any) => {
              const score = matchesMap.get(tender.id);
              return (
                <Card key={tender.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{tender.title}</h3>
                          {score && (
                            <Badge variant={score >= 85 ? "default" : "secondary"}>
                              {score}%
                            </Badge>
                          )}
                          {score && score >= 70 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Pertinent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tender.buyer} • {tender.city} {tender.department ? `(${tender.department})` : ""}
                        </p>
                        {tender.budget_min && tender.budget_max && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Budget: {tender.budget_min.toLocaleString()} € - {tender.budget_max.toLocaleString()} €
                          </p>
                        )}
                        {tender.deadline && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Deadline: {new Date(tender.deadline).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {tender.category && (
                          <Badge variant="outline" className="mt-2">
                            {tender.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {tender.dce_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(tender.dce_url, "_blank")}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            DCE
                          </Button>
                        )}
                        {tender.source_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(tender.source_url, "_blank")}
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Source
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TendersCatalog;
