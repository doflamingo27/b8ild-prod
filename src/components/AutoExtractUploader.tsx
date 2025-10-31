import React, { useState } from 'react';
import { extractAuto } from '@/lib/docai/extractor';
import { saveExtraction } from '@/services/extractionService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, AlertCircle, Info } from 'lucide-react';
import AutoFillRecap from './AutoFillRecap';

type Props = {
  module: 'ao' | 'factures' | 'frais';
  entrepriseId: string;
  chantierId?: string;  // Optionnel - si absent, la facture sera en attente d'affectation
  onSaved?: (id: string) => void;
};

export default function AutoExtractUploader({ module, entrepriseId, chantierId, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<any>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const { toast } = useToast();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setLoading(true);
    setError(null);
    setExtraction(null);
    setSavedId(null);

    console.log('[DocAI] Starting extraction for:', f.name, 'Type:', f.type, 'Size:', f.size);

    try {
      if (f.size > 20 * 1024 * 1024) {
        throw new Error('Fichier trop volumineux (max 20 Mo).');
      }

      console.log('[DocAI] Calling extractAuto...');
      const res = await extractAuto(f, entrepriseId);
      console.log('[DocAI] Extraction result:', res);

      setExtraction(res);

      let table: 'tenders' | 'factures_fournisseurs' | 'frais_chantier' = 'frais_chantier';
      let payload: any = {
        extraction_json: res,
        confiance: res.confidence,
        pages_count: res.textPages.length,
      };

      if (module === 'ao') {
        table = 'tenders';
        const title = res.fields.aoRef ? `AO ${res.fields.aoRef}` : "Appel d'offres";
        payload = {
          ...payload,
          title,
          buyer: res.fields.aoOrga ?? 'Organisme',
          city: res.fields.aoVille,
          postal_code: res.fields.aoCP,
          deadline: res.fields.aoDeadline,
          budget_min: res.fields.aoBudget,
          source: 'Import',
        };
      } else if (module === 'factures') {
        table = 'factures_fournisseurs';

        let montant_ttc = res.fields.net ?? res.fields.ttc ?? null;
        let montant_ht = res.fields.ht ?? null;
        let tva_pct = res.fields.tvaPct ?? null;
        let tva_montant = res.fields.tvaAmt ?? null;

        // Sanity rules
        const MAX_AMOUNT = 999999999999.99;
        if (montant_ht && Math.abs(montant_ht) > MAX_AMOUNT) {
          console.warn('[DocAI] montant_ht trop grand, mis à NULL:', montant_ht);
          montant_ht = null;
        }
        if (montant_ttc && Math.abs(montant_ttc) > MAX_AMOUNT) {
          console.warn('[DocAI] montant_ttc trop grand, mis à NULL:', montant_ttc);
          montant_ttc = null;
        }
        if (tva_montant && Math.abs(tva_montant) > MAX_AMOUNT) {
          console.warn('[DocAI] tva_montant trop grand, mis à NULL:', tva_montant);
          tva_montant = null;
        }

        if (tva_pct != null) {
          if (tva_pct > 100) tva_pct = 100;
          if (tva_pct < 0) tva_pct = 0;
        }

        if (montant_ht && montant_ttc && tva_pct != null) {
          if (montant_ttc < montant_ht) {
            console.warn('[DocAI] TTC < HT, probable inversion, swap');
            [montant_ht, montant_ttc] = [montant_ttc, montant_ht];
          }
        }

        let extraction_status = 'complete';
        if (!montant_ttc && !montant_ht) {
          console.warn('[DocAI] Aucun montant extrait, statut incomplete');
          extraction_status = 'incomplete';
        }

        const nomFournisseur = res.fields.siret || 'Fournisseur inconnu';

        payload = {
          ...payload,
          chantier_id: chantierId || null,
          montant_ht: montant_ht ?? null,
          montant_ttc: montant_ttc ?? null,
          tva_pct: tva_pct ?? null,
          tva_montant: tva_montant ?? null,
          siret: res.fields.siret ?? null,
          date_facture: res.fields.dateDoc ?? null,
          categorie: 'Autres',
          fournisseur: nomFournisseur,
          extraction_status,
        };
      } else {
        payload = {
          ...payload,
          type_frais: 'Autres',
          montant_total: res.fields.net ?? res.fields.ttc ?? res.fields.ht,
        };
      }

      console.log('[DocAI] Saving to table:', table);
      const id = await saveExtraction(table, entrepriseId, payload);
      console.log('[DocAI] Saved successfully with ID:', id);

      setSavedId(id);

      const confidencePct = Math.round(res.confidence * 100);
      const hasMontants = !!(res.fields.net || res.fields.ttc || res.fields.ht);

      if (!hasMontants && module === 'factures') {
        toast({
          title: '⚠️ Extraction incomplète',
          description: 'Aucun montant détecté. Vérifiez le document.',
          variant: 'destructive',
        });
      } else if (res.confidence >= 0.8) {
        toast({
          title: "✅ Extraction terminée — c'est prêt",
          description: `Confiance : ${confidencePct}%`,
        });
      } else if (res.confidence >= 0.6) {
        toast({
          title: '⚠️ Extraction terminée — vérifiez',
          description: `Confiance : ${confidencePct}%`,
        });
      } else {
        toast({
          title: '⚠️ Extraction terminée — qualité faible',
          description: `Confiance : ${confidencePct}%`,
        });
      }

      onSaved?.(id);
    } catch (e: any) {
      console.error('[DocAI] ERROR:', e);
      setError(e.message || 'Erreur extraction');

      let userMessage = e.message;

      if (e.message?.includes('PDF')) {
        userMessage = 'Erreur lecture PDF. Essayez avec un fichier non protégé.';
      } else if (e.message?.includes('OCR')) {
        userMessage = 'OCR impossible. Photo trop floue ou fichier corrompu.';
      } else if (e.message?.includes('RPC') || e.message?.includes('not authorized')) {
        userMessage = 'Erreur de sauvegarde. Vérifiez vos permissions.';
      }

      toast({
        title: "Erreur d'extraction",
        description: userMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
          onChange={onFile}
          className="hidden"
          id={`upload-${module}`}
          disabled={loading}
        />
        <label htmlFor={`upload-${module}`} className="cursor-pointer flex flex-col items-center gap-3">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm font-medium">Analyse en cours…</p>
              <p className="text-xs text-muted-foreground">
                OCR + extraction automatique (10-30s)
              </p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium text-lg">Cliquer pour uploader un document</p>
              <p className="text-sm text-muted-foreground">PDF, JPG, PNG, CSV, XLSX (max 20 Mo)</p>
              <p className="text-xs text-muted-foreground mt-2">
                Extraction 100% automatique — Aucune saisie manuelle
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
