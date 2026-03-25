import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const adminUserId = "258a9744-0f68-4351-87e3-ccc3396ca3c1";

    // Get all non-admin profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("user_id", adminUserId);

    const userIds = (profiles || []).map((p: any) => p.user_id);
    console.log(`Found ${userIds.length} non-admin users to delete`);

    let deleted = 0;
    for (const uid of userIds) {
      // Delete related data
      await Promise.all([
        supabase.from("user_products").delete().eq("user_id", uid),
        supabase.from("recharges").delete().eq("user_id", uid),
        supabase.from("withdrawals").delete().eq("user_id", uid),
        supabase.from("chat_messages").delete().eq("user_id", uid),
        supabase.from("wheel_spins").delete().eq("user_id", uid),
        supabase.from("referral_commissions").delete().eq("beneficiary_id", uid),
        supabase.from("referral_commissions").delete().eq("buyer_id", uid),
        supabase.from("point_exchanges").delete().eq("user_id", uid),
        supabase.from("gift_code_uses").delete().eq("user_id", uid),
        supabase.from("vip_history").delete().eq("user_id", uid),
        supabase.from("user_wallets").delete().eq("user_id", uid),
        supabase.from("withdrawal_fee_payments").delete().eq("user_id", uid),
        supabase.from("payment_logs").delete().eq("user_id", uid),
        supabase.from("user_roles").delete().eq("user_id", uid),
        supabase.from("admin_permissions").delete().eq("user_id", uid),
      ]);

      // Delete profile
      await supabase.from("profiles").delete().eq("user_id", uid);

      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(uid);
      if (error) console.error(`Failed to delete auth user ${uid}:`, error.message);
      else deleted++;
    }

    return new Response(JSON.stringify({ success: true, deleted, total: userIds.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
