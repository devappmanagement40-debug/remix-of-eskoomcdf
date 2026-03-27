import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const { data: hasWithdrawalPerm } = await supabaseAdmin.rpc('has_permission', { _user_id: user.id, _permission: 'manage_withdrawals' });
    if (!isAdmin && !hasWithdrawalPerm) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const withdrawal_id = body?.withdrawal_id;

    if (!withdrawal_id) {
      return new Response(JSON.stringify({ success: false, error: 'withdrawal_id manquant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get withdrawal — must be pending
    const { data: withdrawal, error: wErr } = await supabaseAdmin
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .eq('status', 'pending')
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ success: false, error: 'Retrait non trouvé ou déjà traité' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check processing fee is paid
    if (withdrawal.processing_fee_amount > 0 && !withdrawal.processing_fee_paid) {
      return new Response(JSON.stringify({ success: false, error: 'Les frais de traitement ne sont pas encore payés' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Manual approval — mark as approved directly
    await supabaseAdmin.from('withdrawals').update({
      status: 'approved',
      admin_note: `✅ Validé manuellement par l'admin`,
    }).eq('id', withdrawal.id);

    console.log(`✅ Withdrawal ${withdrawal.id} approved manually`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Retrait approuvé avec succès',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Process withdrawal error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Erreur serveur: ' + String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
