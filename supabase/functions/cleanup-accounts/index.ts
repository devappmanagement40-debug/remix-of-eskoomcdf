import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin requis" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get users with active products between 09/03 and 22/03/2026, excluding admins
    const { data: usersToDelete, error: fetchErr } = await supabase
      .from("user_products")
      .select("user_id")
      .eq("is_active", true)
      .gte("purchased_at", "2026-03-09T00:00:00Z")
      .lt("purchased_at", "2026-03-23T00:00:00Z");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set((usersToDelete || []).map((u: any) => u.user_id))];

    // Filter out admins
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = new Set((adminUsers || []).map((a: any) => a.user_id));
    const toDelete = uniqueUserIds.filter((id: string) => !adminIds.has(id));

    let deleted = 0;
    let errors: string[] = [];

    for (const userId of toDelete) {
      // Clean up related data first
      await supabase.from("user_products").delete().eq("user_id", userId);
      await supabase.from("withdrawals").delete().eq("user_id", userId);
      await supabase.from("recharges").delete().eq("user_id", userId);
      await supabase.from("wheel_spins").delete().eq("user_id", userId);
      await supabase.from("chat_messages").delete().eq("user_id", userId);
      await supabase.from("point_exchanges").delete().eq("user_id", userId);
      await supabase.from("vip_history").delete().eq("user_id", userId);
      await supabase.from("withdrawal_fee_payments").delete().eq("user_id", userId);
      await supabase.from("user_wallets").delete().eq("user_id", userId);
      await supabase.from("payment_logs").delete().eq("user_id", userId);
      await supabase.from("gift_code_uses").delete().eq("user_id", userId);
      await supabase.from("referral_commissions").delete().eq("beneficiary_id", userId);
      await supabase.from("referral_commissions").delete().eq("buyer_id", userId);
      await supabase.from("admin_permissions").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      
      // Clear referral references pointing to this profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (profileData) {
        await supabase
          .from("profiles")
          .update({ referred_by: null })
          .eq("referred_by", profileData.id);
      }
      
      // Delete profile
      await supabase.from("profiles").delete().eq("user_id", userId);

      // Delete auth user
      const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
      if (authErr) {
        errors.push(`${userId}: ${authErr.message}`);
      } else {
        deleted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: toDelete.length, deleted, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
