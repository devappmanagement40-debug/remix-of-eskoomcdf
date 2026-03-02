import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Verify HMAC-SHA256 signature if present
    const receivedSignature = req.headers.get('x-signature');
    if (receivedSignature && apiSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSig = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (receivedSignature !== expectedSig) {
        console.error('Invalid signature');
        return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('SendavaPay webhook received:', JSON.stringify(payload));

    // Extract reference and status from callback
    const reference = payload.reference || payload.txid || payload.transaction_id;
    const status = payload.status;

    if (!reference) {
      return new Response(JSON.stringify({ success: false, error: 'Missing reference' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the payment log by provider_ref
    const { data: logEntry, error: findErr } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('provider_ref', reference)
      .in('status', ['initiated', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !logEntry) {
      console.error('Payment log not found for reference:', reference, findErr);
      return new Response(JSON.stringify({ success: false, error: 'Payment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSuccess = status === 'SUCCESS';
    const isFailed = status === 'FAILED' || status === 'CANCELLED';

    if (!isSuccess && !isFailed) {
      // Still processing, acknowledge but don't update
      return new Response(JSON.stringify({ success: true, message: 'Still processing' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment log
    await supabase
      .from('payment_logs')
      .update({
        status: isSuccess ? 'completed' : 'failed',
        provider_response: payload,
        error_message: isFailed ? (payload.message || 'Paiement échoué') : null,
      })
      .eq('id', logEntry.id);

    // If successful, credit user and create recharge entry
    if (isSuccess) {
      // Get payment method name
      const { data: pm } = await supabase
        .from('payment_methods')
        .select('name')
        .eq('id', logEntry.payment_method_id)
        .single();

      // Create recharge entry
      await supabase.from('recharges').insert({
        user_id: logEntry.user_id,
        phone: logEntry.phone,
        country_code: logEntry.country_code,
        amount: logEntry.amount,
        transaction_ref: reference,
        payment_method: pm?.name || 'SendavaPay',
        status: 'approved',
      });

      // Credit user balance
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

    return new Response(JSON.stringify({ success: true, status: isSuccess ? 'confirmed' : 'rejected' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
