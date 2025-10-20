import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface DocumentFallbackUIProps {
  documentUrl: string;
  partialData?: any;
  documentType: 'facture' | 'frais' | 'ao';
  onSave: (extractedData: any) => Promise<void>;
  onCancel: () => void;
}

export const DocumentFallbackUI = ({
  documentUrl,
  partialData,
  documentType,
  onSave,
  onCancel
}: DocumentFallbackUIProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fournisseur: partialData?.fournisseur_nom || "",
    siret: partialData?.siret || "",
    date: partialData?.date_document_iso || "",
    montantHT: partialData?.totaux?.ht || "",
    tvaPct: partialData?.totaux?.tva_pct || "",
    montantTVA: partialData?.totaux?.tva_montant || "",
    montantTTC: partialData?.totaux?.ttc || "",
    numFacture: "",
    // AO
    titre: partialData?.ao?.titre || "",
    organisme: partialData?.ao?.organisme || "",
    ville: partialData?.ao?.ville || "",
    cp: partialData?.ao?.cp || "",
    dateLimite: partialData?.ao?.date_limite_iso || "",
    montantEstime: partialData?.ao?.montant_estime || "",
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
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTimeout(calculateCoherence, 100);
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
        siret: formData.siret,
        date_document_iso: formData.date,
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Aperçu document */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Aperçu du document</h3>
        <div className="border rounded-lg overflow-hidden bg-muted">
          <iframe
            src={documentUrl}
            className="w-full h-[600px]"
            title="Aperçu document"
          />
        </div>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md text-sm">
          <p className="text-blue-700 dark:text-blue-300">
            💡 <strong>Astuce</strong> : Sélectionnez les zones du document et recopiez les valeurs dans les champs à droite.
          </p>
        </div>
      </Card>
      
      {/* Formulaire extraction */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Extraction manuelle</h3>
          {coherenceScore >= 0.75 ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Vérifié {Math.round(coherenceScore * 100)}%
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-4 w-4" />
              Score {Math.round(coherenceScore * 100)}%
            </Badge>
          )}
        </div>
        
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
      </Card>
    </div>
  );
};