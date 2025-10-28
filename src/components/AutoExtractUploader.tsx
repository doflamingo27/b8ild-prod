import React, { useState } from 'react';
import { extractAuto } from '@/lib/extract/extractor';
import { saveExtraction } from '@/services/extractionService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AutoFillRecap from './AutoFillRecap';
import { supabase } from '@/integrations/supabase/client';

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
    
    console.log('[UPLOAD] Starting extraction for:', f.name, 'Type:', f.type, 'Size:', f.size);
    
    try {
      if (f.size > 20 * 1024 * 1024) {
        throw new Error('Fichier trop volumineux (max 20 Mo).');
      }
      
      console.log('[UPLOAD] Calling extractAuto...');
      const res = await extractAuto(f, entrepriseId);
      console.log('[UPLOAD] Extraction result:', res);
      
      // Fallback AI si confiance trop faible
      if (res.confidence < 0.30) {
        console.warn('[UPLOAD] Low confidence, trying AI fallback...');
        
        try {
          // Upload temporaire dans le bucket documents
          const fileName = `temp/${Date.now()}_${f.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, f);
          
          if (uploadError) throw uploadError;
          
          // Appel edge function
          const { data: aiData, error: aiError } = await supabase.functions.invoke('extract-document-v3', {
            body: { 
              fileUrl: fileName,
              documentType: module === 'ao' ? 'tender' : 'invoice'
            }
          });
          
          if (!aiError && aiData?.success) {
            console.log('[UPLOAD] AI extraction succeeded:', aiData);
            
            // Fusionner les résultats (AI prioritaire si confiance > locale)
            if (aiData.confidence > res.confidence) {
              res = {
                ...res,
                fields: { ...res.fields, ...aiData.data },
                confidence: Math.max(res.confidence, aiData.confidence),
                debug: { ...res.debug, ai_fallback: true }
              };
            }
          }
          
          // Cleanup
          await supabase.storage.from('documents').remove([fileName]);
        } catch (aiErr) {
          console.error('[UPLOAD] AI fallback failed:', aiErr);
          // Continuer avec résultat local
        }
      }
      
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
        
        const montant_ttc = res.fields.net ?? res.fields.ttc ?? null;
        const montant_ht = res.fields.ht ?? null;
        
        // ✅ CORRECTION : Utiliser le nom du fournisseur, pas le SIRET
        const nomFournisseur = res.fields.fournisseur || res.fields.siret || 'Fournisseur inconnu';
        
        console.log('[UPLOAD] Facture extraction:', {
          montant_ht,
          montant_ttc,
          tva_pct: res.fields.tvaPct,
          fournisseur: nomFournisseur,
          siret: res.fields.siret
        });
        
        if (!montant_ttc && !montant_ht) {
          throw new Error('Impossible d\'extraire les montants. Document illisible ou format non supporté.');
        }
        
        payload = { 
          ...payload, 
          montant_ht: montant_ht, 
          montant_ttc: montant_ttc,
          tva_pct: res.fields.tvaPct, 
          tva_montant: res.fields.tvaAmt,
          siret: res.fields.siret, 
          date_facture: res.fields.dateDoc, 
          categorie: 'Autres', 
          fournisseur: nomFournisseur  // ✅ CORRIGÉ
        };
        
        console.log('[UPLOAD] Final payload:', payload);
      } else {
        payload = { ...payload, type_frais: 'Autres', montant_total: res.fields.net ?? res.fields.ttc ?? res.fields.ht };
      }

      console.log('[UPLOAD] Saving to table:', table, 'Payload:', payload);
      const id = await saveExtraction(table, entrepriseId, payload);
      console.log('[UPLOAD] Saved successfully with ID:', id);
      
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
      console.error('[UPLOAD] ERROR:', e);
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
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-muted-foreground absolute top-4 right-4 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">
              Formats acceptés : PDF (texte ou scanné), JPG, PNG. 
              L'extraction est 100% automatique avec OCR multipasse.
              Qualité optimale : PDF texte ou photo nette.
            </p>
          </TooltipContent>
        </Tooltip>
        
        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} className="hidden" 
          id={`upload-${module}`} disabled={loading} />
        <label htmlFor={`upload-${module}`} className="cursor-pointer flex flex-col items-center gap-3">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm font-medium">Analyse en cours (OCR + extraction)…</p>
              <p className="text-xs text-muted-foreground">Cela peut prendre 10-30 secondes</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium text-lg">Cliquer pour uploader un document</p>
              <p className="text-sm text-muted-foreground">PDF, JPG, PNG (max 20 Mo)</p>
              <p className="text-xs text-muted-foreground mt-2">Extraction automatique 100% — Aucune saisie manuelle</p>
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
