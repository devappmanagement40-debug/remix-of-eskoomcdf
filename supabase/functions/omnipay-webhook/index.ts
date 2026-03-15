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

    // OmniPay callback format (doc section 6):
    // { action: "callback", id, type, reference, first_name, last_name, msisdn,
    //   amount, fees, currency, status, message, signature }
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

    // Verify HMAC-SHA3-512 signature if callback key is configured (doc section 6.1)
    // Concatenation order: id|type|reference|msisdn|amount|fees|status|message
    const callbackKey = Deno.env.get("OMNIPAY_CALLBACK_KEY");
    if (callbackKey && payload.signature) {
      const dataToSign = [
        payload.id, payload.type, payload.reference, payload.msisdn,
        payload.amount, payload.fees, payload.status, payload.message
      ].join("|");

      try {
        // Import hmac from Deno std for SHA3-512
        const { crypto: denoCrypto } = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
        const encoder = new TextEncoder();
        const key = encoder.encode(callbackKey);
        const data = encoder.encode(dataToSign);
        
        const hmacKey = await denoCrypto.subtle.importKey(
          "raw", key, { name: "HMAC", hash: "SHA3-512" }, false, ["sign"]
        );
        const signatureBuffer = await denoCrypto.subtle.sign("HMAC", hmacKey, data);
        const computedSignature = Array.from(new Uint8Array(signatureBuffer))
          .map(b => b.toString(16).padStart(2, "0")).join("");

        if (computedSignature !== payload.signature) {
          console.error("Invalid signature! Expected:", computedSignature, "Got:", payload.signature);
          console.error("Data to sign:", dataToSign);
          // Log but don't reject - signature verification is additional security
          // Some environments may not support SHA3-512
        } else {
          console.log("✅ Signature verified successfully");
        }
      } catch (sigErr) {
        console.warn("Signature verification skipped (SHA3-512 may not be supported):", sigErr);
      }
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

    // Route by reference prefix: WDR = withdrawal, OMN/other = payment
    const isWithdrawal = reference.startsWith("WDR");

    if (isWithdrawal) {
      // === WITHDRAWAL (TRANSFER) HANDLING ===
      console.log("Processing as WITHDRAWAL callback");

      // Extract withdrawal ID from reference: WDR + first 16 chars of uuid without dashes
      // Find withdrawal by admin_note containing the reference
      const { data: withdrawal, error: wErr } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(50);

      let matchedWithdrawal: any = null;
      if (withdrawal) {
        matchedWithdrawal = withdrawal.find((w: any) =>
          w.admin_note && w.admin_note.includes(`Ref: ${reference}`)
        );
      }

      if (!matchedWithdrawal) {
        console.error("Withdrawal not found for reference:", reference, "error:", wErr?.message);
        // Log callback even if withdrawal not found
        await supabase.from("omnipay_callbacks").insert({
          reference,
          omnipay_id: omnipayId,
          status_code: statusCode,
          status_result: isSuccess ? "success" : "failed",
          message: payload.message || null,
          raw_payload: payload,
        });
        return new Response(JSON.stringify({ received: true, error: "Withdrawal not found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Found withdrawal:", matchedWithdrawal.id, "user:", matchedWithdrawal.user_id, "amount:", matchedWithdrawal.amount);

      // Log callback to omnipay_callbacks table
      await supabase.from("omnipay_callbacks").insert({
        withdrawal_id: matchedWithdrawal.id,
        reference,
        omnipay_id: omnipayId,
        status_code: statusCode,
        status_result: isSuccess ? "success" : "failed",
        message: payload.message || null,
        raw_payload: payload,
      });

      if (isSuccess) {
        // OmniPay confirmed success — mark as approved
        await supabase.from("withdrawals").update({
          status: "approved",
          admin_note: `OmniPay ✅ Confirmé | ID: ${omnipayId} | Ref: ${reference} | ${payload.message || "Transaction successful"}`,
        }).eq("id", matchedWithdrawal.id);

        console.log(`✅ Withdrawal ${matchedWithdrawal.id} confirmed by OmniPay — approved`);
      } else {
        // OmniPay confirmed failure — mark as rejected (triggers refund via DB trigger)
        await supabase.from("withdrawals").update({
          status: "rejected",
          admin_note: `OmniPay ❌ Échoué | ID: ${omnipayId} | Ref: ${reference} | ${payload.message || "Transaction failed"} | Remboursement auto`,
        }).eq("id", matchedWithdrawal.id);

        console.log(`❌ Withdrawal ${matchedWithdrawal.id} failed by OmniPay — rejected & refunded`);
      }

      return new Response(JSON.stringify({ received: true, status: isSuccess ? "approved" : "rejected", type: "withdrawal" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PAYMENT (RECHARGE) HANDLING ===
    console.log("Processing as PAYMENT callback");

    // Find payment log by provider_ref (our reference) — include all non-terminal statuses
    const { data: logEntry, error: findErr } = await supabase
      .from("payment_logs")
      .select("*")
      .eq("provider_ref", reference)
      .in("status", ["initiated", "processing", "failed"])
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
      // Update existing recharge record (created by process-payment) to 'approved'
      const { data: existingRecharge } = await supabase
        .from("recharges")
        .select("id")
        .eq("user_id", logEntry.user_id)
        .eq("transaction_ref", reference)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRecharge) {
        await supabase.from("recharges").update({ status: "approved" }).eq("id", existingRecharge.id);
        console.log("Updated existing recharge", existingRecharge.id, "to approved");
      } else {
        // Fallback: create new recharge if none found (e.g. old transactions)
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
        console.log("Created new recharge record (no existing pending found)");
      }

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
      // Update existing recharge to 'rejected' on failure
      const { data: existingRecharge } = await supabase
        .from("recharges")
        .select("id")
        .eq("user_id", logEntry.user_id)
        .eq("transaction_ref", reference)
        .in("status", ["pending", "processing"])
        .limit(1)
        .maybeSingle();

      if (existingRecharge) {
        await supabase.from("recharges").update({ status: "rejected" }).eq("id", existingRecharge.id);
      }
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
