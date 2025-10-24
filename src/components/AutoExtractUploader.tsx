import React, { useState } from 'react';
import { extractFromFile } from '@/lib/extract/extractor';
import { saveExtraction } from '@/services/extractionService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import AutoFillRecap from './AutoFillRecap';

type Props = {
  module: 'ao' | 'factures' | 'frais';
  entrepriseId: string;
  onSaved?: (id: string) => void;
};

export default function AutoExtractUploader({ module, entrepriseId, onSaved }: Props) {
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
    
    try {
      if (f.size > 20 * 1024 * 1024) {
        throw new Error('Fichier trop volumineux (max 20 Mo).');
      }
      
      const res = await extractFromFile(f, entrepriseId);
      setExtraction(res);
      
      let table: 'tenders' | 'factures_fournisseurs' | 'frais_chantier' = 'frais_chantier';
      let payload: any = { extraction_json: res, confiance: res.confidence, pages_count: res.rawText.length };

      if (module === 'ao') {
        table = 'tenders';
        const title = res.fields.aoRef ? `AO ${res.fields.aoRef}` : 'Appel d\'offres';
        payload = { ...payload, title, buyer: res.fields.aoOrga ?? 'Organisme', city: res.fields.aoVille, 
          postal_code: res.fields.aoCP, deadline: res.fields.aoDeadline, budget_min: res.fields.aoBudget, source: 'Import' };
      } else if (module === 'factures') {
        table = 'factures_fournisseurs';
        payload = { ...payload, montant_ht: res.fields.ht, tva_pct: res.fields.tvaPct, tva_montant: res.fields.tvaAmt,
          siret: res.fields.siret, date_facture: res.fields.dateDoc, categorie: 'Autres', fournisseur: 'À identifier' };
      } else {
        payload = { ...payload, type_frais: 'Autres', montant_total: res.fields.net ?? res.fields.ttc ?? res.fields.ht };
      }

      const id = await saveExtraction(table, entrepriseId, payload);
      setSavedId(id);
      
      const confidencePct = Math.round(res.confidence * 100);
      if (res.confidence >= 0.80) {
        toast({ title: "Extraction terminée — c'est prêt.", description: `Confiance : ${confidencePct}%` });
      } else if (res.confidence >= 0.60) {
        toast({ title: "Extraction terminée — vérifiez rapidement.", description: `Confiance : ${confidencePct}%` });
      } else {
        toast({ title: "Extraction terminée — qualité faible.", description: `Confiance : ${confidencePct}%` });
      }
      
      onSaved?.(id);
    } catch (e: any) {
      setError(e.message || 'Erreur extraction');
      toast({ title: "Erreur d'extraction", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} className="hidden" 
          id={`upload-${module}`} disabled={loading} />
        <label htmlFor={`upload-${module}`} className="cursor-pointer flex flex-col items-center gap-3">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm">Analyse en cours…</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Cliquer pour uploader</p>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG (max 20 Mo)</p>
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
