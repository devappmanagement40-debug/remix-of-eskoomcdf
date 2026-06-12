import { useState, useEffect, useCallback } from "react";

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
    const token = localStorage.getItem("eskom_token");
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      if (data?.userId) setUserId(data.userId);
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
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    const interval = setInterval(fetchProfile, 15000);
    return () => clearInterval(interval);
  }, [fetchProfile]);

  return { profile, userId, loading, refetch: fetchProfile };
};
