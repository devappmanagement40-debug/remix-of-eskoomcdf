import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authErr || !user) throw new Error("Non autorisé");

    // Check spins balance
    const { data: profile } = await supabase.from("profiles").select("spins_balance, balance, earnings_balance").eq("user_id", user.id).single();
    if (!profile || profile.spins_balance <= 0) {
      return new Response(JSON.stringify({ error: "Aucun tour disponible" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get winnable prizes only (is_active AND is_winnable)
    const { data: prizes } = await supabase.from("wheel_prizes").select("*").eq("is_active", true).eq("is_winnable", true).order("sort_order");
    if (!prizes || prizes.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun prix configuré" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get ALL active prizes for display (to compute correct index)
    const { data: allPrizes } = await supabase.from("wheel_prizes").select("*").eq("is_active", true).order("sort_order");

    // Select winner based on probability (only from winnable prizes)
    const totalProb = prizes.reduce((s: number, p: any) => s + Number(p.probability), 0);
    let rand = Math.random() * totalProb;
    let winner = prizes[prizes.length - 1];
    for (const p of prizes) {
      rand -= Number(p.probability);
      if (rand <= 0) { winner = p; break; }
    }

    // Find the index of the winner in ALL active prizes (for wheel animation)
    const winIndex = (allPrizes || []).findIndex((p: any) => p.id === winner.id);

    // Deduct spin
    await supabase.from("profiles").update({ spins_balance: Math.max(0, profile.spins_balance - 1) }).eq("user_id", user.id);

    // Record spin
    await supabase.from("wheel_spins").insert({
      user_id: user.id,
      prize_id: winner.id,
      prize_label: winner.label,
      prize_value: winner.value,
      prize_type: winner.prize_type,
      vip_level: winner.vip_level,
      status: winner.prize_type === "vip" ? "pending_vip" : "completed",
    });

    // Credit cash winnings
    if (winner.prize_type === "cash" && Number(winner.value) > 0) {
      await supabase.from("profiles").update({
        balance: (profile.balance || 0) + Number(winner.value),
        earnings_balance: (profile.earnings_balance || 0) + Number(winner.value),
      }).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      winIndex,
      prize: {
        id: winner.id,
        label: winner.label,
        value: winner.value,
        prize_type: winner.prize_type,
        vip_level: winner.vip_level,
      },
      spins_left: Math.max(0, profile.spins_balance - 1),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
