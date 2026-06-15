import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProfileData = {
  balance: number;
  deposit_balance: number;
  earnings_balance: number;
  referral_balance: number;
  gift_points: number;
  vip_level: number;
  phone: string;
  referral_code: string | null;
  full_name: string | null;
};

const defaults: ProfileData = {
  balance: 0,
  deposit_balance: 0,
  earnings_balance: 0,
  referral_balance: 0,
  gift_points: 0,
  vip_level: 0,
  phone: "",
  referral_code: null,
  full_name: null,
};

export const useRealtimeProfile = () => {
  const [profile, setProfile] = useState<ProfileData>(defaults);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid?: string) => {
    const targetId = uid ?? userId;
    if (!targetId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance, deposit_balance, earnings_balance, referral_balance, gift_points, vip_level, phone, referral_code, full_name")
        .eq("user_id", targetId)
        .single();

      if (error || !data) { setLoading(false); return; }

      setProfile({
        balance: Number(data.balance ?? 0),
        deposit_balance: Number(data.deposit_balance ?? 0),
        earnings_balance: Number(data.earnings_balance ?? 0),
        referral_balance: Number(data.referral_balance ?? 0),
        gift_points: Number(data.gift_points ?? 0),
        vip_level: Number(data.vip_level ?? 0),
        phone: data.phone ?? "",
        referral_code: data.referral_code ?? null,
        full_name: data.full_name ?? null,
      });
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) fetchProfile(uid);
      else { setProfile(defaults); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => fetchProfile(), 15000);
    return () => clearInterval(interval);
  }, [userId, fetchProfile]);

  return { profile, userId, loading, refetch: fetchProfile };
};
