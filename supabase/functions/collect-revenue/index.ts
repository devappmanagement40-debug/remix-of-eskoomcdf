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

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_product_id } = await req.json();
    if (!user_product_id) {
      return new Response(JSON.stringify({ error: "ID produit manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the user_product with product info - verify ownership
    const { data: up, error: upError } = await supabase
      .from("user_products")
      .select("*, products(daily_revenue, cycles)")
      .eq("id", user_product_id)
      .eq("user_id", user.id)
      .single();

    if (upError || !up) {
      return new Response(JSON.stringify({ error: "Produit non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if product is active
    if (!up.is_active) {
      return new Response(JSON.stringify({ error: "Ce produit est expiré" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if product has expired by date
    const now = new Date();
    if (up.expires_at && new Date(up.expires_at) < now) {
      // Mark as expired
      await supabase.from("user_products").update({ is_active: false }).eq("id", up.id);
      return new Response(JSON.stringify({ error: "Ce produit est expiré" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyRevenue = Number((up.products as any)?.daily_revenue) || 0;
    if (dailyRevenue <= 0) {
      return new Response(JSON.stringify({ error: "Revenu quotidien invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STRICT 24h check
    // If never collected, use purchased_at as reference
    const referenceTime = up.last_collected_at || up.purchased_at;
    if (referenceTime) {
      const refDate = new Date(referenceTime);
      const msSinceRef = now.getTime() - refDate.getTime();
      const hoursSinceRef = msSinceRef / (1000 * 60 * 60);

      if (hoursSinceRef < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceRef);
        return new Response(JSON.stringify({ 
          error: `Vous devez attendre encore ${hoursRemaining}h avant de collecter`,
          hours_remaining: hoursRemaining,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check max cycles - total_collected should not exceed total possible
    const cycles = Number((up.products as any)?.cycles) || 365;
    const totalCollected = Number(up.total_collected) || 0;
    const maxTotal = dailyRevenue * cycles;
    if (totalCollected >= maxTotal) {
      // Product fully collected, mark as inactive
      await supabase.from("user_products").update({ is_active: false }).eq("id", up.id);
      return new Response(JSON.stringify({ error: "Tous les gains ont déjà été collectés pour ce produit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All checks passed - credit the user atomically
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance, earnings_balance")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profil non trouvé" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile balance
    const { error: profileError } = await supabase.from("profiles").update({
      balance: (profile.balance || 0) + dailyRevenue,
      earnings_balance: (profile.earnings_balance || 0) + dailyRevenue,
    }).eq("user_id", user.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: "Erreur lors du crédit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update user_product - set last_collected_at to NOW (server time)
    const serverNow = new Date().toISOString();
    await supabase.from("user_products").update({
      last_collected_at: serverNow,
      total_collected: totalCollected + dailyRevenue,
    }).eq("id", up.id);

    return new Response(JSON.stringify({ 
      success: true, 
      amount: dailyRevenue,
      message: `+${dailyRevenue.toLocaleString("fr-FR")} FCFA crédités`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Collect revenue error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
