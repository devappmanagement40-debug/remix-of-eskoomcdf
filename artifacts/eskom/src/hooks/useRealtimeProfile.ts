import { useState, useEffect, useCallback } from "react";
import { localAuth, getAuthToken } from "@/integrations/supabase/client";

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

  const fetchProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch("/api/profiles/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();

      setProfile({
        balance: Number(data.balance ?? 0),
        deposit_balance: Number(data.depositBalance ?? data.deposit_balance ?? 0),
        earnings_balance: Number(data.earningsBalance ?? data.earnings_balance ?? 0),
        referral_balance: Number(data.referralBalance ?? data.referral_balance ?? 0),
        gift_points: Number(data.giftPoints ?? data.gift_points ?? 0),
        vip_level: Number(data.vipLevel ?? data.vip_level ?? 0),
        phone: data.phone ?? "",
        referral_code: data.referralCode ?? data.referral_code ?? null,
        full_name: data.fullName ?? data.full_name ?? null,
      });
      if (data.userId ?? data.user_id) {
        setUserId(data.userId ?? data.user_id);
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = localAuth.getSession();
    if (session?.user?.id) {
      setUserId(session.user.id);
    }
    fetchProfile();

    const { data: { subscription } } = localAuth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) fetchProfile();
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
