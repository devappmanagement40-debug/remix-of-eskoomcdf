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
      .select("*, products(daily_revenue, cycles, total_revenue, gain_type)")
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

    const now = new Date();
    const gainType = (up.products as any)?.gain_type || "daily";
    const cycles = Number((up.products as any)?.cycles) || 365;
    const totalCollected = Number(up.total_collected) || 0;

    // ===== BLOCKED GAIN TYPE =====
    if (gainType === "blocked") {
      const totalRevenue = Number((up.products as any)?.total_revenue) || 0;
      if (totalRevenue <= 0) {
        return new Response(JSON.stringify({ error: "Gain total invalide" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Already collected?
      if (totalCollected > 0) {
        return new Response(JSON.stringify({ error: "Les gains de ce produit ont déjà été collectés" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if cycle has ended
      const purchasedAt = up.purchased_at ? new Date(up.purchased_at) : null;
      if (!purchasedAt) {
        return new Response(JSON.stringify({ error: "Date d'achat introuvable" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const endDate = new Date(purchasedAt.getTime() + cycles * 24 * 60 * 60 * 1000);
      if (now < endDate) {
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return new Response(JSON.stringify({
          error: `Les gains sont bloqués. Encore ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} avant la collecte.`,
          days_remaining: daysRemaining,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cycle ended — credit the total revenue
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

      const { error: profileError } = await supabase.from("profiles").update({
        balance: (profile.balance || 0) + totalRevenue,
        earnings_balance: (profile.earnings_balance || 0) + totalRevenue,
      }).eq("user_id", user.id);

      if (profileError) {
        return new Response(JSON.stringify({ error: "Erreur lors du crédit" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark product as collected and inactive
      const serverNow = new Date().toISOString();
      await supabase.from("user_products").update({
        last_collected_at: serverNow,
        total_collected: totalRevenue,
        is_active: false,
      }).eq("id", up.id);

      return new Response(JSON.stringify({
        success: true,
        amount: totalRevenue,
        message: `+${totalRevenue.toLocaleString("fr-FR")} CDF crédités (gains débloqués)`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== DAILY GAIN TYPE (existing logic) =====
    // Check if product has expired by date
    if (up.expires_at && new Date(up.expires_at) < now) {
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

    // STRICT 24h check (hours, minutes, seconds precision)
    const referenceTime = up.last_collected_at || up.purchased_at;
    if (referenceTime) {
      const refDate = new Date(referenceTime);
      const msSinceRef = now.getTime() - refDate.getTime();
      const msRequired = 24 * 60 * 60 * 1000; // exactly 24h in ms

      if (msSinceRef < msRequired) {
        const msRemaining = msRequired - msSinceRef;
        const totalSecondsRemaining = Math.ceil(msRemaining / 1000);
        const h = Math.floor(totalSecondsRemaining / 3600);
        const m = Math.floor((totalSecondsRemaining % 3600) / 60);
        const s = totalSecondsRemaining % 60;

        let timeStr = "";
        if (h > 0) timeStr += `${h}h `;
        if (m > 0 || h > 0) timeStr += `${String(m).padStart(2, "0")}min `;
        timeStr += `${String(s).padStart(2, "0")}s`;

        return new Response(JSON.stringify({
          error: `Vous devez attendre encore ${timeStr.trim()} avant de collecter`,
          hours_remaining: h,
          minutes_remaining: m,
          seconds_remaining: s,
          ms_remaining: msRemaining,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check max cycles
    const maxTotal = dailyRevenue * cycles;
    if (totalCollected >= maxTotal) {
      await supabase.from("user_products").update({ is_active: false }).eq("id", up.id);
      return new Response(JSON.stringify({ error: "Tous les gains ont déjà été collectés pour ce produit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit the user
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

    const serverNow = new Date().toISOString();
    await supabase.from("user_products").update({
      last_collected_at: serverNow,
      total_collected: totalCollected + dailyRevenue,
    }).eq("id", up.id);

    return new Response(JSON.stringify({
      success: true,
      amount: dailyRevenue,
      message: `+${dailyRevenue.toLocaleString("fr-FR")} CDF crédités`,
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
