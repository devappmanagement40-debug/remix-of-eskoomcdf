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
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      console.error('Invalid JSON body:', body);
      return new Response(JSON.stringify({ received: true, error: 'Invalid JSON' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log everything for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });
    console.log('=== SENDAVAPAY WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(headers));
    console.log('Body:', JSON.stringify(payload));

    // Optional HMAC-SHA256 signature verification
    const receivedSignature = req.headers.get('x-sendavapay-signature') || req.headers.get('x-signature');
    if (receivedSignature && apiSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSig = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (receivedSignature !== expectedSig) {
        console.error('Invalid signature. Received:', receivedSignature, 'Expected:', expectedSig);
        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Signature verified OK');
    } else {
      console.log('No signature verification (no signature header or no secret)');
    }

    // SendavaPay callback format (flat):
    // { reference: "PTR_xxx", status: "SUCCESS", amount: "5000", fee: "350", netAmount: "4650", currency: "FCFA" }
    // Also support wrapped format: { event: "payment.completed", data: { reference, ... } }
    const event = req.headers.get('x-sendavapay-event') || payload.event;
    const webhookData = payload.data || payload;
    
    const reference = webhookData.reference || webhookData.externalReference || webhookData.txid || webhookData.transaction_id;
    const status = webhookData.status;
    
    console.log('Parsed -> reference:', reference, 'status:', status, 'event:', event);

    // Determine success/failure
    let isSuccess = false;
    let isFailed = false;
    
    if (event === 'payment.completed' || status === 'SUCCESS' || status === 'completed' || status === 'success') {
      isSuccess = true;
    } else if (event === 'payment.failed' || status === 'FAILED' || status === 'CANCELLED' || status === 'failed' || status === 'cancelled') {
      isFailed = true;
    }

    console.log('Result -> isSuccess:', isSuccess, 'isFailed:', isFailed);

    if (!reference) {
      console.error('Missing reference in webhook payload');
      return new Response(JSON.stringify({ received: true, error: 'No reference' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment log by provider_ref first
    let logEntry: any = null;
    let findErr: any = null;

    // Search by provider_ref
    const { data: byRef, error: refErr } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('provider_ref', reference)
      .in('status', ['initiated', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byRef) {
      logEntry = byRef;
    } else {
      // Try by id only if reference looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(reference)) {
        const { data: byId, error: idErr } = await supabase
          .from('payment_logs')
          .select('*')
          .eq('id', reference)
          .in('status', ['initiated', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        logEntry = byId;
        findErr = idErr;
      } else {
        findErr = refErr;
      }
    }

    console.log('Payment log lookup -> found:', !!logEntry, 'error:', findErr?.message || 'none');
    if (logEntry) {
      console.log('Log entry:', JSON.stringify({ id: logEntry.id, user_id: logEntry.user_id, amount: logEntry.amount, status: logEntry.status }));
    }

    if (findErr || !logEntry) {
      console.error('Payment log not found for reference:', reference);
      return new Response(JSON.stringify({ received: true, error: 'Log not found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isSuccess && !isFailed) {
      console.log('Status still processing, waiting...');
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

    console.log('Payment log updated to:', isSuccess ? 'completed' : 'failed');

    // If successful, credit user
    if (isSuccess) {
      // Update existing recharge record (created by process-payment) to 'approved'
      const { data: existingRecharge } = await supabase
        .from('recharges')
        .select('id')
        .eq('user_id', logEntry.user_id)
        .eq('transaction_ref', reference)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRecharge) {
        await supabase.from('recharges').update({ status: 'approved' }).eq('id', existingRecharge.id);
        console.log('Updated existing recharge', existingRecharge.id, 'to approved');
      } else {
        // Fallback: create new recharge if none found
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
        console.log('Created new recharge record (no existing pending found)');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, deposit_balance')
        .eq('user_id', logEntry.user_id)
        .single();

      if (profile) {
        const newBalance = (profile.balance || 0) + logEntry.amount;
        const newDeposit = (profile.deposit_balance || 0) + logEntry.amount;
        await supabase.from('profiles').update({
          balance: newBalance,
          deposit_balance: newDeposit,
        }).eq('user_id', logEntry.user_id);
        
        console.log(`✅ User ${logEntry.user_id} credited: +${logEntry.amount} FCFA (balance: ${newBalance}, deposit: ${newDeposit})`);
      }
    } else {
      // Update existing recharge to 'rejected' on failure
      const { data: existingRecharge } = await supabase
        .from('recharges')
        .select('id')
        .eq('user_id', logEntry.user_id)
        .eq('transaction_ref', reference)
        .in('status', ['pending', 'processing'])
        .limit(1)
        .maybeSingle();

      if (existingRecharge) {
        await supabase.from('recharges').update({ status: 'rejected' }).eq('id', existingRecharge.id);
      }
      console.log(`❌ Payment ${reference} failed/cancelled`);
    }

    return new Response(JSON.stringify({ received: true, status: isSuccess ? 'credited' : 'failed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ received: true, error: 'Internal error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});