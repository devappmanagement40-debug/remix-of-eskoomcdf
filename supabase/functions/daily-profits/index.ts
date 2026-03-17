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

    // Load point settings
    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "points_per_active_member",
        "points_per_vip_level_per_day",
        "points_per_deposit_type",
        "points_per_deposit_value",
        "points_per_withdrawal",
      ]);

    const getSetting = (key: string) => settingsData?.find((s: any) => s.key === key)?.value || "0";
    const pointsPerVipPerDay = Number(getSetting("points_per_vip_level_per_day")) || 0;

    // Get all active user_products with their product info
    const { data: activeProducts, error: fetchError } = await supabase
      .from("user_products")
      .select("id, user_id, product_id, purchased_at, expires_at, products(daily_revenue, cycles)")
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching active products:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let credited = 0;
    let expired = 0;

    // Track users who received profits to also grant VIP points
    const processedUsers = new Set<string>();

    for (const up of activeProducts || []) {
      const expiresAt = up.expires_at ? new Date(up.expires_at) : null;
      
      // Check if expired
      if (expiresAt && expiresAt < now) {
        await supabase.from("user_products").update({ is_active: false }).eq("id", up.id);
        expired++;
        continue;
      }

      // Track user for VIP points (do NOT auto-credit revenue — users collect manually)
      if (!processedUsers.has(up.user_id)) {
        const dailyRevenue = (up.products as any)?.daily_revenue || 0;
        if (dailyRevenue > 0) credited++;

        // Grant VIP points daily (once per user)
        if (pointsPerVipPerDay > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("vip_level, gift_points")
            .eq("user_id", up.user_id)
            .single();

          if (profile && (profile.vip_level || 0) > 0) {
            const vipPoints = (profile.vip_level || 0) * pointsPerVipPerDay;
            await supabase.from("profiles").update({
              gift_points: (profile.gift_points || 0) + vipPoints,
            }).eq("user_id", up.user_id);
          }
        }

        processedUsers.add(up.user_id);
      }
    }

    // Grant VIP points to users with VIP level who weren't already processed
    // (users who have VIP but no active products)
    if (pointsPerVipPerDay > 0) {
      const { data: vipUsers } = await supabase
        .from("profiles")
        .select("user_id, vip_level, gift_points")
        .gt("vip_level", 0);

      for (const vu of vipUsers || []) {
        if (!processedUsers.has(vu.user_id)) {
          const vipPoints = (vu.vip_level || 0) * pointsPerVipPerDay;
          await supabase.from("profiles").update({
            gift_points: (vu.gift_points || 0) + vipPoints,
          }).eq("user_id", vu.user_id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, credited, expired, total: (activeProducts || []).length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Daily profit error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
