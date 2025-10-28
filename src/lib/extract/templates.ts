import { supabase } from '@/integrations/supabase/client';

export type Template = {
  id: string;
  fournisseur_nom?: string;
  siret?: string;
  anchors: any;
  field_positions?: any;
};

export async function getTemplate({
  entrepriseId,
  siret,
  nom
}: {
  entrepriseId: string;
  siret?: string | null;
  nom?: string | null;
}): Promise<Template | null> {
  if (!siret && !nom) return null;
  
  let query = supabase
    .from('fournisseurs_templates')
    .select('*')
    .eq('entreprise_id', entrepriseId);
  
  if (siret) {
    query = query.eq('siret', siret);
  } else if (nom) {
    query = query.eq('fournisseur_nom', nom);
  }
  
  const { data } = await query.limit(1).maybeSingle();
  return data ?? null;
}

export async function saveTemplate(payload: {
  entrepriseId: string;
  fournisseur_nom?: string;
  siret?: string;
  anchors: any;
  field_positions?: any;
}): Promise<void> {
  const record = {
    entreprise_id: payload.entrepriseId,
    fournisseur_nom: payload.fournisseur_nom || '',
    siret: payload.siret,
    anchors: payload.anchors,
    field_positions: payload.field_positions || {}
  };
  
  await supabase.from('fournisseurs_templates').upsert(record);
}
