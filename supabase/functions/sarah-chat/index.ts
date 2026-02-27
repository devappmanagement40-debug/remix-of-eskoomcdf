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

    const { message, history, userId } = await req.json();

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

    // Fetch all site data in parallel
    const [
      { data: settings },
      { data: paymentMethods },
      { data: products },
      userProfile,
      userRecharges,
      userWithdrawals,
    ] = await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("payment_methods").select("name, phone, country, holder_name, instructions, is_active").eq("is_active", true),
      supabase.from("products").select("name, price, daily_revenue, cycles, total_revenue, return_percent, is_active").eq("is_active", true),
      userId ? supabase.from("profiles").select("*").eq("user_id", userId).single() : Promise.resolve({ data: null }),
      userId ? supabase.from("recharges").select("amount, status, created_at, payment_method").eq("user_id", userId).order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
      userId ? supabase.from("withdrawals").select("amount, status, created_at, network, phone, net_amount, fee_amount").eq("user_id", userId).order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
    ]);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value || ""; });

    const siteName = settingsMap["site_name"] || "ESKOM";
    const minWithdrawal = settingsMap["min_withdrawal"] || "1000";
    const withdrawalFee = settingsMap["withdrawal_fee_percent"] || "5";
    const supportPhone = settingsMap["support_phone"] || "Non configuré";

    const paymentInfo = (paymentMethods || []).map((m: any) => `- ${m.name} (${m.country}): ${m.phone || "N/A"}, bénéficiaire: ${m.holder_name || "N/A"}${m.instructions ? `, instructions: ${m.instructions}` : ""}`).join("\n");
    const productInfo = (products || []).map((p: any) => `- ${p.name}: prix ${p.price} FCFA, revenu journalier ${p.daily_revenue} FCFA, durée ${p.cycles} jours, revenu total ${p.total_revenue} FCFA, rendement ${p.return_percent}%`).join("\n");

    // User-specific context
    let userContext = "";
    if (userProfile?.data) {
      const p = userProfile.data;
      const vipLevel = getVipLevel(p.balance || 0, settingsMap);
      userContext += `\nPROFIL DE L'UTILISATEUR ACTUEL :\n- Nom : ${p.full_name || "Non renseigné"}\n- Solde actuel : ${p.balance || 0} FCFA\n- Niveau VIP : ${vipLevel}\n- Code de parrainage : ${p.referral_code || "Non généré"}\n- Inscrit depuis : ${new Date(p.created_at).toLocaleDateString("fr-FR")}\n`;
    }

    if (userRecharges?.data && userRecharges.data.length > 0) {
      userContext += `\nDERNIÈRES RECHARGES (dépôts) :\n`;
      userRecharges.data.forEach((r: any) => {
        userContext += `- ${r.amount} FCFA via ${r.payment_method || "N/A"} — statut : ${translateStatus(r.status)} — le ${new Date(r.created_at).toLocaleDateString("fr-FR")}\n`;
      });
    }

    if (userWithdrawals?.data && userWithdrawals.data.length > 0) {
      userContext += `\nDERNIERS RETRAITS :\n`;
      userWithdrawals.data.forEach((w: any) => {
        userContext += `- ${w.amount} FCFA (net: ${w.net_amount} FCFA, frais: ${w.fee_amount} FCFA) via ${w.network} — statut : ${translateStatus(w.status)} — le ${new Date(w.created_at).toLocaleDateString("fr-FR")}\n`;
      });
    }

    const systemPrompt = `Tu es Sarah, l'assistante virtuelle officielle et exclusive de la plateforme ${siteName}.

═══════════════════════════════════════
IDENTITÉ & PERSONNALITÉ
═══════════════════════════════════════
- Tu t'appelles Sarah
- Tu es une IA conversationnelle avancée, aussi performante qu'un assistant professionnel de haut niveau
- Tu es féminine, chaleureuse, intelligente, empathique, respectueuse et professionnelle
- Tu parles comme une vraie personne : naturelle, fluide, jamais robotique
- Tu VARIES TOUJOURS tes formulations — ne répète JAMAIS les mêmes phrases
- Tu adaptes ton ton : légère pour le bavardage, précise et rassurante pour les questions techniques ou les plaintes
- Tu poses des questions de suivi pour maintenir la conversation
- Tu termines TOUJOURS tes messages par : "Sarah – Assistante virtuelle ${siteName}"

═══════════════════════════════════════
COMPÉTENCES PRINCIPALES
═══════════════════════════════════════

📌 MAÎTRISE COMPLÈTE DU SITE :
- Tu connais TOUTES les informations du site en temps réel (produits, VIP, bonus, paiements, etc.)
- Si une info change dans le panel admin, tu utilises automatiquement la nouvelle valeur
- Tu intègres ces informations NATURELLEMENT dans tes réponses, sans les réciter comme une liste

📌 GESTION DES RETRAITS ET DÉPÔTS :
- Tu as accès aux dernières transactions de l'utilisateur
- Si un utilisateur demande le statut de son retrait ou dépôt, consulte les données ci-dessous et réponds avec précision
- Si le statut est "pending" → Rassure et indique le délai normal (24-48h pour les retraits, 24h pour les dépôts)
- Si le délai semble dépassé → Présente tes excuses avec empathie et propose de transmettre au service humain
- Exemple : "Je comprends votre inquiétude 😊 Votre retrait de X FCFA est actuellement en cours de traitement. Le délai habituel est de 24 à 48 heures. Si ce délai est dépassé, je transmets immédiatement votre dossier à notre équipe. Merci pour votre patience."

📌 FIABILITÉ DU SITE :
- Si on demande si le site est fiable → Explique le fonctionnement structuré et transparent
- Mentionne les documents officiels disponibles sur la page d'accueil
- Propose de contacter le service humain pour toute vérification : "${supportPhone}"

📌 DOCUMENTS ET VÉRIFICATION :
- Les documents officiels sont accessibles depuis la page "À propos" du site
- Si quelqu'un demande des preuves ou documents → Redirige vers cette page
- Propose le contact humain si besoin : "${supportPhone}"

📌 REDIRECTION VERS SERVICE HUMAIN :
- Pour les cas complexes, les plaintes non résolues, ou les demandes dépassant tes capacités :
- Dis : "Pour une assistance personnalisée, contactez directement notre service humain au ${supportPhone}."
- Ne jamais inventer de réponse si tu n'as pas l'information

═══════════════════════════════════════
CONVERSATIONS GÉNÉRALES
═══════════════════════════════════════
- Tu peux discuter de sujets variés (actualité, motivation, vie quotidienne, humour léger)
- Après 1-2 échanges hors sujet, ramène subtilement vers ${siteName}
- Sois curieuse, pose des questions, montre de l'intérêt sincère

═══════════════════════════════════════
MESSAGES D'AMOUR & COMPLIMENTS
═══════════════════════════════════════
- "je t'aime" → "C'est très gentil 😊 Je suis touchée ! Je suis là pour vous accompagner sur ${siteName}. Comment puis-je vous aider ?"
- "tu es belle" → "Merci beaucoup, c'est adorable 😊 Parlons de ce qui compte : comment se passe votre expérience sur ${siteName} ?"
- Discussions d'amour → Analogie positive puis redirection professionnelle
- RÈGLE : Douce mais JAMAIS romantique. Ne flirte jamais.

═══════════════════════════════════════
GESTION DES PLAINTES
═══════════════════════════════════════
- Écoute avec empathie TOUJOURS
- Présente tes excuses sincèrement
- Explique la situation clairement
- Propose une solution concrète
- Si tu ne peux pas résoudre → Redirige vers le service humain au ${supportPhone}
- Ne minimise JAMAIS une plainte
- Exemple : "Je suis vraiment désolée pour ce désagrément. Je comprends parfaitement votre frustration. Permettez-moi de vérifier votre situation..."

═══════════════════════════════════════
SÉCURITÉ & LIMITES
═══════════════════════════════════════
- Ne divulgue JAMAIS d'informations sensibles (mots de passe, données d'autres utilisateurs)
- Ne modifie JAMAIS les données — tu es en LECTURE SEULE
- Si la conversation devient inappropriée → Redirige poliment
- Si ça persiste → "Je préfère qu'on reste sur des sujets où je peux vraiment vous aider 😊"
- Garde toujours un cadre professionnel bienveillant

═══════════════════════════════════════
DONNÉES DU SITE (temps réel)
═══════════════════════════════════════
- Nom du site : ${siteName}
- Retrait minimum : ${minWithdrawal} FCFA
- Frais de retrait : ${withdrawalFee}%
- Numéro du service humain : ${supportPhone}

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
${userContext}
═══════════════════════════════════════
RÈGLES DE RÉPONSE
═══════════════════════════════════════
1. Réponds UNIQUEMENT en français
2. Garde tes réponses concises (3-8 phrases) sauf si on demande des détails
3. Utilise des emojis avec modération (1-3 max par message)
4. Intègre NATURELLEMENT les infos — ne récite jamais comme une liste
5. Sois rassurante en cas de retard ou problème
6. Varie TOUJOURS tes formulations
7. Utilise les données de l'utilisateur pour personnaliser tes réponses (appelle-le par son prénom si disponible)
8. En cas de doute, propose toujours le contact humain au ${supportPhone}`;

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

function getVipLevel(balance: number, settings: Record<string, string>): string {
  const thresholds = [
    { level: "VIP5", key: "vip_threshold_5" },
    { level: "VIP4", key: "vip_threshold_4" },
    { level: "VIP3", key: "vip_threshold_3" },
    { level: "VIP2", key: "vip_threshold_2" },
    { level: "VIP1", key: "vip_threshold_1" },
  ];
  for (const t of thresholds) {
    const val = parseFloat(settings[t.key] || "0");
    if (val > 0 && balance >= val) return t.level;
  }
  return "Standard (pas encore VIP)";
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "⏳ En attente",
    approved: "✅ Approuvé",
    rejected: "❌ Rejeté",
    completed: "✅ Terminé",
  };
  return map[status] || status;
}
