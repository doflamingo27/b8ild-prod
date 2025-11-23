import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chantierId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Charger TOUTES les données du chantier
    const { data: chantier } = await supabase
      .from('chantiers')
      .select('*')
      .eq('id', chantierId)
      .single();

    const { data: devis } = await supabase
      .from('devis')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('created_at', { ascending: false });

    const { data: factures } = await supabase
      .from('factures_fournisseurs')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('date_facture', { ascending: false });

    const { data: frais } = await supabase
      .from('frais_chantier')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('date_frais', { ascending: false });

    const { data: paiements } = await supabase
      .from('paiements_clients')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('date_paiement', { ascending: false });

    const { data: affectations } = await supabase
      .from('affectations_chantiers')
      .select('*, membres_equipe(*)')
      .eq('chantier_id', chantierId);

    const { data: metrics } = await supabase
      .from('chantier_metrics_realtime')
      .select('*')
      .eq('chantier_id', chantierId)
      .single();

    const { data: snapshots } = await supabase
      .from('chantier_snapshots')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('d', { ascending: false })
      .limit(30);

    // 2. Calculer les totaux
    const totalFactures = factures?.reduce((sum, f) => sum + (f.montant_ht || 0), 0) || 0;
    const totalFrais = frais?.reduce((sum, f) => sum + (f.montant_total || 0), 0) || 0;
    const totalPaiements = paiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
    const devisActif = devis?.find(d => d.actif);

    // 3. Construire le prompt détaillé
    const prompt = `Tu es un expert en gestion de chantiers BTP en France. Analyse ce chantier en PROFONDEUR et fournis un rapport objectif basé sur les données.

# DONNÉES DU CHANTIER "${chantier?.nom_chantier}"

## 1. INFORMATIONS GÉNÉRALES
- Client : ${chantier?.client}
- État : ${chantier?.etat_chantier}
- Dates : Début ${chantier?.date_debut_prevue}, Fin prévue ${chantier?.date_fin_prevue}
- Durée estimée : ${chantier?.duree_estimee_jours} jours travaillés

## 2. DONNÉES FINANCIÈRES
### Budget & Devis (${devis?.length || 0} devis)
${devis?.map(d => `- Devis ${d.version} (${d.statut}${d.actif ? ' - ACTIF' : ''}) : ${d.montant_ht}€ HT, ${d.montant_ttc}€ TTC`).join('\n') || 'Aucun devis'}

### Factures Fournisseurs (${factures?.length || 0} factures, Total: ${totalFactures.toFixed(2)}€)
${factures?.slice(0, 10).map(f => `- ${f.fournisseur || 'N/A'} (${f.categorie}) : ${f.montant_ht}€ HT le ${f.date_facture}`).join('\n') || 'Aucune facture'}

### Frais Annexes (${frais?.length || 0} dépenses, Total: ${totalFrais.toFixed(2)}€)
${frais?.slice(0, 10).map(f => `- ${f.type_frais} : ${f.montant_total}€ le ${f.date_frais}`).join('\n') || 'Aucun frais'}

### Paiements Clients (${paiements?.length || 0} paiements, Total: ${totalPaiements.toFixed(2)}€)
${paiements?.slice(0, 5).map(p => `- ${p.type} : ${p.montant}€ le ${p.date_paiement} (${p.statut})`).join('\n') || 'Aucun paiement'}

## 3. DONNÉES D'ÉQUIPE
### Affectations (${affectations?.length || 0} membres affectés)
${affectations?.slice(0, 10).map(a => {
  const membre = a.membres_equipe;
  return `- ${membre?.prenom} ${membre?.nom} (${membre?.poste}) : ${a.jours_travailles}j @ ${a.taux_horaire_specifique || membre?.taux_horaire}€/h`;
}).join('\n') || 'Aucune affectation'}

## 4. MÉTRIQUES EN TEMPS RÉEL
${metrics ? `
- Rentabilité : ${metrics.metrics?.profitability_pct || 0}%
- Marge brute : ${metrics.metrics?.marge_a_date || 0}€
- Coût/jour équipe : ${metrics.metrics?.cout_journalier_equipe || 0}€
- Jours restants avant déficit : ${metrics.metrics?.jours_restants_rentables || 'N/A'}
- Jour critique : J+${metrics.metrics?.jour_critique || 'N/A'}
` : 'Métriques non disponibles'}

## 5. ÉVOLUTION HISTORIQUE (30 derniers jours)
${snapshots?.slice(0, 10).map(s => `- ${s.d} : Coûts ${s.couts_fixes}€, Rentabilité ${s.profitability_pct}%`).join('\n') || 'Pas d\'historique'}

---

# ANALYSE DEMANDÉE

Fournis une analyse JSON structurée avec :

{
  "score_global": 0-100,
  "statut": "excellent|bon|moyen|problematique|critique",
  
  "problemes_detectes": [
    {
      "categorie": "budget|planning|equipe|fournisseurs|cashflow",
      "severite": "critique|haute|moyenne|faible",
      "titre": "Titre court du problème",
      "description": "Explication détaillée objective",
      "impact_financier": "Impact estimé en € ou %",
      "tendance": "aggravation|stable|amelioration"
    }
  ],
  
  "points_positifs": [
    {
      "categorie": "budget|planning|equipe|fournisseurs|cashflow",
      "titre": "Ce qui fonctionne bien",
      "description": "Explication détaillée"
    }
  ],
  
  "recommandations": [
    {
      "priorite": "urgente|haute|moyenne|basse",
      "categorie": "budget|planning|equipe|fournisseurs|cashflow",
      "titre": "Titre de la recommandation",
      "description": "Explication de ce qui doit être amélioré",
      "actions_concretes": [
        "Action 1 précise et actionnable",
        "Action 2 précise et actionnable"
      ],
      "impact_attendu": "Impact estimé en € ou %",
      "delai_action": "immédiat|1-3j|1-2sem|1mois"
    }
  ],
  
  "previsions": {
    "date_fin_estimee": "YYYY-MM-DD",
    "confiance_prevision": 0-100,
    "cout_total_estime": "Estimation du coût final",
    "risque_depassement_budget": 0-100,
    "rentabilite_finale_estimee": "Estimation en %"
  },
  
  "comparaison_standards_btp": {
    "rentabilite": "Analyse par rapport aux standards BTP français (20-30%)",
    "delais": "Analyse du respect des délais",
    "couts_main_oeuvre": "Analyse des coûts par rapport aux standards",
    "gestion_fournisseurs": "Analyse de la diversification et négociation"
  },
  
  "alertes_urgentes": [
    "Alerte 1 si situation critique",
    "Alerte 2 si action immédiate requise"
  ]
}

RÈGLES IMPORTANTES :
1. Sois 100% objectif et basé sur les données
2. Compare avec les standards du BTP français (marge 20-30%, délais, coûts)
3. Identifie les tendances dans l'historique
4. Propose des actions CONCRÈTES et RÉALISABLES
5. Quantifie les impacts financiers quand possible
6. Adapte tes recommandations à l'état du chantier (brouillon, en cours, terminé)
7. Si rentabilité < 10%, c'est CRITIQUE
8. Si jours restants < 3, c'est URGENT`;

    // 4. Appeler Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un expert en gestion de chantiers BTP français avec 20 ans d\'expérience. Tu analyses les données de manière objective et fournis des recommandations concrètes basées sur les standards du secteur. Réponds UNIQUEMENT en JSON valide.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // 5. Parser le JSON de la réponse
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      // Extraire le JSON si encapsulé dans du texte
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid AI response format');
      }
    }

    // 6. Sauvegarder l'analyse
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('ai_analyses')
      .insert({
        chantier_id: chantierId,
        analysis_data: analysis,
        score_global: analysis.score_global,
        statut: analysis.statut,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      throw saveError;
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in ai-chantier-analysis:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
