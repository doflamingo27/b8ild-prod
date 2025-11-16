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
    console.log('[DAILY-SNAPSHOT] Starting daily snapshot creation');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Appeler la fonction PostgreSQL qui crée les snapshots quotidiens
    const { error: rpcError } = await supabase.rpc('snapshot_chantier_daily');

    if (rpcError) {
      console.error('[DAILY-SNAPSHOT] RPC error:', rpcError);
      throw rpcError;
    }

    console.log('[DAILY-SNAPSHOT] Snapshots created successfully via RPC');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Daily snapshots created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[DAILY-SNAPSHOT] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
