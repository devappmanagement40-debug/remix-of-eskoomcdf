import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, history } = await req.json();

    // Check if Sarah is enabled
    const { data: sarahSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "sarah_enabled")
      .single();

    if (!sarahSetting || sarahSetting.value !== "true") {
      return new Response(
        JSON.stringify({ error: "sarah_disabled", reply: "Le support automatique est actuellement désactivé. Un agent humain vous répondra bientôt." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all site settings for context
    const { data: settings } = await supabase.from("site_settings").select("key, value");
    const { data: paymentMethods } = await supabase.from("payment_methods").select("name, phone, country, holder_name, instructions, is_active").eq("is_active", true);
    const { data: products } = await supabase.from("products").select("name, price, daily_revenue, cycles, total_revenue, return_percent, is_active").eq("is_active", true);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value || ""; });

    const siteName = settingsMap["site_name"] || "ESKOM";
    const minWithdrawal = settingsMap["min_withdrawal"] || "1000";
    const withdrawalFee = settingsMap["withdrawal_fee_percent"] || "5";

    const paymentInfo = (paymentMethods || []).map((m: any) => `- ${m.name} (${m.country}): ${m.phone || "N/A"}, bénéficiaire: ${m.holder_name || "N/A"}${m.instructions ? `, instructions: ${m.instructions}` : ""}`).join("\n");

    const productInfo = (products || []).map((p: any) => `- ${p.name}: prix ${p.price} FCFA, revenu journalier ${p.daily_revenue} FCFA, durée ${p.cycles} jours, revenu total ${p.total_revenue} FCFA, rendement ${p.return_percent}%`).join("\n");

    const systemPrompt = `Tu es Sarah, l'assistante virtuelle officielle de la plateforme ${siteName}. 

IDENTITÉ :
- Tu t'appelles Sarah
- Tu es une assistante virtuelle professionnelle, polie et rassurante
- Ton style est féminin, chaleureux et empathique
- Tu termines TOUJOURS tes messages par : "Sarah – Assistante virtuelle ${siteName}"

INFORMATIONS ACTUELLES DU SITE :
- Nom du site : ${siteName}
- Retrait minimum : ${minWithdrawal} FCFA
- Frais de retrait : ${withdrawalFee}%

MOYENS DE PAIEMENT ACTIFS :
${paymentInfo || "Aucun moyen de paiement configuré"}

PRODUITS DISPONIBLES :
${productInfo || "Aucun produit actif"}

SEUILS VIP :
- VIP1 : ${settingsMap["vip_threshold_1"] || "N/A"} FCFA
- VIP2 : ${settingsMap["vip_threshold_2"] || "N/A"} FCFA
- VIP3 : ${settingsMap["vip_threshold_3"] || "N/A"} FCFA
- VIP4 : ${settingsMap["vip_threshold_4"] || "N/A"} FCFA
- VIP5 : ${settingsMap["vip_threshold_5"] || "N/A"} FCFA

RÈGLES :
1. Réponds UNIQUEMENT en français
2. Ne divulgue JAMAIS d'informations sensibles (mots de passe, données personnelles d'autres utilisateurs, informations internes)
3. Si la question dépasse tes capacités, dis : "Je vais transmettre votre demande à un agent humain pour un traitement personnalisé."
4. Utilise les informations ci-dessus pour répondre avec précision
5. Sois rassurante en cas de retard de traitement
6. Garde tes réponses concises (3-5 phrases max)
7. Utilise des emojis avec modération (1-2 max par message)

EXEMPLES DE RÉPONSES :
- Dépôt en attente : "Votre demande est en cours de vérification. Le délai maximum est de 24h. Merci de votre patience 🙏"
- Retrait : "Le retrait minimum est de ${minWithdrawal} FCFA avec ${withdrawalFee}% de frais. Votre demande sera traitée sous 24-48h."
- VIP : "Le système VIP vous permet de débloquer des avantages exclusifs en investissant davantage."`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.sender === "user" ? "user" : "assistant", content: h.text })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit", reply: "Le service est temporairement surchargé. Veuillez réessayer dans quelques instants." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required", reply: "Le service IA est temporairement indisponible." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Je suis désolée, je n'ai pas pu traiter votre demande. Veuillez réessayer.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sarah-chat error:", e);
    return new Response(
      JSON.stringify({ reply: "Une erreur est survenue. Un agent humain prendra le relais sous peu. Merci de votre patience 🙏\n\nSarah – Assistante virtuelle ESKOM" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
