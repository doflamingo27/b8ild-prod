import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { extractWithOcrSpace } from '@/services/ocrspace';
import { parseFrenchDocument } from '@/lib/parseFR';
import { saveExtraction } from '@/services/extractionService';
import AutoFillRecap from './AutoFillRecap';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, AlertCircle } from 'lucide-react';

type Props = {
  module: 'ao' | 'factures' | 'frais' | 'devis';
  entrepriseId: string;
  chantierId?: string;
  onSaved?: (id: string) => void;
};

export default function AutoExtractUploader({ module, entrepriseId, chantierId, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<any | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setExtraction(null);
    setSavedId(null);

    try {
      console.log('[AutoExtractUploader] ========================================');
      console.log('[AutoExtractUploader] Début extraction:', file.name);
      console.log('[AutoExtractUploader] Module:', module);
      
      // 1️⃣ OCR.space
      const { text, confidence: ocrConfidence, provider } = await extractWithOcrSpace(file);
      console.log('[AutoExtractUploader] OCR confidence:', ocrConfidence);
      console.log('[AutoExtractUploader] Texte OCR (premiers 800 caractères):', text.substring(0, 800));

      // 2️⃣ Parser français
      console.log('[AutoExtractUploader] ===== PARSING AVEC parseFR =====');
      const fields = parseFrenchDocument(text, module);
      console.log('[AutoExtractUploader] ===== CHAMPS EXTRAITS PAR parseFR =====');
      console.log('[AutoExtractUploader] Champs extraits:', JSON.stringify(fields, null, 2));
      console.log('[AutoExtractUploader] =========================================');
      
      // Debug: Afficher texte OCR brut (1000 premiers caractères)
      console.log('[Parser] Raw OCR text (first 1000 chars):', text.substring(0, 1000));
      
      // Debug: Afficher tous les matches pour diagnostiquer
      if (module === 'factures' || module === 'frais' || module === 'devis') {
        const { R } = await import('@/lib/extract/regexFR');
        console.log('[Parser] All HT matches:', [...text.matchAll(R.HT)].map(m => m[1]));
        console.log('[Parser] All TTC matches:', [...text.matchAll(R.TTC)].map(m => m[1]));
        console.log('[Parser] All TVA % matches:', [...text.matchAll(R.TVA_PCT)].map(m => m[1]));
        console.log('[Parser] All TVA amount matches:', [...text.matchAll(R.TVA_AMT)].map(m => m[1]));
        
        // Extraire tous les montants pour l'extraction par proximité
        const allAmounts = [...text.matchAll(/([0-9\s]+[,\.]\d{2})\s*€/g)].map((m, i) => ({
          index: i,
          value: m[1],
          position: m.index
        }));
        console.log('[Parser] All amounts detected:', allAmounts);
      }
      
      const finalFields = {
        fournisseur: fields.fournisseur,
        montant_ht: fields.ht,
        montant_ttc: fields.ttc ?? fields.net,
        tva_pct: fields.tvaPct,
        tva_montant: fields.tvaAmt,
        siret: fields.siret,
        date_facture: fields.dateDoc,
      };
      
      console.log('[Parser] Final extracted fields:', finalFields);
      console.log('[Parser] Validation:', {
        totalsOk: fields.totalsOk,
        htVsTtc: fields.ht && fields.ttc ? `HT: ${fields.ht}, TTC: ${fields.ttc}, ratio: ${(fields.ttc / fields.ht).toFixed(2)}` : 'N/A'
      });
      
      // Alertes si extraction incomplète
      if (!fields.ht && !fields.ttc && !fields.net) {
        console.warn('[Parser] ⚠️ Aucun montant détecté ! Vérifier les regex.');
      }
      if (!fields.fournisseur) {
        console.warn('[Parser] ⚠️ Fournisseur non détecté !');
      }

      // 3️⃣ Calcul confiance finale
      let finalConfidence = ocrConfidence;
      if (fields.totalsOk) finalConfidence += 0.15;
      if (fields.siret) finalConfidence += 0.1;
      finalConfidence = Math.min(1, finalConfidence);

      // 4️⃣ Mapping table + payload
      let table: 'tenders' | 'factures_fournisseurs' | 'frais_chantier' | 'devis';
      let payload: any = { 
        extraction_provider: provider,
        extraction_json: { text, fields, confidence: finalConfidence },
        confiance: finalConfidence 
      };

      if (module === 'ao') {
        table = 'tenders';
        payload = {
          ...payload,
          title: fields.aoRef ? `AO ${fields.aoRef}` : 'Appel d\'offres',
          buyer: fields.aoOrga ?? null,
          city: null,
          postal_code: fields.aoCP ?? null,
          deadline: fields.aoDeadline ?? null,
          budget_min: fields.aoBudget ?? null,
        };
      } else if (module === 'factures') {
        table = 'factures_fournisseurs';

        // ✅ FAIRE CONFIANCE aux calculs de parseFR.ts - NE PAS modifier après coup
        // parseFR.ts a déjà géré l'inversion HT/TTC et recalculé TVA + TTC correctement
        const montant_ht = fields.ht ?? null;
        const montant_ttc = fields.ttc ?? null; // ✅ Utiliser TTC recalculé, pas NET
        const tva_montant = fields.tvaAmt ?? null;

        // Borner TVA %
        let tva_pct = fields.tvaPct ?? null;
        if (tva_pct != null) {
          tva_pct = Math.max(0, Math.min(100, tva_pct));
        }

        // Borner montants (sécurité DB uniquement)
        const MAX = 999999999999.99;
        const safe_ht = (montant_ht != null && montant_ht >= 0 && montant_ht <= MAX) ? montant_ht : null;
        const safe_ttc = (montant_ttc != null && montant_ttc >= 0 && montant_ttc <= MAX) ? montant_ttc : null;
        const safe_tva = (tva_montant != null && tva_montant >= 0 && tva_montant <= MAX) ? tva_montant : null;

        console.log('[AutoExtract] Using calculated values from parseFR:', { 
          montant_ht: safe_ht, 
          tva_pct, 
          tva_montant: safe_tva, 
          montant_ttc: safe_ttc 
        });

        payload = {
          ...payload,
          fournisseur: fields.fournisseur ?? 'Non renseigné',
          montant_ht: safe_ht,
          tva_pct,
          tva_montant: safe_tva,
          montant_ttc: safe_ttc,
          siret: fields.siret ?? null,
          date_facture: fields.dateDoc ?? null,
          categorie: 'Autres',
          chantier_id: chantierId ?? null,
        };

        // Définir extraction_status
        if (!montant_ht && !montant_ttc) {
          payload.extraction_status = 'incomplete';
        } else {
          payload.extraction_status = 'complete';
        }

      } else if (module === 'devis') {
        table = 'devis';

        // ✅ Même logique que factures
        const montant_ht = fields.ht ?? null;
        const montant_ttc = fields.ttc ?? null;
        const tva_montant = fields.tvaAmt ?? null;

        // Borner TVA %
        let tva_pct = fields.tvaPct ?? null;
        if (tva_pct != null) {
          tva_pct = Math.max(0, Math.min(100, tva_pct));
        }

        // Borner montants
        const MAX = 999999999999.99;
        const safe_ht = (montant_ht != null && montant_ht >= 0 && montant_ht <= MAX) ? montant_ht : null;
        const safe_ttc = (montant_ttc != null && montant_ttc >= 0 && montant_ttc <= MAX) ? montant_ttc : null;

        payload = {
          ...payload,
          chantier_id: chantierId ?? null,
          montant_ht: safe_ht,
          tva: tva_pct,
          montant_ttc: safe_ttc,
          statut: 'brouillon',
          actif: true, // Sera géré par insert_devis_extraction
        };

      } else {
        table = 'frais_chantier';
        payload = {
          ...payload,
          chantier_id: chantierId ?? null,
          type_frais: 'Autres',
          montant_total: fields.net ?? fields.ttc ?? fields.ht ?? null,
          fournisseur_nom: 'Non renseigné',
          siret: fields.siret ?? null,
          date_frais: fields.dateDoc ?? null,
        };
      }

      // ✅ Alerte visuelle si extraction suspecte détectée
      if (module === 'factures' || module === 'devis') {
        if (fields.ht && fields.ttc) {
          const ratio = fields.ttc / fields.ht;
          if (ratio < 1.0 || ratio > 1.5) {
            toast({
              variant: "destructive",
              title: "⚠️ Extraction suspecte détectée",
              description: `Le TTC (${fields.ttc}€) semble incohérent avec le HT (${fields.ht}€). Vérifiez les valeurs extraites.`,
            });
          }
        }
      }

      // 5️⃣ Sauvegarde DB
      console.log('[AutoExtractUploader] ===== PAYLOAD FINAL ENVOYÉ À LA DB =====');
      console.log('[AutoExtractUploader] Table:', table);
      console.log('[AutoExtractUploader] Payload:', JSON.stringify(payload, null, 2));
      console.log('[AutoExtractUploader] =============================================');
      
      const id = await saveExtraction(table, entrepriseId, payload);
      
      console.log('[AutoExtractUploader] ✅ Extraction enregistrée avec succès:', id);
      console.log('[AutoExtractUploader] ========================================');

      setSavedId(id);
      setExtraction({ fields, confidence: finalConfidence });

      // 6️⃣ Toast
      if (finalConfidence >= 0.8) {
        toast({
          title: "✅ Extraction réussie",
          description: `Confiance: ${Math.round(finalConfidence * 100)}%`,
        });
      } else if (finalConfidence >= 0.6) {
        toast({
          title: "⚠️ Extraction réussie",
          description: "Vérifiez rapidement les montants extraits.",
        });
      } else {
        toast({
          title: "⚠️ Qualité faible",
          description: "Pensez à vérifier les champs extraits.",
          variant: "destructive",
        });
      }

      onSaved?.(id);
    } catch (err: any) {
      console.error('[OCR] Error:', err);
      
      // Messages d'erreur contextuels
      let userMessage = err.message;
      if (err.message.includes('5 Mo')) {
        userMessage = 'Fichier trop volumineux. Max 5 Mo pour le plan gratuit OCR.space.';
      } else if (err.message.includes('illisible')) {
        userMessage = 'Document illisible. Essayez avec une photo plus nette ou un scan de meilleure qualité.';
      } else if (err.message.includes('exceeded')) {
        userMessage = 'Quota journalier OCR.space atteint (500/jour). Réessayez demain.';
      }

      setError(userMessage);
      toast({
        title: "Erreur extraction",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      e.currentTarget.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onFile}
          className="hidden"
          id={`upload-${module}`}
          disabled={loading}
        />
        <label htmlFor={`upload-${module}`} className="cursor-pointer flex flex-col items-center gap-3">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm font-medium">Analyse OCR en cours…</p>
              <p className="text-xs text-muted-foreground">
                Extraction automatique (2-5s)
              </p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium text-lg">Cliquer pour uploader un document</p>
              <p className="text-sm text-muted-foreground">PDF, JPG, PNG (max 5 Mo)</p>
              <p className="text-xs text-muted-foreground mt-2">
                API OCR.space gratuite • 500 requêtes/jour
              </p>
            </>
          )}
        </label>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {extraction && savedId && (
        <AutoFillRecap module={module} confidence={extraction.confidence} fields={extraction.fields} />
      )}
    </div>
  );
}
