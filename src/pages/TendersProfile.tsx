import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";
import { labels, placeholders, toasts } from "@/lib/content";

const TendersProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tender-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  const [specialties, setSpecialties] = useState<string>(profile?.specialties?.join(", ") || "");
  const [zoneType, setZoneType] = useState<string>(profile?.zone_type || "france");
  const [departments, setDepartments] = useState<string>(profile?.departments?.join(", ") || "");
  const [radiusKm, setRadiusKm] = useState<string>(profile?.radius_km?.toString() || "");
  const [budgetMin, setBudgetMin] = useState<string>(profile?.budget_min?.toString() || "");
  const [budgetMax, setBudgetMax] = useState<string>(profile?.budget_max?.toString() || "");
  const [certifications, setCertifications] = useState<string>(profile?.certifications?.join(", ") || "");
  const [alertEmail, setAlertEmail] = useState<boolean>(profile?.alert_email ?? true);
  const [alertPush, setAlertPush] = useState<boolean>(profile?.alert_push ?? true);
  const [scoreThreshold, setScoreThreshold] = useState<string>(profile?.score_threshold?.toString() || "70");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const profileData = {
        user_id: user?.id,
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
        zone_type: zoneType,
        departments: zoneType === "departments" ? departments.split(",").map((d) => d.trim()).filter(Boolean) : [],
        radius_km: zoneType === "radius" && radiusKm ? parseInt(radiusKm) : null,
        budget_min: budgetMin ? parseFloat(budgetMin) : 0,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        certifications: certifications.split(",").map((c) => c.trim()).filter(Boolean),
        alert_email: alertEmail,
        alert_push: alertPush,
        score_threshold: parseInt(scoreThreshold),
      };

      if (profile) {
        const { error } = await supabase
          .from("tender_profiles")
          .update(profileData)
          .eq("user_id", user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tender_profiles")
          .insert(profileData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender-profile"] });
      toast({
        title: toasts.saved,
        description: "Votre profil AO a été enregistré",
      });
    },
    onError: (error) => {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur",
        description: toasts.errorGeneric,
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{labels.nav.tendersProfile}</h1>
            <p className="text-muted-foreground">
              Configurez vos critères pour recevoir des AO pertinents
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Spécialités BTP</CardTitle>
            <CardDescription>
              Listez vos spécialités séparées par des virgules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="specialties">{labels.forms.profileAO_Specialties}</Label>
              <Input
                id="specialties"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                placeholder={placeholders.aoProfile.specialties}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zone d'intervention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="zone-type">{labels.forms.profileAO_Area}</Label>
              <Select value={zoneType} onValueChange={setZoneType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="france">{labels.forms.profileAO_FranceAll}</SelectItem>
                  <SelectItem value="departments">{labels.forms.profileAO_Departments}</SelectItem>
                  <SelectItem value="radius">Rayon depuis un point</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {zoneType === "departments" && (
              <div>
                <Label htmlFor="departments">{labels.forms.profileAO_Departments}</Label>
                <Input
                  id="departments"
                  value={departments}
                  onChange={(e) => setDepartments(e.target.value)}
                  placeholder={placeholders.aoProfile.departments}
                />
              </div>
            )}

            {zoneType === "radius" && (
              <div>
                <Label htmlFor="radius">{labels.forms.profileAO_RadiusKm}</Label>
                <Input
                  id="radius"
                  type="number"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  placeholder={placeholders.aoProfile.radius}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget-min">{labels.forms.profileAO_BudgetMin}</Label>
                <Input
                  id="budget-min"
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="budget-max">{labels.forms.profileAO_BudgetMax}</Label>
                <Input
                  id="budget-max"
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
            <CardDescription>
              Listez vos certifications séparées par des virgules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="certifications">{labels.forms.profileAO_Certifications}</Label>
            <Input
              id="certifications"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder={placeholders.aoProfile.certifications}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres d'alertes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="alert-email">{labels.forms.profileAO_AlertsEmail}</Label>
              <Switch
                id="alert-email"
                checked={alertEmail}
                onCheckedChange={setAlertEmail}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="alert-push">{labels.forms.profileAO_AlertsPush}</Label>
              <Switch
                id="alert-push"
                checked={alertPush}
                onCheckedChange={setAlertPush}
              />
            </div>

            <div>
              <Label htmlFor="threshold">{labels.forms.profileAO_Threshold}</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="h-5 w-5" />
          {labels.actions.save}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default TendersProfile;
