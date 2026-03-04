import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-signature, x-sendavapay-signature, x-sendavapay-event, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiSecret = Deno.env.get('SENDAVAPAY_API_SECRET') || '';

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.text();
    const payload = JSON.parse(body);

    // Verify HMAC-SHA256 signature (v1 API uses x-sendavapay-signature header)
    const receivedSignature = req.headers.get('x-sendavapay-signature') || req.headers.get('x-signature');
    if (receivedSignature && apiSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSig = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (receivedSignature !== expectedSig) {
        console.error('Invalid signature');
        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('SendavaPay webhook received:', JSON.stringify(payload));

    // v1 API webhook format: { event: "payment.completed", data: { reference, amount, ... }, timestamp }
    // Also support legacy SDK format: { reference, status, ... }
    const event = req.headers.get('x-sendavapay-event') || payload.event;
    const webhookData = payload.data || payload;
    
    const reference = webhookData.reference || webhookData.externalReference || webhookData.txid || webhookData.transaction_id;
    
    // Determine success/failure from event type or status field
    let isSuccess = false;
    let isFailed = false;
    
    if (event === 'payment.completed') {
      isSuccess = true;
    } else if (event === 'payment.failed') {
      isFailed = true;
    } else {
      // Legacy SDK format
      const status = webhookData.status;
      isSuccess = status === 'SUCCESS' || status === 'completed';
      isFailed = status === 'FAILED' || status === 'CANCELLED' || status === 'failed';
    }

    if (!reference) {
      console.error('Missing reference in webhook payload');
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment log by provider_ref OR externalReference
    const { data: logEntry, error: findErr } = await supabase
      .from('payment_logs')
      .select('*')
      .or(`provider_ref.eq.${reference},id.eq.${reference}`)
      .in('status', ['initiated', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !logEntry) {
      console.error('Payment log not found for reference:', reference, findErr);
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isSuccess && !isFailed) {
      return new Response(JSON.stringify({ received: true, message: 'Still processing' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment log
    await supabase
      .from('payment_logs')
      .update({
        status: isSuccess ? 'completed' : 'failed',
        provider_response: payload,
        error_message: isFailed ? (webhookData.message || 'Paiement échoué') : null,
      })
      .eq('id', logEntry.id);

    // If successful, credit user and create recharge entry
    if (isSuccess) {
      const { data: pm } = await supabase
        .from('payment_methods')
        .select('name')
        .eq('id', logEntry.payment_method_id)
        .single();

      await supabase.from('recharges').insert({
        user_id: logEntry.user_id,
        phone: logEntry.phone,
        country_code: logEntry.country_code,
        amount: logEntry.amount,
        transaction_ref: reference,
        payment_method: pm?.name || 'SendavaPay',
        status: 'approved',
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, deposit_balance')
        .eq('user_id', logEntry.user_id)
        .single();

      if (profile) {
        await supabase.from('profiles').update({
          balance: (profile.balance || 0) + logEntry.amount,
          deposit_balance: (profile.deposit_balance || 0) + logEntry.amount,
        }).eq('user_id', logEntry.user_id);
      }

      console.log(`Payment ${reference} confirmed, credited ${logEntry.amount} to user ${logEntry.user_id}`);
    } else {
      console.log(`Payment ${reference} failed/cancelled`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
