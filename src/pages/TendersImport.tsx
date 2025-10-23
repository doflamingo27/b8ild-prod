import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2 } from "lucide-react";
import { labels, placeholders, toasts } from "@/lib/content";

const TendersImport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  const [title, setTitle] = useState("");
  const [buyer, setBuyer] = useState("");
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setExtracting(true);

    try {
      // Upload temporaire pour OCR
      const fileExt = file.name.split('.').pop();
      const tempFileName = `temp-tender-${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('devis')
        .upload(tempFileName, file);

      if (uploadError) throw uploadError;

      // Créer une signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('devis')
        .createSignedUrl(uploadData.path, 60);

      if (signedError) throw signedError;

      // Appel à l'edge function d'extraction (on réutilise extract-document-data avec type tender)
      const { data: extractedData, error: extractError } = await supabase.functions
        .invoke('extract-document-data', {
          body: { fileUrl: signedData.signedUrl, documentType: 'tender' }
        });

      if (extractError) {
        console.error('Erreur Edge Function:', extractError);
        throw new Error(`Extraction failed: ${extractError.message || 'Unknown error'}`);
      }

      if (!extractedData) {
        throw new Error('Aucune donnée extraite du document');
      }

      // Pré-remplir le formulaire
      if (extractedData.title) setTitle(extractedData.title);
      if (extractedData.buyer) setBuyer(extractedData.buyer);
      if (extractedData.city) setCity(extractedData.city);
      if (extractedData.department) setDepartment(extractedData.department);
      if (extractedData.postal_code) setPostalCode(extractedData.postal_code);
      if (extractedData.budget_min) setBudgetMin(extractedData.budget_min.toString());
      if (extractedData.budget_max) setBudgetMax(extractedData.budget_max.toString());
      if (extractedData.deadline) setDeadline(extractedData.deadline);
      if (extractedData.category) setCategory(extractedData.category);
      if (extractedData.description) setDescription(extractedData.description);

      toast({
        title: "OCR terminé",
        description: "Vérifiez les données extraites avant de les enregistrer",
      });
    } catch (error: any) {
      console.error('Erreur OCR:', error);
      toast({
        title: "Extraction automatique échouée",
        description: "Remplissez le formulaire manuellement",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tenderData = {
        title,
        buyer,
        city: city || null,
        department: department || null,
        postal_code: postalCode || null,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        deadline: deadline || null,
        category: category || null,
        description: description || null,
        source: 'Import',
      };

      const { data, error } = await supabase
        .from("tenders")
        .insert(tenderData)
        .select()
        .single();

      if (error) throw error;

      // Calculer le matching automatiquement
      await supabase.functions.invoke('calculate-tender-match', {
        body: { tender_id: data.id, user_id: user?.id }
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders-catalog"] });
      toast({
        title: toasts.created,
        description: "L'appel d'offres a été importé",
      });

      // Reset form
      setTitle("");
      setBuyer("");
      setCity("");
      setDepartment("");
      setPostalCode("");
      setBudgetMin("");
      setBudgetMax("");
      setDeadline("");
      setCategory("");
      setDescription("");
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error("Error saving tender:", error);
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
          <Upload className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{labels.nav.tendersImport}</h1>
            <p className="text-muted-foreground">
              Importez un AO en PDF ou remplissez le formulaire manuellement
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fichier AO / DCE</CardTitle>
            <CardDescription>
              Uploadez un PDF pour extraction automatique des données
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="tender-file"
                disabled={extracting}
              />
              <Label
                htmlFor="tender-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Extraction en cours...
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : labels.forms.uploadHere}
                    </p>
                  </>
                )}
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations de l'AO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">{labels.forms.tenderTitle} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={placeholders.tender.title}
                required
              />
            </div>

            <div>
              <Label htmlFor="buyer">{labels.forms.tenderBuyer} *</Label>
              <Input
                id="buyer"
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                placeholder={placeholders.tender.buyer}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">{labels.forms.tenderCity}</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={placeholders.tender.city}
                />
              </div>
              <div>
                <Label htmlFor="department">Département</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="75"
                />
              </div>
              <div>
                <Label htmlFor="postal-code">{labels.forms.tenderCP}</Label>
                <Input
                  id="postal-code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder={placeholders.tender.cp}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget-min">{labels.forms.tenderBudgetMin}</Label>
                <Input
                  id="budget-min"
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder={placeholders.tender.budgetMin}
                />
              </div>
              <div>
                <Label htmlFor="budget-max">{labels.forms.tenderBudgetMax}</Label>
                <Input
                  id="budget-max"
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder={placeholders.tender.budgetMax}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deadline">{labels.forms.tenderDeadline}</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="category">{labels.forms.tenderCategory}</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Gros œuvre, Second œuvre"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description détaillée de l'AO..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={!title || !buyer || saveMutation.isPending}
          className="gap-2"
        >
          <FileText className="h-5 w-5" />
          Enregistrer l'AO
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default TendersImport;
