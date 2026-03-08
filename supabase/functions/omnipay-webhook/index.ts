import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      console.error("Invalid JSON body:", body);
      return new Response(JSON.stringify({ received: true, error: "Invalid JSON" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== OMNIPAY WEBHOOK RECEIVED ===");
    console.log("Body:", JSON.stringify(payload));

    // OmniPay callback format:
    // { action: "callback", id: "170777", type: "PAYMENT", reference: "REF123",
    //   first_name, last_name, msisdn, amount, fees, currency, status: "3", message, signature }
    // Status: 1=initiated, 2=pending, 3=success, 4=failure

    const reference = payload.reference;
    const statusCode = String(payload.status);
    const omnipayId = String(payload.id || "");

    console.log("Parsed -> reference:", reference, "status:", statusCode, "omnipay_id:", omnipayId);

    if (!reference) {
      console.error("Missing reference in OmniPay callback");
      return new Response(JSON.stringify({ received: true, error: "No reference" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuccess = statusCode === "3";
    const isFailed = statusCode === "4";

    if (!isSuccess && !isFailed) {
      console.log("Status still processing (status:", statusCode, "), waiting...");
      return new Response(JSON.stringify({ received: true, message: "Still processing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find payment log by provider_ref (our reference)
    const { data: logEntry, error: findErr } = await supabase
      .from("payment_logs")
      .select("*")
      .eq("provider_ref", reference)
      .in("status", ["initiated", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !logEntry) {
      console.error("Payment log not found for reference:", reference, "error:", findErr?.message);
      return new Response(JSON.stringify({ received: true, error: "Log not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Found log entry:", logEntry.id, "user:", logEntry.user_id, "amount:", logEntry.amount);

    // Update payment log
    await supabase
      .from("payment_logs")
      .update({
        status: isSuccess ? "completed" : "failed",
        provider_response: payload,
        error_message: isFailed ? (payload.message || "Paiement échoué") : null,
      })
      .eq("id", logEntry.id);

    console.log("Payment log updated to:", isSuccess ? "completed" : "failed");

    // If successful, credit user
    if (isSuccess) {
      const { data: pm } = await supabase
        .from("payment_methods")
        .select("name")
        .eq("id", logEntry.payment_method_id)
        .single();

      await supabase.from("recharges").insert({
        user_id: logEntry.user_id,
        phone: logEntry.phone,
        country_code: logEntry.country_code,
        amount: logEntry.amount,
        transaction_ref: reference,
        payment_method: pm?.name || "OmniPay",
        status: "approved",
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, deposit_balance")
        .eq("user_id", logEntry.user_id)
        .single();

      if (profile) {
        const newBalance = (profile.balance || 0) + logEntry.amount;
        const newDeposit = (profile.deposit_balance || 0) + logEntry.amount;
        await supabase
          .from("profiles")
          .update({ balance: newBalance, deposit_balance: newDeposit })
          .eq("user_id", logEntry.user_id);

        console.log(`✅ User ${logEntry.user_id} credited: +${logEntry.amount} FCFA (balance: ${newBalance})`);
      }
    } else {
      console.log(`❌ Payment ${reference} failed: ${payload.message || "unknown"}`);
    }

    return new Response(JSON.stringify({ received: true, status: isSuccess ? "credited" : "failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("OmniPay webhook error:", err);
    return new Response(JSON.stringify({ received: true, error: "Internal error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
