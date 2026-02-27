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

    for (const up of activeProducts || []) {
      const expiresAt = up.expires_at ? new Date(up.expires_at) : null;
      
      // Check if expired
      if (expiresAt && expiresAt < now) {
        await supabase.from("user_products").update({ is_active: false }).eq("id", up.id);
        expired++;
        continue;
      }

      const dailyRevenue = (up.products as any)?.daily_revenue || 0;
      if (dailyRevenue <= 0) continue;

      // Credit daily revenue to earnings_balance and balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, earnings_balance")
        .eq("user_id", up.user_id)
        .single();

      if (profile) {
        await supabase.from("profiles").update({
          balance: (profile.balance || 0) + dailyRevenue,
          earnings_balance: (profile.earnings_balance || 0) + dailyRevenue,
        }).eq("user_id", up.user_id);
        credited++;
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
