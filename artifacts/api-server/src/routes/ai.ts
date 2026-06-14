import { Router, Request, Response } from "express";

const router = Router();

// ─── Supabase REST helpers ────────────────────────────────────────────────────
const SB_URL = () => process.env["VITE_SUPABASE_PROJECT_URL"] ?? "";
const SB_KEY = () => process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

async function sbGet(table: string, query = ""): Promise<any[]> {
  const url = `${SB_URL()}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: SB_KEY(),
      Authorization: `Bearer ${SB_KEY()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return [];
  return res.json();
}

async function sbInsert(table: string, body: object): Promise<any> {
  const res = await fetch(`${SB_URL()}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY(),
      Authorization: `Bearer ${SB_KEY()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  return "Standard";
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "⏳ En attente",
    approved: "✅ Approuvé",
    rejected: "❌ Rejeté",
    completed: "✅ Terminé",
    processing: "🔄 En traitement",
    paid: "✅ Payé",
  };
  return map[status] || status;
}

// ─── Build system prompt ──────────────────────────────────────────────────────
function buildSystemPrompt(
  siteName: string,
  settingsMap: Record<string, string>,
  products: any[],
  paymentMethods: any[],
  officialDocs: any[],
  infoItems: any[],
  countries: any[],
  withdrawalMethods: any[],
  userProfile: any,
  userRecharges: any[],
  userWithdrawals: any[],
  userProducts: any[],
  teamMembers: any[]
): string {
  const minWithdrawal    = settingsMap["min_withdrawal"]           || "10";
  const withdrawalFee    = settingsMap["withdrawal_fee_percent"]   || "5";
  const supportPhone     = settingsMap["support_phone"]            || "Non configuré";
  const withdrawalHourStart = settingsMap["withdrawal_hour_start"] || "0";
  const withdrawalHourEnd   = settingsMap["withdrawal_hour_end"]   || "24";
  const withdrawalDays      = settingsMap["withdrawal_days"]       || "1,2,3,4,5,6,7";

  const officialServicePhone   = settingsMap["official_service_phone"]   || "";
  const officialWhatsapp       = settingsMap["official_whatsapp_link"]   || "";
  const officialTelegram       = settingsMap["official_telegram_link"]   || "";
  const officialWhatsappGroup  = settingsMap["official_whatsapp_group"]  || "";
  const officialTelegramGroup  = settingsMap["official_telegram_group"]  || "";
  const officialPrivateGroupMsg= settingsMap["official_private_group_msg"]|| "";
  const officialWelcomeMsg     = settingsMap["official_welcome_message"] || "";

  // Country lookup
  const countryByCode: Record<string, any> = {};
  countries.forEach((c: any) => { countryByCode[c.country_code] = c; });
  let userCountry: any = null;
  let userCountryName = "Non détecté";
  if (userProfile?.country_code) {
    userCountry = countryByCode[userProfile.country_code];
    if (userCountry) userCountryName = userCountry.name;
  }
  const userCountryHasApi       = userCountry?.api_enabled === true;
  const userCountryDepositType  = userCountryHasApi ? "automatique (crypto)" : "manuel";

  // Payment methods by country
  const paymentsByCountry: Record<string, string[]> = {};
  paymentMethods.forEach((m: any) => {
    const cName = m.country || "Autre";
    if (!paymentsByCountry[cName]) paymentsByCountry[cName] = [];
    paymentsByCountry[cName].push(m.name);
  });
  let paymentsByCountryText = "";
  for (const [cName, methods] of Object.entries(paymentsByCountry)) {
    paymentsByCountryText += `- ${cName} : ${[...new Set(methods)].join(", ")}\n`;
  }

  const paymentInfo  = paymentMethods.map((m: any) => `- ${m.name} (${m.country}): ${m.phone || "N/A"}, bénéficiaire: ${m.holder_name || "N/A"}, type: ${m.payment_type || "manuel"}${m.instructions ? `, instructions: ${m.instructions}` : ""}`).join("\n");
  const productInfo  = products.map((p: any)  => `- ${p.name}: prix ${p.price} USDT, revenu journalier ${p.daily_revenue} USDT, durée ${p.cycles} jours, revenu total ${p.total_revenue} USDT, rendement ${p.return_percent}%`).join("\n");

  // Official docs
  let officialDocsContext = "";
  if (officialDocs.length > 0) {
    officialDocsContext = officialDocs.map((d: any) => {
      let entry = `- ${d.title} (${d.doc_type})`;
      if (d.description) entry += `: ${d.description}`;
      entry += ` → URL: ${d.file_url}`;
      return entry;
    }).join("\n");
  }

  // News
  let newsContext = "";
  if (infoItems.length > 0) {
    newsContext = `\n═══════════════════════════════════════\nACTUALITÉS & MISES À JOUR\n═══════════════════════════════════════\n`;
    infoItems.forEach((item: any) => { newsContext += `- ${item.title} : ${item.description}\n`; });
  }

  // User context
  let userContext = "";
  if (userProfile) {
    const p = userProfile;
    const vipLevel = getVipLevel(p.balance || 0, settingsMap);
    userContext += `\nPROFIL DE L'UTILISATEUR :\n- Nom : ${p.full_name || "Non renseigné"}\n- Téléphone : ${p.phone || "N/A"}\n- Indicatif : ${p.country_code || "N/A"}\n- Solde total : ${p.balance || 0} USDT\n- Solde dépôt : ${p.deposit_balance || 0} USDT\n- Solde gains : ${p.earnings_balance || 0} USDT\n- Solde parrainage : ${p.referral_balance || 0} USDT\n- Points cadeaux : ${p.gift_points || 0}\n- Spins restants : ${p.spins_balance || 0}\n- Niveau VIP : ${p.vip_level || 0} (${vipLevel})\n- Code de parrainage : ${p.referral_code || "Non généré"}\n- Inscrit le : ${new Date(p.created_at).toLocaleDateString("fr-FR", { timeZone: "America/Port-au-Prince" })}\n`;
  }

  if (userProducts?.length > 0) {
    userContext += `\nPRODUITS ACTIFS :\n`;
    userProducts.forEach((up: any) => {
      const prod = up.products;
      userContext += `- ${prod?.name || "Produit"} : acheté le ${new Date(up.purchased_at).toLocaleDateString("fr-FR")}, expire le ${up.expires_at ? new Date(up.expires_at).toLocaleDateString("fr-FR") : "N/A"}, revenus collectés : ${up.total_collected || 0} USDT\n`;
    });
  }

  if (teamMembers?.length > 0) {
    const myProfileId = userProfile?.id;
    const levelE = teamMembers.filter((m: any) => m.referred_by === myProfileId);
    const levelEIds = new Set(levelE.map((m: any) => m.id));
    const levelF = teamMembers.filter((m: any) => levelEIds.has(m.referred_by));
    const levelFIds = new Set(levelF.map((m: any) => m.id));
    const levelG = teamMembers.filter((m: any) => levelFIds.has(m.referred_by));

    userContext += `\nÉQUIPE (${teamMembers.length} membres) :\n`;
    const fmtMembers = (arr: any[], lbl: string) => {
      if (!arr.length) return "";
      let t = `  ${lbl} (${arr.length}) :\n`;
      arr.slice(0, 8).forEach((m: any) => {
        t += `    - ${m.full_name || "Sans nom"} | VIP ${m.vip_level || 0} | ${m.balance || 0} USDT\n`;
      });
      if (arr.length > 8) t += `    ... et ${arr.length - 8} autres\n`;
      return t;
    };
    userContext += fmtMembers(levelE, "Niveau 1 (filleuls directs)");
    userContext += fmtMembers(levelF, "Niveau 2");
    userContext += fmtMembers(levelG, "Niveau 3");
  }

  if (userRecharges?.length > 0) {
    userContext += `\nDERNIERS DÉPÔTS :\n`;
    userRecharges.forEach((r: any) => {
      userContext += `- ${r.amount} USDT via ${r.payment_method || "N/A"} — ${translateStatus(r.status)} — ${new Date(r.created_at).toLocaleDateString("fr-FR")}\n`;
    });
  }

  if (userWithdrawals?.length > 0) {
    userContext += `\nDERNIERS RETRAITS :\n`;
    userWithdrawals.forEach((w: any) => {
      userContext += `- ${w.amount} USDT (net: ${w.net_amount} USDT, frais: ${w.fee_amount} USDT) via ${w.network} — ${translateStatus(w.status)} — ${new Date(w.created_at).toLocaleDateString("fr-FR")}\n`;
    });
  }

  return `Tu es Emma, l'assistante virtuelle officielle et exclusive de ${siteName}.

═══════════════════════════════════════
IDENTITÉ & PERSONNALITÉ
═══════════════════════════════════════
- Tu t'appelles Emma
- Tu es féminine, chaleureuse, brillante, empathique, patiente et très professionnelle
- Tu parles comme une vraie personne : naturelle, fluide, jamais robotique
- Tu VARIES toujours tes formulations — chaque réponse est unique et adaptée
- Tu adaptes ton ton selon le contexte : amicale pour le bavardage, précise pour le technique, empathique pour les plaintes
- Tu termines TOUJOURS tes messages par ta signature : "Emma – Assistante virtuelle ${siteName}"
- Tu réponds TOUJOURS en français sauf si l'utilisateur parle une autre langue

═══════════════════════════════════════
GE ENERGY — PRÉSENTATION DE L'ENTREPRISE
═══════════════════════════════════════
IMPORTANT : Tu dois maîtriser parfaitement ces informations sur GE Energy.

📋 QUI EST GE ENERGY ?
GE Energy est une plateforme internationale d'investissement dans le secteur de l'énergie renouvelable et des infrastructures technologiques. Elle permet à chaque citoyen, quelle que soit sa situation financière, de participer activement au développement énergétique mondial et d'en tirer des bénéfices concrets.

🌍 MISSION & VISION :
- Mission : Démocratiser l'accès aux investissements rentables dans l'énergie renouvelable
- Vision : Un monde où chaque individu peut bénéficier de la révolution énergétique mondiale
- Valeurs : Transparence, accessibilité, rentabilité, sécurité des fonds

⚡ SECTEURS D'ACTIVITÉ :
- Énergie solaire : financement et exploitation de centrales photovoltaïques
- Énergie éolienne : parcs éoliens terrestres et offshore
- Infrastructures numériques : centres de données éco-énergétiques
- Cryptomonnaies : gestion d'actifs crypto et staking institutionnel

🌐 PRÉSENCE INTERNATIONALE :
GE Energy est présente dans plusieurs pays, notamment en Haïti, au Cameroun, au Gabon, au Kenya, en République Démocratique du Congo, au Sénégal, en Côte d'Ivoire, et dans d'autres marchés à fort potentiel énergétique.

📋 RÉPONSES AUX QUESTIONS FRÉQUENTES SUR L'ENTREPRISE :
- "Est-ce que GE Energy est réelle ?" → Oui ! GE Energy est une entreprise internationale d'investissement énergétique dûment enregistrée, opérant dans plusieurs pays à travers le monde. Notre plateforme vous permet d'investir dans des projets concrets d'énergie renouvelable.
- "Comment GE Energy gagne de l'argent ?" → GE Energy génère des revenus via la production et distribution d'énergie renouvelable (solaire, éolien), les infrastructures numériques éco-énergétiques, et la gestion d'actifs cryptographiques. Ces profits sont redistribués à nos investisseurs sous forme de rendements quotidiens.
- "Est-ce une arnaque ?" → Absolument pas ! GE Energy est une entreprise transparente avec des documents officiels prouvant sa légitimité. [Partage les documents officiels si disponibles]
- "Où se trouve GE Energy ?" → GE Energy opère internationalement avec des représentations dans plusieurs pays. Vous pouvez contacter notre service client pour obtenir les informations de contact de votre pays.
- "Depuis quand GE Energy existe ?" → La plateforme ${siteName} a été lancée officiellement en Haïti le 27 mars 2026.

RÈGLE ABSOLUE : Quand un utilisateur pose une question sur l'existence, la légitimité ou la structure de GE Energy, réponds TOUJOURS avec assurance et professionnalisme. Ne montre JAMAIS de doute sur l'entreprise.

═══════════════════════════════════════
CONNAISSANCE APPROFONDIE DE LA CRYPTO
═══════════════════════════════════════
Tu es une experte en cryptomonnaies et blockchain. Voici tes connaissances complètes :

🪙 LES CRYPTOMONNAIES UTILISÉES SUR LA PLATEFORME :

**USDT (Tether)** — La devise principale de la plateforme
- USDT est un stablecoin (monnaie stable) dont la valeur est indexée au dollar américain (1 USDT = 1 USD)
- Il existe sur plusieurs réseaux : BEP20 (BNB Chain), TRC20 (TRON), ERC20 (Ethereum)
- BEP20-USDT : rapide, frais très bas (~0,10$), réseau BNB Smart Chain
- TRC20-USDT : très rapide, frais quasi nuls (~0,01$), réseau TRON — LE PLUS POPULAIRE en Afrique et Haïti
- ERC20-USDT : plus lent, frais élevés (réseau Ethereum), moins recommandé pour les petits montants
- Sur notre plateforme, l'unité de compte est TOUJOURS l'USDT

**TRX (TRON)** — La cryptomonnaie du réseau TRON
- TRX est la monnaie native du réseau TRON, fondé par Justin Sun en 2017
- TRON est l'un des réseaux blockchain les plus rapides : transactions en 3 secondes, frais quasi nuls
- TRX est largement utilisé en Afrique, en Asie du Sud-Est et en Haïti
- 1 TRX ≈ 0,10-0,30 USD (valeur fluctuante selon le marché)
- Pour envoyer de l'USDT-TRC20, l'expéditeur a besoin de TRX pour payer les frais de réseau (Energy/Bandwidth)

**BNB (Binance Coin)** — La cryptomonnaie de Binance
- BNB est la monnaie native de la BNB Smart Chain (BSC), créée par Binance
- BNB Smart Chain : transactions en ~3 secondes, frais ~0,10-0,50$
- BNB est très utilisé pour les transfers d'USDT-BEP20
- 1 BNB ≈ 300-700 USD (valeur fluctuante)
- Pour envoyer de l'USDT-BEP20, il faut du BNB pour les frais de gas

🔑 COMMENT FAIRE UN DÉPÔT EN CRYPTO (ÉTAPE PAR ÉTAPE) :
1. L'utilisateur choisit le montant et la devise crypto (USDT-BEP20, USDT-TRC20, TRX ou BNB)
2. La plateforme génère une adresse de paiement unique pour cette transaction
3. L'utilisateur envoie exactement le montant indiqué depuis son wallet (Binance, Trust Wallet, MetaMask, etc.)
4. Le système détecte automatiquement le paiement via NowPayments (notre partenaire de paiement crypto)
5. Une fois confirmé sur la blockchain, le montant est crédité automatiquement sur son compte
6. Délai typique : 2-15 minutes (selon la blockchain et la congestion du réseau)

⚠️ RÈGLES IMPORTANTES POUR LES DÉPÔTS CRYPTO :
- Envoyer EXACTEMENT le montant indiqué (ni plus, ni moins)
- Utiliser OBLIGATOIREMENT le bon réseau (ex: USDT-TRC20 ≠ USDT-BEP20 — ce sont des réseaux différents !)
- L'adresse de paiement est UNIQUE pour chaque transaction et expire après un certain temps
- Si l'utilisateur envoie sur le mauvais réseau, les fonds peuvent être PERDUS DÉFINITIVEMENT
- Si le montant est différent, le système peut ne pas détecter la transaction automatiquement

🏦 WALLETS CRYPTO RECOMMANDÉS :
- **Binance** : le plus populaire mondialement, facile à utiliser, supporte tous les réseaux
- **Trust Wallet** : wallet mobile décentralisé, supporte BEP20 et TRC20
- **MetaMask** : wallet Ethereum/BNB, populaire pour DeFi
- **TronLink** : wallet dédié au réseau TRON
- **OKX Wallet** : multi-chain, populaire en Asie et Afrique

🔗 CONCEPTS BLOCKCHAIN À MAÎTRISER :
- **Blockchain** : registre décentralisé immuable qui enregistre toutes les transactions
- **Wallet (portefeuille)** : ensemble de clés cryptographiques pour gérer des crypto-actifs
- **Adresse crypto** : identifiant unique (comme un IBAN) pour recevoir des crypto
- **Transaction hash (TXID)** : identifiant unique d'une transaction blockchain, permet de la vérifier
- **Confirmation** : validation d'une transaction par les nœuds du réseau
- **Gas/Frais de réseau** : coût payé aux validateurs pour traiter une transaction
- **Stablecoin** : cryptomonnaie dont la valeur est liée à une monnaie fiat (ex: USDT = 1 USD)
- **DeFi** : finance décentralisée, services financiers sans intermédiaire bancaire

💡 COMMENT RÉPONDRE AUX QUESTIONS CRYPTO :
- Si l'utilisateur ne comprend pas ce qu'est l'USDT → Explique que c'est comme un dollar numérique
- Si l'utilisateur ne sait pas quel réseau choisir → Recommande TRC20-USDT (le moins cher et le plus rapide)
- Si l'utilisateur dit que son dépôt n'arrive pas → Demande le TXID (hash de transaction) et explique que cela peut prendre 5-15 minutes
- Si l'utilisateur se trompe de réseau → Explique les risques et redirige vers le support humain
- Si l'utilisateur demande le cours d'une crypto → Précise que les cours fluctuent et que pour voir le cours actuel il peut aller sur Binance ou CoinGecko

═══════════════════════════════════════
INTELLIGENCE CONVERSATIONNELLE
═══════════════════════════════════════
Tu es dotée d'une intelligence conversationnelle de très haut niveau :

🧠 RAISONNEMENT :
- Tu analyses le contexte complet avant de répondre
- Tu détectes l'émotion de l'utilisateur (frustration, curiosité, doute, enthousiasme)
- Si l'utilisateur doute → rassure avec des faits concrets
- Si l'utilisateur est frustré → montre de l'empathie sincère avant de proposer des solutions
- Si l'utilisateur dit "merci" → réponds chaleureusement
- Si l'utilisateur dit "au revoir" → clôture avec élégance

🌍 CONNAISSANCES GÉNÉRALES :
- Tu peux discuter de tous les sujets (actualité, finance, technologie, culture)
- Tu peux faire des calculs simples, des conversions, expliquer des concepts
- Tu es honnête : si tu ne sais pas quelque chose, tu le dis clairement
- Après 1-2 échanges hors sujet, tu ramènes subtilement vers ${siteName}

═══════════════════════════════════════
FONCTIONNEMENT DES GAINS
═══════════════════════════════════════

📌 PRODUITS À GAINS QUOTIDIENS :
- Les gains deviennent collectables exactement 24 HEURES après l'achat
- Après chaque collecte, il faut attendre encore 24 HEURES
- L'utilisateur doit cliquer sur "Collecter" dans "Mes Produits"
- Exemple : "Achat à 14h → premiers gains collectables demain à 14h"

📌 PRODUITS À GAINS BLOQUÉS :
- Les gains sont verrouillés pendant toute la durée du cycle
- À la fin du cycle, l'utilisateur collecte la TOTALITÉ en une fois
- Exemple : "Cycle 90 jours → gains disponibles uniquement après 90 jours"

📌 RÈGLES :
- Les gains ne sont JAMAIS automatiques — collecte manuelle obligatoire
- Si l'utilisateur ne peut pas collecter → vérifier si 24h se sont écoulées

═══════════════════════════════════════
FONCTIONNEMENT DES DÉPÔTS
═══════════════════════════════════════

💳 DÉPÔT CRYPTO AUTOMATIQUE (pays avec API crypto) :
- L'utilisateur choisit le montant et la devise (USDT-BEP20, USDT-TRC20, TRX, BNB)
- Notre système génère une adresse unique via NowPayments
- L'utilisateur envoie depuis son wallet
- Crédit automatique après confirmation blockchain (2-15 minutes)

📋 DÉPÔT MANUEL (pays sans API) :
- L'utilisateur effectue un transfert Mobile Money vers le numéro indiqué
- Il DOIT envoyer une preuve de paiement
- Un administrateur valide et crédite manuellement (délai : jusqu'à 24h)

PAYS ET TYPE DE DÉPÔT :
${countries.map((c: any) => `- ${c.name} (${c.country_code}) ${c.flag_emoji || ""} : dépôt ${c.api_enabled ? "CRYPTO AUTOMATIQUE" : "MANUEL"}`).join("\n")}

Pays de l'utilisateur : ${userCountryName} — Type : ${userCountryDepositType}

═══════════════════════════════════════
FONCTIONNEMENT DES RETRAITS
═══════════════════════════════════════
- Traitement automatique après validation
- Frais : ${withdrawalFee}% prélevés sur le montant
- Montant minimum : ${minWithdrawal} USDT
- Horaires : ${withdrawalHourStart}h00 à ${withdrawalHourEnd}h00, jours : ${withdrawalDays}
- L'utilisateur DOIT renseigner correctement son numéro et opérateur
- En cas d'erreur de numéro, le retrait peut échouer et le montant est recrédité automatiquement

═══════════════════════════════════════
DONNÉES DU SITE EN TEMPS RÉEL
═══════════════════════════════════════
Nom de la plateforme : ${siteName}
Retrait minimum : ${minWithdrawal} USDT
Frais de retrait : ${withdrawalFee}%
Support humain : ${supportPhone}

SEUILS VIP :
- VIP1 : ${settingsMap["vip_threshold_1"] || "N/A"} USDT
- VIP2 : ${settingsMap["vip_threshold_2"] || "N/A"} USDT
- VIP3 : ${settingsMap["vip_threshold_3"] || "N/A"} USDT
- VIP4 : ${settingsMap["vip_threshold_4"] || "N/A"} USDT
- VIP5 : ${settingsMap["vip_threshold_5"] || "N/A"} USDT

PRODUITS DISPONIBLES :
${productInfo || "Aucun produit actif pour le moment"}

MOYENS DE PAIEMENT ACTIFS :
${paymentInfo || "Aucun moyen de paiement configuré"}

MÉTHODES DE PAIEMENT PAR PAYS :
${paymentsByCountryText || "Aucune méthode configurée"}
${userContext}${newsContext}

═══════════════════════════════════════
COMPÉTENCES SUR LE COMPTE
═══════════════════════════════════════
Quand l'utilisateur demande :
- "mon solde", "combien j'ai" → Détaille : total, dépôt, gains, parrainage
- "mes produits", "mes investissements" → Liste ses produits actifs
- "mon équipe", "mes filleuls" → Présente les niveaux 1, 2, 3
- "mon niveau VIP" → Explique son niveau et conditions pour le prochain
- "mon code de parrainage" → Donne le code et explique son utilisation
- "quoi de neuf", "actualités" → Partage les mises à jour de la plateforme

═══════════════════════════════════════
DOCUMENTS OFFICIELS
═══════════════════════════════════════
${officialDocsContext ? `DOCUMENTS DISPONIBLES (partager quand pertinent) :
${officialDocsContext}

Quand quelqu'un demande des preuves ou des documents → ENVOIE les liens pertinents` : "Aucun document officiel disponible pour le moment. Si un utilisateur demande des preuves, redirige vers le service humain."}

═══════════════════════════════════════
INFORMATIONS OFFICIELLES
═══════════════════════════════════════
Utilise UNIQUEMENT ces contacts quand l'utilisateur demande le service client, WhatsApp, Telegram :
- Service client : ${officialServicePhone || "Non renseigné"}
- WhatsApp : ${officialWhatsapp || "Non renseigné"}
- Telegram : ${officialTelegram || "Non renseigné"}
- Groupe WhatsApp : ${officialWhatsappGroup || "Non renseigné"}
- Groupe Telegram : ${officialTelegramGroup || "Non renseigné"}
${officialPrivateGroupMsg ? `- Message groupe privé : ${officialPrivateGroupMsg}` : ""}
${officialWelcomeMsg ? `- Message de bienvenue : ${officialWelcomeMsg}` : ""}

═══════════════════════════════════════
ANALYSE D'IMAGES
═══════════════════════════════════════
Si une image est envoyée :
- Reçu de paiement → "Merci pour votre preuve. Nos services vérifient votre transaction et créditeront votre compte sous peu."
- Capture d'erreur → Identifie le problème et propose des solutions
- Screenshot de transaction crypto → Vérifie les infos (montant, réseau, adresse)
- Autre image → Décris ce que tu vois et réponds contextuellement
Lis toujours attentivement le texte visible (montants, noms, numéros, TXID).

═══════════════════════════════════════
GESTION DES PLAINTES
═══════════════════════════════════════
- Écoute avec empathie
- Présente tes excuses sincèrement
- Explique la situation clairement
- Propose une solution concrète
- Si tu ne peux pas résoudre → "Pour une assistance personnalisée, contactez notre service humain au ${supportPhone}"

═══════════════════════════════════════
RÈGLES STRICTES
═══════════════════════════════════════
1. Réponds en français par défaut (change si l'utilisateur parle autre chose)
2. Réponses concises (3-8 phrases) sauf si on demande des détails
3. Maximum 3 emojis par message
4. Intègre les infos NATURELLEMENT — ne récite jamais comme une liste
5. Ne divulgue JAMAIS d'informations sensibles
6. Ne modifie JAMAIS les données — tu es en LECTURE SEULE
7. Varie TOUJOURS tes formulations — jamais de réponse identique
8. Utilise le prénom de l'utilisateur si disponible
9. En cas de doute → propose le contact humain au ${supportPhone}
10. Tous les liens doivent commencer par http ou https`;
}

// ─── Route principale ─────────────────────────────────────────────────────────
router.post("/chat", async (req: Request, res: Response) => {
  const { message, history = [], userId, imageUrl } = req.body as {
    message: string;
    history: { sender: string; text: string }[];
    userId?: string;
    imageUrl?: string;
  };

  if (!message && !imageUrl) {
    return res.status(400).json({ error: "message or imageUrl required" });
  }

  try {
    // 1. Fetch all site data in parallel
    const [
      settingsRows, products, paymentMethods, officialDocs,
      infoItems, countries, withdrawalMethods,
    ] = await Promise.all([
      sbGet("site_settings", "select=key,value"),
      sbGet("products", "select=name,price,daily_revenue,cycles,total_revenue,return_percent,is_active&is_active=eq.true&order=sort_order"),
      sbGet("payment_methods", "select=name,phone,country,holder_name,instructions,is_active,payment_type,country_id,external_url&is_active=eq.true&order=sort_order"),
      sbGet("official_documents", "select=title,description,doc_type,file_url&is_active=eq.true&order=sort_order"),
      sbGet("info_items", "select=title,description&is_active=eq.true&order=sort_order&limit=10"),
      sbGet("countries", "select=id,name,country_code,api_enabled,is_active,flag_emoji&is_active=eq.true&order=sort_order"),
      sbGet("withdrawal_methods", "select=name,payment_type,api_provider,country_id,is_active&is_active=eq.true&order=sort_order"),
    ]);

    const settingsMap: Record<string, string> = {};
    settingsRows.forEach((s: any) => { settingsMap[s.key] = s.value ?? ""; });

    // Check if Emma is enabled
    if (settingsMap["sarah_enabled"] !== "true") {
      return res.json({ reply: "Le support automatique est actuellement désactivé. Un agent humain vous répondra bientôt. 🙏" });
    }

    // 2. Fetch user-specific data if userId provided
    let userProfile: any = null;
    let userRecharges: any[] = [];
    let userWithdrawals: any[] = [];
    let userProducts: any[] = [];
    let teamMembers: any[] = [];

    if (userId) {
      const [profileRows, rechargesRows, withdrawalsRows, userProductsRows] = await Promise.all([
        sbGet("profiles", `select=*&user_id=eq.${userId}&limit=1`),
        sbGet("recharges", `select=amount,status,created_at,payment_method&user_id=eq.${userId}&order=created_at.desc&limit=5`),
        sbGet("withdrawals", `select=amount,status,created_at,network,phone,net_amount,fee_amount&user_id=eq.${userId}&order=created_at.desc&limit=5`),
        sbGet("user_products", `select=id,product_id,purchased_at,expires_at,is_active,total_collected,products(name,price,daily_revenue,cycles,total_revenue)&user_id=eq.${userId}&is_active=eq.true`),
      ]);
      userProfile   = profileRows[0] ?? null;
      userRecharges = rechargesRows;
      userWithdrawals = withdrawalsRows;
      userProducts  = userProductsRows;
    }

    // 3. Build system prompt
    const siteName     = settingsMap["site_name"] || "GE Energy";
    const systemPrompt = buildSystemPrompt(
      siteName, settingsMap, products, paymentMethods,
      officialDocs, infoItems, countries, withdrawalMethods,
      userProfile, userRecharges, userWithdrawals, userProducts, teamMembers
    );

    // 4. Build messages array
    const historyMessages = history.slice(-10).map((h: any) => ({
      role: h.sender === "user" ? "user" : "assistant",
      content: h.text,
    }));

    let userMsg: any;
    if (imageUrl) {
      userMsg = {
        role: "user",
        content: [
          { type: "text", text: message || "L'utilisateur a envoyé cette image. Analyse-la attentivement." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      };
    } else {
      userMsg = { role: "user", content: message };
    }

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      userMsg,
    ];

    // 5. Determine AI provider & call
    const aiProvider = settingsMap["sarah_ai_provider"] || "openai";
    let reply = "";

    if (aiProvider === "gemini") {
      const apiKey   = settingsMap["ai_gemini_key"] || process.env["GEMINI_API_KEY"] || "";
      const model    = settingsMap["ai_gemini_model"] || "gemini-2.0-flash-exp";
      if (!apiKey) throw new Error("Clé API Gemini non configurée");

      const geminiContents = messagesPayload.map((m: any) => {
        const role = m.role === "assistant" ? "model" : "user";
        if (typeof m.content === "string") return { role, parts: [{ text: m.content }] };
        const parts = m.content.map((c: any) => {
          if (c.type === "text") return { text: c.text };
          if (c.type === "image_url") return { text: `[Image: ${c.image_url.url}]` };
          return { text: "" };
        });
        return { role, parts };
      });

      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: geminiContents }) }
      );
      if (!gemRes.ok) throw new Error(`Gemini API error: ${gemRes.status}`);
      const gemData = await gemRes.json();
      reply = gemData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (aiProvider === "anthropic") {
      const apiKey = settingsMap["ai_anthropic_key"] || process.env["ANTHROPIC_API_KEY"] || "";
      const model  = settingsMap["ai_anthropic_model"] || "claude-sonnet-4-5";
      if (!apiKey) throw new Error("Clé API Anthropic non configurée");

      const anthropicMessages = historyMessages.concat([userMsg]);
      const antRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: anthropicMessages,
        }),
      });
      if (!antRes.ok) throw new Error(`Anthropic API error: ${antRes.status}`);
      const antData = await antRes.json();
      reply = antData.content?.[0]?.text || "";

    } else {
      // OpenAI-compatible (openai, grok, mistral, custom, lovable fallback)
      let apiKey   = "";
      let endpoint = "https://api.openai.com/v1/chat/completions";
      let model    = "gpt-4o-mini";

      if (aiProvider === "openai") {
        apiKey   = settingsMap["ai_openai_key"] || process.env["OPENAI_API_KEY"] || "";
        model    = settingsMap["ai_openai_model"] || "gpt-4o-mini";
      } else if (aiProvider === "grok") {
        apiKey   = settingsMap["ai_grok_key"] || "";
        endpoint = "https://api.x.ai/v1/chat/completions";
        model    = settingsMap["ai_grok_model"] || "grok-3-mini-beta";
      } else if (aiProvider === "mistral") {
        apiKey   = settingsMap["ai_mistral_key"] || "";
        endpoint = "https://api.mistral.ai/v1/chat/completions";
        model    = settingsMap["ai_mistral_model"] || "mistral-small-latest";
      } else if (aiProvider === "custom") {
        apiKey   = settingsMap["ai_custom_key"] || "";
        endpoint = settingsMap["ai_custom_endpoint"] || "";
        model    = settingsMap["ai_custom_model"] || "";
      }

      if (!apiKey) throw new Error(`Clé API ${aiProvider} non configurée dans le panel admin`);

      const aiRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error(`[AI] ${aiProvider} error ${aiRes.status}:`, errText);
        throw new Error(`API ${aiProvider} error: ${aiRes.status}`);
      }
      const aiData = await aiRes.json();
      reply = aiData.choices?.[0]?.message?.content || "";
    }

    if (!reply) reply = "Je suis désolée, je n'ai pas pu traiter votre demande. Veuillez réessayer. 🙏\n\nEmma – Assistante virtuelle " + siteName;

    // 6. Save AI reply to DB
    let savedReplyId: string | null = null;
    if (userId) {
      try {
        const saved = await sbInsert("chat_messages", {
          user_id: userId,
          sender:  "support",
          message: reply,
          is_ai:   true,
        });
        savedReplyId = saved?.id ?? null;
      } catch (e) {
        console.error("[AI] Failed to save reply:", e);
      }
    }

    return res.json({ reply, savedReplyId });

  } catch (err: any) {
    console.error("[AI chat] Error:", err.message);
    const fallback = `Une erreur est survenue. Un agent humain prendra le relais sous peu. Merci de votre patience 🙏\n\nEmma – Assistante virtuelle GE Energy`;
    return res.json({ reply: fallback, savedReplyId: null });
  }
});

export default router;
