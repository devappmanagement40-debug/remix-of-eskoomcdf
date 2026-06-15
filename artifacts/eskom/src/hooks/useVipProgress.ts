import { useState, useEffect } from "react";
import { getAuthToken } from "@/integrations/supabase/client";

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

export const useVipProgress = (userId: string | null, vipLevel: number, balance: number) => {
  const [data, setData] = useState<VipProgressData>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const token = getAuthToken();
    if (!token) { setLoading(false); return; }
    let cancelled = false;

    const compute = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [conditionsRes, userProductsRes, settingRes, myProfileRes, teamRes] = await Promise.all([
          fetch("/api/vip-conditions").then(r => r.ok ? r.json() : []),
          fetch("/api/products/user-products/my", { headers }).then(r => r.ok ? r.json() : []),
          fetch("/api/site-settings/vip_conditions_enabled").then(r => r.ok ? r.json() : null),
          fetch("/api/profiles/me", { headers }).then(r => r.ok ? r.json() : null),
          fetch("/api/profiles/team/direct", { headers }).then(r => r.ok ? r.json() : []),
        ]);

        if (cancelled) return;

        const conditions = Array.isArray(conditionsRes) ? conditionsRes : [];
        if (conditions.length === 0) { setLoading(false); return; }

        const vipConditionsEnabled = settingRes?.value !== "false";
        const upList = Array.isArray(userProductsRes) ? userProductsRes : [];
        const totalPurchases = upList.length;
        const uniqueProducts = new Set(upList.map((up: any) => up.productId ?? up.product_id)).size;
        const personalInvestment = Number(myProfileRes?.depositBalance ?? myProfileRes?.deposit_balance ?? 0);

        const team = Array.isArray(teamRes) ? teamRes : [];
        const teamUserIds = team.map((m: any) => m.userId ?? m.user_id);
        const teamInvestment = team.reduce((s: number, m: any) => s + Number(m.depositBalance ?? m.deposit_balance ?? 0), 0);

        let activeMembers = 0;
        if (teamUserIds.length > 0) {
          const teamProdsRes = await fetch(`/api/products/user-products/active-by-users?userIds=${teamUserIds.join(",")}`, { headers });
          if (!cancelled && teamProdsRes.ok) {
            const teamProds = await teamProdsRes.json();
            activeMembers = new Set((Array.isArray(teamProds) ? teamProds : []).map((tp: any) => tp.userId ?? tp.user_id)).size;
          }
        }

        if (cancelled) return;

        const checkConditions = (cond: any) => {
          const logic = cond.conditionLogic ?? cond.condition_logic ?? "AND";
          const checks: boolean[] = [];
          const minInv = cond.minInvestment ?? cond.min_investment ?? 0;
          const minMem = cond.minActiveMembers ?? cond.min_active_members ?? 0;
          const minPur = cond.minPurchases ?? cond.min_purchases ?? 0;
          const minProd = cond.minProductsBought ?? cond.min_products_bought ?? 0;
          const minTeam = cond.minTeamInvestment ?? cond.min_team_investment ?? 0;
          if (minInv > 0) checks.push(personalInvestment >= minInv);
          if (minMem > 0) checks.push(activeMembers >= minMem);
          if (minPur > 0) checks.push(totalPurchases >= minPur);
          if (minProd > 0) checks.push(uniqueProducts >= minProd);
          if (minTeam > 0) checks.push(teamInvestment >= minTeam);
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
              currentLevelName: current?.levelName ?? current?.level_name ?? `VIP${effectiveLevel}`,
              currentLevelImage: current?.imageUrl ?? current?.image_url ?? null,
              nextLevel: null,
              nextLevelName: null,
              overallProgress: 100,
              criteria: [],
              allMet: true,
            });
            return;
          }

          const nc = next as any;
          const logic = nc.conditionLogic ?? nc.condition_logic ?? "AND";
          const criteria: CriterionProgress[] = [];
          const minInv = nc.minInvestment ?? nc.min_investment ?? 0;
          const minMem = nc.minActiveMembers ?? nc.min_active_members ?? 0;
          const minPur = nc.minPurchases ?? nc.min_purchases ?? 0;
          const minProd = nc.minProductsBought ?? nc.min_products_bought ?? 0;
          const minTeam = nc.minTeamInvestment ?? nc.min_team_investment ?? 0;

          if (minInv > 0) criteria.push({ label: "Investissement personnel", current: personalInvestment, required: minInv, met: personalInvestment >= minInv });
          if (minMem > 0) criteria.push({ label: "Membres actifs", current: activeMembers, required: minMem, met: activeMembers >= minMem });
          if (minPur > 0) criteria.push({ label: "Achats totaux", current: totalPurchases, required: minPur, met: totalPurchases >= minPur });
          if (minProd > 0) criteria.push({ label: "Produits différents", current: uniqueProducts, required: minProd, met: uniqueProducts >= minProd });
          if (minTeam > 0) criteria.push({ label: "Invest. équipe", current: teamInvestment, required: minTeam, met: teamInvestment >= minTeam });

          const allMet = criteria.length === 0 ? false : logic === "AND" ? criteria.every(c => c.met) : criteria.some(c => c.met);
          let overallProgress = 0;
          if (criteria.length > 0) {
            const progressPerCriterion = criteria.map(c => Math.min(100, c.required > 0 ? (c.current / c.required) * 100 : 100));
            overallProgress = logic === "AND" ? progressPerCriterion.reduce((a, b) => a + b, 0) / criteria.length : Math.max(...progressPerCriterion);
          }

          setData({
            currentLevel: effectiveLevel,
            currentLevelName: current?.levelName ?? current?.level_name ?? `VIP${effectiveLevel}`,
            currentLevelImage: current?.imageUrl ?? current?.image_url ?? null,
            nextLevel: nc.level,
            nextLevelName: nc.levelName ?? nc.level_name,
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
