import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller is admin
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) {
      return new Response(JSON.stringify({ success: false, error: 'withdrawal_id manquant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get withdrawal
    const { data: withdrawal, error: wErr } = await supabaseAdmin
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .eq('status', 'pending')
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ success: false, error: 'Retrait non trouvé ou déjà traité' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get OmniPay API key
    const apiKey = Deno.env.get('OMNIPAY_API_KEY') || '';
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Clé API OmniPay non configurée' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', withdrawal.user_id)
      .single();

    const fullName = profile?.full_name || 'Client Eskom';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Client';
    const lastName = nameParts.slice(1).join(' ') || 'Eskom';

    // Format MSISDN: international prefix without 00 or + (e.g. 2250707070707)
    const cleanPhone = withdrawal.phone.replace(/\D/g, '');
    const codeDigits = (withdrawal.country_code || '+226').replace('+', '');
    const msisdn = cleanPhone.startsWith(codeDigits) ? cleanPhone : `${codeDigits}${cleanPhone}`;

    // Detect operator for Wave
    const networkLower = (withdrawal.network || '').toLowerCase();
    let operator: string | undefined;
    if (networkLower.includes('wave')) operator = 'wave';

    // Generate unique reference
    const reference = `WDR${withdrawal.id.replace(/-/g, '').slice(0, 16)}`;

    // Build OmniPay transfer payload (API v2.0 - Section 4)
    const payload: Record<string, string> = {
      action: 'transfer',
      apikey: apiKey,
      msisdn,
      amount: String(Math.round(withdrawal.net_amount)),
      reference,
      first_name: firstName,
      last_name: lastName,
    };

    if (operator) {
      payload.operator = operator;
    }

    console.log('OmniPay transfer payload:', JSON.stringify(payload));

    const response = await fetch('https://omnipay.webtechci.com/interface/api2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('OmniPay transfer response:', JSON.stringify(data));

    if (data.success === 1 || data.success === '1') {
      // Transfer initiated — update withdrawal to approved with OmniPay ref
      await supabaseAdmin.from('withdrawals').update({
        status: 'approved',
        admin_note: `OmniPay auto-transfer | ID: ${data.id || ''} | Ref: ${reference} | Fees: ${data.fees || 0}`,
      }).eq('id', withdrawal.id);

      return new Response(JSON.stringify({
        success: true,
        omnipay_id: data.id,
        reference,
        fees: data.fees,
        message: 'Transfert initié avec succès',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Transfer failed
    const errorMsg = data.message || `Erreur OmniPay (code: ${data.code})`;
    console.error('OmniPay transfer failed:', errorMsg);

    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      code: data.code,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Process withdrawal error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Erreur serveur' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
