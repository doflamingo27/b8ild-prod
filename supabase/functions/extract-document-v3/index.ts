import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// FONCTION DÉSACTIVÉE
// ============================================================================
// Cette fonction a été remplacée par l'extraction locale côté client (extractAuto)
// et causait des erreurs "Maximum call stack size exceeded".
// Elle est maintenant désactivée avec un statut HTTP 410 (Gone).
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  return new Response(
    JSON.stringify({ 
      success: false,
      error: 'Cette fonction est désactivée. Utilisez l\'extraction locale côté client (extractAuto).',
      needsFallback: false
    }),
    { 
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
