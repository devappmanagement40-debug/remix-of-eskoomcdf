import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const useVipProgress = (userId: string | null, vipLevel: number, balance: number) => {
  const [data, setData] = useState<VipProgressData>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const compute = async () => {
      // Fetch VIP conditions
      const { data: conditions } = await supabase
        .from("vip_conditions")
        .select("*")
        .order("level");
      if (!conditions || conditions.length === 0) { setLoading(false); return; }

      const current = conditions.find((c: any) => c.level === vipLevel);
      const next = conditions.find((c: any) => c.level === vipLevel + 1);

      if (!next) {
        setData({
          currentLevel: vipLevel,
          currentLevelName: current?.level_name || `VIP${vipLevel}`,
          currentLevelImage: current?.image_url || null,
          nextLevel: null,
          nextLevelName: null,
          overallProgress: 100,
          criteria: [],
          allMet: true,
        });
        setLoading(false);
        return;
      }

      // Fetch user stats
      const [productsRes, teamRes] = await Promise.all([
        supabase.from("user_products").select("id, product_id, products(price)").eq("user_id", userId).eq("is_active", true),
        supabase.rpc("get_team_profile_ids", { _user_id: userId }),
      ]);

      const userProducts = productsRes.data || [];
      const totalPurchases = userProducts.length;
      const uniqueProducts = new Set(userProducts.map((up: any) => up.product_id)).size;

      // Get team members count (active = has at least 1 product)
      const teamIds = (teamRes.data || []) as string[];
      let activeMembers = 0;
      let teamInvestment = 0;
      if (teamIds.length > 0) {
        const { data: teamProfiles } = await supabase
          .from("profiles")
          .select("id, balance, deposit_balance")
          .in("id", teamIds);
        if (teamProfiles) {
          // Count active members (those with deposit > 0)
          const { data: teamProductCounts } = await supabase
            .from("user_products")
            .select("user_id")
            .in("user_id", teamProfiles.map(tp => tp.id.replace(/-/g, '')).length > 0 ? teamIds : []);
          
          // Simpler: query user_products for team user_ids
          const { data: memberProfiles } = await supabase
            .from("profiles")
            .select("user_id, deposit_balance")
            .in("id", teamIds);
          
          if (memberProfiles) {
            const memberUserIds = memberProfiles.map((m: any) => m.user_id);
            if (memberUserIds.length > 0) {
              const { data: teamProducts } = await supabase
                .from("user_products")
                .select("user_id")
                .in("user_id", memberUserIds);
              const activeUserIds = new Set((teamProducts || []).map((tp: any) => tp.user_id));
              activeMembers = activeUserIds.size;
            }
            teamInvestment = memberProfiles.reduce((s: number, m: any) => s + (m.deposit_balance || 0), 0);
          }
        }
      }

      // Personal investment = deposit_balance from profile
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("deposit_balance")
        .eq("user_id", userId)
        .single();
      const personalInvestment = myProfile?.deposit_balance || 0;

      const nc = next as any;
      const logic = nc.condition_logic || "OR";

      // Build criteria
      const criteria: CriterionProgress[] = [];
      if (nc.min_investment > 0) {
        criteria.push({
          label: "Investissement personnel",
          current: personalInvestment,
          required: nc.min_investment,
          met: personalInvestment >= nc.min_investment,
        });
      }
      if (nc.min_active_members > 0) {
        criteria.push({
          label: "Membres actifs",
          current: activeMembers,
          required: nc.min_active_members,
          met: activeMembers >= nc.min_active_members,
        });
      }
      if (nc.min_purchases > 0) {
        criteria.push({
          label: "Achats totaux",
          current: totalPurchases,
          required: nc.min_purchases,
          met: totalPurchases >= nc.min_purchases,
        });
      }
      if (nc.min_products_bought > 0) {
        criteria.push({
          label: "Produits différents",
          current: uniqueProducts,
          required: nc.min_products_bought,
          met: uniqueProducts >= nc.min_products_bought,
        });
      }
      if ((nc.min_team_investment || 0) > 0) {
        criteria.push({
          label: "Invest. équipe",
          current: teamInvestment,
          required: nc.min_team_investment,
          met: teamInvestment >= nc.min_team_investment,
        });
      }

      const allMet = criteria.length === 0 ? false :
        logic === "AND" ? criteria.every(c => c.met) : criteria.some(c => c.met);

      // Calculate overall progress
      let overallProgress = 0;
      if (criteria.length > 0) {
        const progressPerCriterion = criteria.map(c =>
          Math.min(100, c.required > 0 ? (c.current / c.required) * 100 : 100)
        );
        overallProgress = logic === "AND"
          ? progressPerCriterion.reduce((a, b) => a + b, 0) / criteria.length
          : Math.max(...progressPerCriterion);
      }

      setData({
        currentLevel: vipLevel,
        currentLevelName: current?.level_name || `VIP${vipLevel}`,
        currentLevelImage: current?.image_url || null,
        nextLevel: nc.level,
        nextLevelName: nc.level_name,
        overallProgress: Math.min(Math.round(overallProgress), 100),
        criteria,
        allMet,
      });
      setLoading(false);
    };
    compute();
  }, [userId, vipLevel, balance]);

  return { vipProgress: data, loading };
};
