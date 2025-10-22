import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";
import ExtractionDebugPanel from "./ExtractionDebugPanel";

interface DocumentFallbackUIProps {
  documentUrl: string;
  partialData?: any;
  documentType: 'facture' | 'frais' | 'ao';
  onSave: (extractedData: any) => Promise<void>;
  onCancel: () => void;
  confidence?: number;
  debug?: any;
}

export const DocumentFallbackUI = ({ 
  documentUrl, 
  partialData, 
  documentType, 
  onSave, 
  onCancel,
  confidence = 0,
  debug
}: DocumentFallbackUIProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fournisseur: partialData?.fournisseur_nom || partialData?.fournisseur || "",
    siret: partialData?.siret || "",
    date: partialData?.date_document_iso || "",
    montantHT: partialData?.montant_ht || partialData?.totaux?.ht || "",
    tvaPct: partialData?.tva_pct || partialData?.totaux?.tva_pct || "",
    montantTVA: partialData?.tva_montant || partialData?.totaux?.tva_montant || "",
    montantTTC: partialData?.montant_ttc || partialData?.totaux?.ttc || "",
    numFacture: partialData?.numero_facture || "",
    // AO
    titre: partialData?.titre || partialData?.ao?.titre || "",
    organisme: partialData?.organisme || partialData?.ao?.organisme || "",
    ville: partialData?.ville || partialData?.ao?.ville || "",
    cp: partialData?.code_postal || partialData?.ao?.cp || "",
    dateLimite: partialData?.date_limite_candidature || partialData?.ao?.date_limite_iso || "",
    montantEstime: partialData?.montant_estime || partialData?.ao?.montant_estime || "",
  });
  
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const calculateCoherence = () => {
    if (documentType === 'ao') {
      let score = 0;
      if (formData.titre) score += 0.25;
      if (formData.organisme) score += 0.25;
      if (formData.dateLimite) score += 0.25;
      if (formData.cp) score += 0.25;
      setCoherenceScore(score);
      return;
    }
    
    const ht = parseFloat(formData.montantHT);
    const tva = parseFloat(formData.tvaPct);
    const ttc = parseFloat(formData.montantTTC);
    
    if (isNaN(ht) || isNaN(ttc)) {
      setCoherenceScore(0);
      return;
    }
    
    let score = 0.4; // Base
    
    if (!isNaN(tva)) {
      const expected = ht * (1 + tva / 100);
      const diff = Math.abs(ttc - expected);
      if (diff <= expected * 0.02) {
        score = 0.95;
      } else {
        score = 0.5;
      }
    } else if (ttc >= ht && ttc <= ht * 1.3) {
      score = 0.7;
    }
    
    if (formData.siret) score += 0.05;
    if (formData.date) score += 0.05;
    
    setCoherenceScore(Math.min(score, 1.0));
  };

  useEffect(() => {
    calculateCoherence();
  }, [formData]);
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = async () => {
    if (documentType !== 'ao' && coherenceScore < 0.6) {
      toast({
        title: "Vérification requise",
        description: "Les montants ne semblent pas cohérents. Veuillez vérifier.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      const extractedData = {
        type_document: documentType,
        fournisseur_nom: formData.fournisseur,
        fournisseur: formData.fournisseur,
        siret: formData.siret,
        date_document_iso: formData.date,
        numero_facture: formData.numFacture,
        montant_ht: parseFloat(formData.montantHT) || null,
        tva_pct: parseFloat(formData.tvaPct) || null,
        tva_montant: parseFloat(formData.montantTVA) || null,
        montant_ttc: parseFloat(formData.montantTTC) || null,
        totaux: {
          ht: parseFloat(formData.montantHT) || null,
          tva_pct: parseFloat(formData.tvaPct) || null,
          tva_montant: parseFloat(formData.montantTVA) || null,
          ttc: parseFloat(formData.montantTTC) || null
        },
        ao: documentType === 'ao' ? {
          titre: formData.titre,
          organisme: formData.organisme,
          ville: formData.ville,
          cp: formData.cp,
          date_limite_iso: formData.dateLimite,
          montant_estime: parseFloat(formData.montantEstime) || null
        } : null,
        titre: documentType === 'ao' ? formData.titre : undefined,
        organisme: documentType === 'ao' ? formData.organisme : undefined,
        ville: documentType === 'ao' ? formData.ville : undefined,
        code_postal: documentType === 'ao' ? formData.cp : undefined,
        date_limite_candidature: documentType === 'ao' ? formData.dateLimite : undefined,
        montant_estime: documentType === 'ao' ? parseFloat(formData.montantEstime) || null : undefined,
        meta: {
          confiance: coherenceScore,
          method: 'manual_fallback'
        }
      };
      
      await onSave(extractedData);
      
      toast({
        title: "Document enregistré",
        description: "Les données ont été extraites avec succès."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full">
      {/* Aperçu document */}
      <div className="space-y-4">
        <Card className="p-4 h-full">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Aperçu du document</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="border rounded-lg overflow-hidden bg-muted">
              <iframe
                src={documentUrl}
                className="w-full h-[550px]"
                title="Aperçu document"
              />
            </div>
            <div className="mt-4 p-3 bg-primary/5 rounded-md text-sm">
              <p className="text-muted-foreground">
                💡 <strong>Astuce</strong> : Sélectionnez les zones du document et recopiez les valeurs dans les champs à droite.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Formulaire extraction */}
      <div className="space-y-4">
        {/* Indicateur de confiance */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Qualité d'extraction</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={
                  confidence >= 0.80 ? 'default' :
                  confidence >= 0.50 ? 'secondary' :
                  'destructive'
                } className="text-xs">
                  {(confidence * 100).toFixed(0)}% confiance
                </Badge>
                {coherenceScore >= 0.75 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Cohérent
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="text-xs">
              {confidence >= 0.80 
                ? "Vérifiez les valeurs avant enregistrement"
                : "Plusieurs champs nécessitent confirmation"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Debug panel (si disponible) */}
        {debug && <ExtractionDebugPanel debug={debug} visible={confidence < 0.50} />}

        <Card className="p-4">
          <CardHeader className="px-0 pt-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Extraction manuelle</CardTitle>
              {coherenceScore >= 0.75 ? (
                <Badge variant="default" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Score {Math.round(coherenceScore * 100)}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Score {Math.round(coherenceScore * 100)}%
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="px-0 pb-0">
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
              {documentType === 'ao' ? (
                <>
                  <div>
                    <Label htmlFor="titre">Titre de l'AO *</Label>
                    <Input
                      id="titre"
                      value={formData.titre}
                      onChange={(e) => handleInputChange('titre', e.target.value)}
                      placeholder="Ex: Rénovation école primaire..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="organisme">Organisme acheteur *</Label>
                    <Input
                      id="organisme"
                      value={formData.organisme}
                      onChange={(e) => handleInputChange('organisme', e.target.value)}
                      placeholder="Ex: Mairie de Paris"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ville">Ville</Label>
                      <Input
                        id="ville"
                        value={formData.ville}
                        onChange={(e) => handleInputChange('ville', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cp">Code postal</Label>
                      <Input
                        id="cp"
                        value={formData.cp}
                        onChange={(e) => handleInputChange('cp', e.target.value)}
                        placeholder="75001"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="dateLimite">Date limite candidature *</Label>
                    <Input
                      id="dateLimite"
                      type="date"
                      value={formData.dateLimite}
                      onChange={(e) => handleInputChange('dateLimite', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="montantEstime">Montant estimé (€)</Label>
                    <Input
                      id="montantEstime"
                      type="number"
                      step="0.01"
                      value={formData.montantEstime}
                      onChange={(e) => handleInputChange('montantEstime', e.target.value)}
                      placeholder="150000.00"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="fournisseur">Fournisseur / Client</Label>
                    <Input
                      id="fournisseur"
                      value={formData.fournisseur}
                      onChange={(e) => handleInputChange('fournisseur', e.target.value)}
                      placeholder="Nom du fournisseur"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="siret">SIRET</Label>
                      <Input
                        id="siret"
                        value={formData.siret}
                        onChange={(e) => handleInputChange('siret', e.target.value)}
                        placeholder="123 456 789 00012"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date document</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="numFacture">N° Facture</Label>
                    <Input
                      id="numFacture"
                      value={formData.numFacture}
                      onChange={(e) => handleInputChange('numFacture', e.target.value)}
                      placeholder="FA-2025-001"
                    />
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">Montants</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="montantHT">Montant HT (€) *</Label>
                        <Input
                          id="montantHT"
                          type="number"
                          step="0.01"
                          value={formData.montantHT}
                          onChange={(e) => handleInputChange('montantHT', e.target.value)}
                          placeholder="1000.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tvaPct">TVA (%)</Label>
                        <Input
                          id="tvaPct"
                          type="number"
                          step="0.01"
                          value={formData.tvaPct}
                          onChange={(e) => handleInputChange('tvaPct', e.target.value)}
                          placeholder="20.00"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label htmlFor="montantTVA">Montant TVA (€)</Label>
                        <Input
                          id="montantTVA"
                          type="number"
                          step="0.01"
                          value={formData.montantTVA}
                          onChange={(e) => handleInputChange('montantTVA', e.target.value)}
                          placeholder="200.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="montantTTC">Total TTC (€) *</Label>
                        <Input
                          id="montantTTC"
                          type="number"
                          step="0.01"
                          value={formData.montantTTC}
                          onChange={(e) => handleInputChange('montantTTC', e.target.value)}
                          placeholder="1200.00"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
