import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map network names to OmniPay operator values (lowercase)
function detectOperator(network: string): string | undefined {
  const n = network.toLowerCase().trim();
  if (n.includes('wave')) return 'wave';
  if (n.includes('mtn')) return 'mtn';
  if (n.includes('orange')) return 'orange';
  if (n.includes('moov')) return 'moov';
  if (n.includes('tmoney') || n.includes('t-money') || n.includes('t money')) return 'tmoney';
  if (n.includes('free')) return 'free';
  return undefined;
}

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

    // Verify caller via getClaims (compatible with signing-keys)
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const withdrawal_id = body?.withdrawal_id;
    console.log('Processing withdrawal:', withdrawal_id);

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
      console.error('Withdrawal not found or not pending:', wErr);
      return new Response(JSON.stringify({ success: false, error: 'Retrait non trouvé ou déjà traité' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OmniPay API key
    const apiKey = Deno.env.get('OMNIPAY_API_KEY') || '';
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Clé API OmniPay non configurée' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get wallet info for holder_name
    let holderFirstName = 'Client';
    let holderLastName = 'Eskom';

    if (withdrawal.wallet_id) {
      const { data: wallet } = await supabaseAdmin
        .from('user_wallets')
        .select('holder_name')
        .eq('id', withdrawal.wallet_id)
        .single();
      if (wallet?.holder_name) {
        const parts = wallet.holder_name.trim().split(' ');
        holderFirstName = parts[0] || 'Client';
        holderLastName = parts.slice(1).join(' ') || 'Eskom';
      }
    } else {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('user_id', withdrawal.user_id)
        .single();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(' ');
        holderFirstName = parts[0] || 'Client';
        holderLastName = parts.slice(1).join(' ') || 'Eskom';
      }
    }

    // Format MSISDN: country code digits + local number, NO "+" prefix
    // Example: country_code="+225", phone="0595857098" → msisdn="2250595857098"
    const localPhone = withdrawal.phone.replace(/\D/g, '');
    const codeDigits = (withdrawal.country_code || '+226').replace('+', '');
    
    // If the local phone already starts with the country code, don't double it
    const msisdn = localPhone.startsWith(codeDigits) ? localPhone : `${codeDigits}${localPhone}`;

    // Detect operator from network name
    const operator = detectOperator(withdrawal.network || '');

    // Generate unique reference with WDR prefix for webhook routing
    const reference = `WDR${withdrawal.id.replace(/-/g, '').slice(0, 16)}`;

    // Build OmniPay transfer payload
    const payload: Record<string, string> = {
      action: 'transfer',
      apikey: apiKey,
      msisdn,
      amount: String(Math.round(withdrawal.net_amount)),
      reference,
      first_name: holderFirstName,
      last_name: holderLastName,
    };

    // Always include operator if detected
    if (operator) {
      payload.operator = operator;
    }

    console.log('OmniPay transfer payload:', JSON.stringify({ ...payload, apikey: '***' }));

    // Mark as processing to prevent duplicate sends
    await supabaseAdmin.from('withdrawals').update({
      status: 'processing',
      admin_note: `OmniPay envoi en cours | Ref: ${reference} | MSISDN: ${msisdn} | Op: ${operator || 'auto'}`,
    }).eq('id', withdrawal.id);

    let data: any;
    try {
      const response = await fetch('https://omnipay.webtechci.com/interface/api2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('OmniPay raw response:', responseText);

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('OmniPay returned non-JSON response:', responseText);
        // Mark as rejected so refund trigger fires
        await supabaseAdmin.from('withdrawals').update({
          status: 'rejected',
          admin_note: `OmniPay ❌ | Réponse invalide | Status HTTP: ${response.status} | Ref: ${reference}`,
        }).eq('id', withdrawal.id);
        return new Response(JSON.stringify({
          success: false,
          error: `Réponse OmniPay invalide (HTTP ${response.status})`,
          refunded: true,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } catch (fetchErr) {
      console.error('OmniPay fetch error:', fetchErr);
      await supabaseAdmin.from('withdrawals').update({
        status: 'rejected',
        admin_note: `OmniPay ❌ | Erreur réseau | Ref: ${reference}`,
      }).eq('id', withdrawal.id);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur de connexion à OmniPay',
        refunded: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('OmniPay transfer response:', JSON.stringify(data));

    if (data.success === 1 || data.success === '1' || data.success === true) {
      // Transfer initiated — keep status as "processing" until OmniPay callback confirms
      await supabaseAdmin.from('withdrawals').update({
        admin_note: `OmniPay ⏳ Envoyé | ID: ${data.id || ''} | Ref: ${reference} | Op: ${operator || 'auto'} | MSISDN: ${msisdn} | Frais: ${data.fees || 0} | En attente callback`,
      }).eq('id', withdrawal.id);

      return new Response(JSON.stringify({
        success: true,
        omnipay_id: data.id,
        reference,
        fees: data.fees,
        operator: operator || 'auto',
        message: 'Transfert envoyé — en attente de confirmation OmniPay',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Transfer failed — mark as rejected so the DB trigger refunds the user
    const errorMsg = data.message || data.error || `Erreur OmniPay (code: ${data.code || 'N/A'})`;
    console.error('OmniPay transfer failed:', errorMsg, JSON.stringify(data));

    await supabaseAdmin.from('withdrawals').update({
      status: 'rejected',
      admin_note: `OmniPay ❌ | ${errorMsg} | Code: ${data.code || 'N/A'} | Ref: ${reference} | MSISDN: ${msisdn}`,
    }).eq('id', withdrawal.id);

    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      code: data.code,
      refunded: true,
      message: 'Le transfert a échoué. Le montant a été recrédité au compte.',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Process withdrawal error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Erreur serveur: ' + String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
