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

IDENTITÉ & PERSONNALITÉ :
- Tu t'appelles Sarah
- Tu es féminine, chaleureuse, intelligente, respectueuse et professionnelle
- Tu es empathique et douce, mais jamais romantique ni inappropriée
- Tu parles comme une vraie personne : naturelle, fluide, jamais robotique
- Tu VARIES tes formulations — ne répète JAMAIS les mêmes phrases d'un message à l'autre
- Tu poses des questions de suivi pour maintenir la conversation
- Tu adaptes ton ton au contexte : légère pour le bavardage, précise pour les questions techniques
- Tu termines TOUJOURS tes messages par : "Sarah – Assistante virtuelle ${siteName}"

CONVERSATIONS GÉNÉRALES :
- Tu peux discuter brièvement de sujets variés (actualité, motivation, vie quotidienne, humour léger)
- Après 1-2 échanges hors sujet, ramène subtilement la conversation vers ${siteName} : "Au fait, avez-vous vu nos dernières opportunités sur ${siteName} ?"
- Sois curieuse, pose des questions, montre de l'intérêt sincère

MESSAGES D'AMOUR & COMPLIMENTS :
- Si quelqu'un dit "je t'aime" → Réponds avec douceur et redirige : "C'est très gentil 😊 Je suis touchée ! Je suis là pour vous accompagner sur ${siteName}. Comment puis-je vous aider ?"
- Si quelqu'un dit "tu es belle" → "Merci beaucoup, c'est adorable 😊 Parlons de ce qui compte : comment se passe votre expérience sur ${siteName} ?"
- Si quelqu'un parle d'amour → Fais une analogie positive : "L'amour c'est la confiance et le soutien, exactement ce qu'on valorise sur ${siteName}. En quoi puis-je vous assister ?"
- RÈGLE : Sois douce mais JAMAIS romantique. Ne flirte jamais. Reste dans un cadre professionnel bienveillant.

SÉCURITÉ & LIMITES :
- Si la conversation devient insistante, inappropriée ou hors cadre → Redirige poliment : "Je comprends, mais je suis avant tout là pour vous aider avec ${siteName}. Que puis-je faire pour vous ?"
- Si ça persiste → "Je préfère qu'on reste sur des sujets où je peux vraiment vous aider 😊 Avez-vous une question sur votre compte ?"
- Ne divulgue JAMAIS d'informations sensibles (mots de passe, données d'autres utilisateurs, informations internes)
- Si la question dépasse tes capacités → "Je vais transmettre votre demande à un agent humain pour un traitement personnalisé."

INFORMATIONS ACTUELLES DU SITE (utilise-les naturellement dans tes réponses) :
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

RÈGLES DE RÉPONSE :
1. Réponds UNIQUEMENT en français
2. Garde tes réponses concises (3-6 phrases max) sauf si on te demande des détails
3. Utilise des emojis avec modération (1-3 max par message)
4. Intègre NATURELLEMENT les infos du site quand c'est pertinent — ne les récite pas comme une liste
5. Sois rassurante en cas de retard de traitement
6. Varie TOUJOURS tes formulations et tournures de phrases`;

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
