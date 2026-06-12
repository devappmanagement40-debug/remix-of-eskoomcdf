import { useState, useEffect } from "react";

type VipCondition = {
  id: string;
  level: number;
  level_name: string;
  min_investment: number;
  min_active_members: number;
  min_purchases: number;
  min_products_bought: number;
  min_team_investment: number;
  condition_logic: string;
  image_url?: string | null;
};

type CriterionProgress = {
  label: string;
  current: number;
  required: number;
  met: boolean;
};

export type VipProgressData = {
  currentLevel: number;
  currentLevelName: string;
  currentLevelImage: string | null;
  nextLevel: number | null;
  nextLevelName: string | null;
  overallProgress: number;
  criteria: CriterionProgress[];
  allMet: boolean;
};

const defaults: VipProgressData = {
  currentLevel: 0,
  currentLevelName: "VIP0",
  currentLevelImage: null,
  nextLevel: null,
  nextLevelName: null,
  overallProgress: 0,
  criteria: [],
  allMet: false,
};

async function apiFetch(path: string) {
  const token = localStorage.getItem("eskom_token");
  const res = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.json();
}

export const useVipProgress = (userId: string | null, vipLevel: number, balance: number) => {
  const [data, setData] = useState<VipProgressData>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    const compute = async () => {
      try {
        const [conditions, userProducts, teamMembers, settingRaw] = await Promise.all([
          apiFetch("/db?table=vip_conditions&order=level:asc"),
          apiFetch("/db?table=user_products&filter=eq:user_id:" + userId + "&filter=eq:is_active:true"),
          apiFetch("/team/my"),
          apiFetch("/db?table=site_settings&filter=eq:key:vip_conditions_enabled&limit=1"),
        ]);

        if (cancelled) return;
        if (!conditions || conditions.length === 0) { setLoading(false); return; }

        const vipConditionsEnabled = (Array.isArray(settingRaw) ? settingRaw[0]?.value : settingRaw?.value) !== "false";

        const upList = userProducts ?? [];
        const totalPurchases = upList.length;
        const uniqueProducts = new Set(upList.map((up: any) => up.product_id)).size;

        const myProfileRaw = await apiFetch("/db?table=profiles&filter=eq:user_id:" + userId + "&limit=1");
        const myProfile = Array.isArray(myProfileRaw) ? myProfileRaw[0] : myProfileRaw;
        const personalInvestment = Number(myProfile?.deposit_balance ?? 0);

        const team = teamMembers ?? [];
        const teamUserIds = team.map((m: any) => m.user_id);
        let activeMembers = 0;
        let teamInvestment = team.reduce((s: number, m: any) => s + Number(m.deposit_balance ?? 0), 0);

        if (teamUserIds.length > 0) {
          const teamProdsQuery = teamUserIds.map((id: string) => `filter=eq:user_id:${id}`).join("&");
          const teamProds = await apiFetch(`/db?table=user_products&${teamProdsQuery}`);
          if (!cancelled) {
            activeMembers = new Set((teamProds ?? []).map((tp: any) => tp.user_id)).size;
          }
        }

        if (cancelled) return;

        const checkConditions = (cond: any) => {
          const logic = cond.condition_logic || "AND";
          const checks: boolean[] = [];
          if ((cond.min_investment || 0) > 0) checks.push(personalInvestment >= cond.min_investment);
          if ((cond.min_active_members || 0) > 0) checks.push(activeMembers >= cond.min_active_members);
          if ((cond.min_purchases || 0) > 0) checks.push(totalPurchases >= cond.min_purchases);
          if ((cond.min_products_bought || 0) > 0) checks.push(uniqueProducts >= cond.min_products_bought);
          if ((cond.min_team_investment || 0) > 0) checks.push(teamInvestment >= cond.min_team_investment);
          if (checks.length === 0) return false;
          return logic === "AND" ? checks.every(Boolean) : checks.some(Boolean);
        };

        const nextLevelCond = conditions.find((c: any) => c.level === vipLevel + 1);
        let effectiveLevel = vipLevel;
        if (vipConditionsEnabled && nextLevelCond && checkConditions(nextLevelCond)) {
          effectiveLevel = nextLevelCond.level;
        }

        if (!cancelled) {
          const current = conditions.find((c: any) => c.level === effectiveLevel);
          const next = conditions.find((c: any) => c.level === effectiveLevel + 1);

          if (!next) {
            setData({
              currentLevel: effectiveLevel,
              currentLevelName: current?.level_name || `VIP${effectiveLevel}`,
              currentLevelImage: current?.image_url || null,
              nextLevel: null,
              nextLevelName: null,
              overallProgress: 100,
              criteria: [],
              allMet: true,
            });
            return;
          }

          const nc = next as any;
          const logic = nc.condition_logic || "AND";
          const criteria: CriterionProgress[] = [];

          if (nc.min_investment > 0) criteria.push({ label: "Investissement personnel", current: personalInvestment, required: nc.min_investment, met: personalInvestment >= nc.min_investment });
          if (nc.min_active_members > 0) criteria.push({ label: "Membres actifs", current: activeMembers, required: nc.min_active_members, met: activeMembers >= nc.min_active_members });
          if (nc.min_purchases > 0) criteria.push({ label: "Achats totaux", current: totalPurchases, required: nc.min_purchases, met: totalPurchases >= nc.min_purchases });
          if (nc.min_products_bought > 0) criteria.push({ label: "Produits différents", current: uniqueProducts, required: nc.min_products_bought, met: uniqueProducts >= nc.min_products_bought });
          if ((nc.min_team_investment || 0) > 0) criteria.push({ label: "Invest. équipe", current: teamInvestment, required: nc.min_team_investment, met: teamInvestment >= nc.min_team_investment });

          const allMet = criteria.length === 0 ? false : logic === "AND" ? criteria.every(c => c.met) : criteria.some(c => c.met);
          let overallProgress = 0;
          if (criteria.length > 0) {
            const progressPerCriterion = criteria.map(c => Math.min(100, c.required > 0 ? (c.current / c.required) * 100 : 100));
            overallProgress = logic === "AND" ? progressPerCriterion.reduce((a, b) => a + b, 0) / criteria.length : Math.max(...progressPerCriterion);
          }

          setData({
            currentLevel: effectiveLevel,
            currentLevelName: current?.level_name || `VIP${effectiveLevel}`,
            currentLevelImage: current?.image_url || null,
            nextLevel: nc.level,
            nextLevelName: nc.level_name,
            overallProgress: Math.min(Math.round(overallProgress), 100),
            criteria,
            allMet,
          });
        }
      } catch (err) {
        console.error("VIP progress error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    compute();
    return () => { cancelled = true; };
  }, [userId, vipLevel, balance]);

  return { vipProgress: data, loading };
};
