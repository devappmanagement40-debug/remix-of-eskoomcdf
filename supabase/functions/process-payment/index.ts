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

    // Auth client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = user.id;

    // Service client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { amount, phone, country_code, payment_method_id, api_config_id, payment_method_name } = await req.json();

    if (!amount || !phone || !payment_method_id) {
      return new Response(JSON.stringify({ success: false, error: 'Paramètres manquants' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get API config
    const { data: apiConfig, error: configErr } = await supabaseAdmin
      .from('payment_api_configs')
      .select('*')
      .eq('id', api_config_id)
      .eq('is_active', true)
      .single();

    if (configErr || !apiConfig) {
      return new Response(JSON.stringify({ success: false, error: 'Configuration API non trouvée ou désactivée' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create payment log entry
    const { data: logEntry, error: logErr } = await supabaseAdmin
      .from('payment_logs')
      .insert({
        user_id: userId,
        api_config_id: api_config_id,
        payment_method_id: payment_method_id,
        amount,
        phone,
        country_code: country_code || '+226',
        status: 'initiated',
      })
      .select()
      .single();

    if (logErr) {
      console.error('Log insert error:', logErr);
      return new Response(JSON.stringify({ success: false, error: 'Erreur interne' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process payment based on provider
    let paymentResult: { success: boolean; pending?: boolean; provider_ref?: string; error?: string; paymentUrl?: string } = { success: false, error: 'Provider non supporté' };

    try {
      switch (apiConfig.provider) {
        case 'cinetpay':
          paymentResult = await processCinetPay(apiConfig, amount, phone, country_code, logEntry.id);
          break;
        case 'fedapay':
          paymentResult = await processFedaPay(apiConfig, amount, phone, country_code, logEntry.id);
          break;
        case 'sendavapay':
          paymentResult = await processSendavaPay(apiConfig, amount, phone, country_code, logEntry.id, payment_method_name);
          break;
        case 'omnipay':
          paymentResult = await processOmniPay(apiConfig, amount, phone, country_code, logEntry.id, payment_method_name);
          break;
        default:
          // Generic API call
          if (apiConfig.endpoint_url) {
            paymentResult = await processGenericApi(apiConfig, amount, phone, country_code, logEntry.id);
          } else {
            paymentResult = { success: false, error: `Provider ${apiConfig.provider} non configuré` };
          }
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      paymentResult = { success: false, error: 'Erreur lors du traitement du paiement' };
    }

    // Update log
    const logStatus = paymentResult.pending ? 'processing' : (paymentResult.success ? 'completed' : 'failed');
    await supabaseAdmin
      .from('payment_logs')
      .update({
        status: logStatus,
        provider_ref: paymentResult.provider_ref || null,
        error_message: paymentResult.error || null,
      })
      .eq('id', logEntry.id);

    // If pending (SendavaPay PROCESSING), don't credit yet — webhook will handle it
    // If immediately successful, create recharge entry and credit
    if (paymentResult.success && !paymentResult.pending) {
      const { data: pm } = await supabaseAdmin.from('payment_methods').select('name').eq('id', payment_method_id).single();
      
      await supabaseAdmin.from('recharges').insert({
        user_id: userId,
        phone,
        country_code: country_code || '+226',
        amount,
        transaction_ref: paymentResult.provider_ref || `API-${logEntry.id.slice(0, 8)}`,
        payment_method: pm?.name || 'API',
        status: 'approved',
      });

      // Credit user balance
      const { data: profile } = await supabaseAdmin.from('profiles').select('balance, deposit_balance').eq('user_id', userId).single();
      if (profile) {
        await supabaseAdmin.from('profiles').update({
          balance: (profile.balance || 0) + amount,
          deposit_balance: (profile.deposit_balance || 0) + amount,
        }).eq('user_id', userId);
      }
    }

    return new Response(JSON.stringify({
      success: paymentResult.success,
      pending: paymentResult.pending || false,
      provider_ref: paymentResult.provider_ref,
      error: paymentResult.error,
      paymentUrl: paymentResult.paymentUrl || null,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Process payment error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Erreur serveur' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// CinetPay integration
async function processCinetPay(config: any, amount: number, phone: string, countryCode: string, transactionId: string) {
  try {
    const response = await fetch(config.endpoint_url || 'https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: config.api_key,
        site_id: config.secret_key,
        transaction_id: transactionId,
        amount: Math.round(amount),
        currency: 'XOF',
        customer_phone_number: phone,
        customer_country_code: countryCode,
        description: `Dépôt ${amount} FCFA`,
        channels: 'MOBILE_MONEY',
        notify_url: config.callback_url || '',
      }),
    });

    const data = await response.json();
    if (data.code === '201' && data.data?.payment_url) {
      return { success: true, provider_ref: data.data.payment_token };
    }
    return { success: false, error: data.message || 'Erreur CinetPay' };
  } catch (err) {
    return { success: false, error: 'Erreur de connexion à CinetPay' };
  }
}

// FedaPay integration
async function processFedaPay(config: any, amount: number, phone: string, countryCode: string, transactionId: string) {
  try {
    const baseUrl = config.mode === 'production' ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com';
    const response = await fetch(`${baseUrl}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.secret_key}`,
      },
      body: JSON.stringify({
        description: `Dépôt ${amount} FCFA`,
        amount: Math.round(amount),
        currency: { iso: 'XOF' },
        callback_url: config.callback_url || '',
        customer: { phone_number: { number: phone, country: countryCode } },
      }),
    });

    const data = await response.json();
    if (data.v1?.transaction?.id) {
      return { success: true, provider_ref: String(data.v1.transaction.id) };
    }
    return { success: false, error: data.message || 'Erreur FedaPay' };
  } catch (err) {
    return { success: false, error: 'Erreur de connexion à FedaPay' };
  }
}

// SendavaPay integration (Official SDK - HMAC-SHA256)
async function processSendavaPay(config: any, amount: number, phone: string, countryCode: string, transactionId: string, methodName?: string) {
  try {
    const apiKey = config.api_key || Deno.env.get('SENDAVAPAY_API_KEY') || '';
    const apiSecret = config.secret_key || Deno.env.get('SENDAVAPAY_API_SECRET') || '';
    const baseUrl = (config.endpoint_url || 'https://sendavapay.com').replace(/\/$/, '');

    // Map country_code (+225, +226, etc.) to SendavaPay country code (CI, BF, etc.)
    const countryMap: Record<string, { code: string; currency: string }> = {
      '+229': { code: 'BJ', currency: 'XOF' },
      '+226': { code: 'BF', currency: 'XOF' },
      '+228': { code: 'TG', currency: 'XOF' },
      '+237': { code: 'CM', currency: 'XAF' },
      '+225': { code: 'CI', currency: 'XOF' },
      '+243': { code: 'COD', currency: 'CDF' },
      '+242': { code: 'COG', currency: 'XAF' },
    };

    const countryInfo = countryMap[countryCode] || { code: 'BF', currency: 'XOF' };

    // Detect operator from payment method name
    const nameLower = (methodName || '').toLowerCase();
    let operator = 'Orange';
    if (nameLower.includes('mtn')) operator = 'MTN';
    else if (nameLower.includes('moov')) operator = 'Moov';
    else if (nameLower.includes('wave')) operator = 'Wave';
    else if (nameLower.includes('tmoney') || nameLower.includes('t-money')) operator = 'TMoney';
    else if (nameLower.includes('vodacom')) operator = 'Vodacom';
    else if (nameLower.includes('airtel')) operator = 'Airtel';
    else if (nameLower.includes('orange')) operator = 'Orange';

    // Format phone: include country code prefix (e.g. +22670123456)
    const cleanPhone = phone.replace(/\D/g, '');
    const codeDigits = countryCode.replace('+', '');
    const fullPhone = cleanPhone.startsWith(codeDigits) ? `+${cleanPhone}` : `${countryCode}${cleanPhone}`;

    const callbackUrl = config.callback_url || `${Deno.env.get('SUPABASE_URL')}/functions/v1/sendavapay-webhook`;

    const payload = {
      amount: Math.round(amount),
      phoneNumber: fullPhone,
      operator,
      country: countryInfo.code,
      customerName: 'Client',
      description: `Depot ${amount} FCFA`,
      callbackUrl,
    };

    console.log('SendavaPay SDK payload:', JSON.stringify(payload));

    // HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const payloadStr = JSON.stringify(payload);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const response = await fetch(`${baseUrl}/api/sdk/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-signature': signature,
      },
      body: payloadStr,
    });

    const data = await response.json();
    console.log('SendavaPay SDK response status:', response.status, 'body:', JSON.stringify(data));

    // Statuses: PENDING, PROCESSING, SUCCESS, FAILED, CANCELLED
    if (data.success) {
      const ref = data.reference || data.txid || transactionId;
      if (data.status === 'SUCCESS') {
        return { success: true, pending: false, provider_ref: ref };
      }
      // PROCESSING or PENDING = USSD sent to phone, waiting for user confirmation
      return { success: true, pending: true, provider_ref: ref };
    }
    return { success: false, error: data.message || data.error || 'Erreur SendavaPay' };
  } catch (err) {
    console.error('SendavaPay error:', err);
    return { success: false, error: 'Erreur de connexion à SendavaPay' };
  }
}

// Generic API integration
async function processGenericApi(config: any, amount: number, phone: string, countryCode: string, transactionId: string) {
  try {
    const response = await fetch(config.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
        'X-Secret-Key': config.secret_key || '',
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        amount: Math.round(amount),
        currency: 'XOF',
        phone,
        country_code: countryCode,
      }),
    });

    const data = await response.json();
    if (response.ok && (data.success || data.status === 'success')) {
      return { success: true, provider_ref: data.reference || data.id || transactionId };
    }
    return { success: false, error: data.message || data.error || 'Erreur API' };
  } catch (err) {
    return { success: false, error: 'Erreur de connexion à l\'API' };
  }
}
