import { useState, useEffect } from "react";
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

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        // Use getSession (cached, instant) instead of getUser (network call)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || cancelled) { setLoading(false); return; }
        setUserId(session.user.id);

        const { data } = await supabase
          .from("profiles")
          .select("balance, deposit_balance, earnings_balance, referral_balance, gift_points, vip_level, phone, referral_code, full_name")
          .eq("user_id", session.user.id)
          .single();

        if (data && !cancelled) setProfile(data as ProfileData);
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("profile-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as any;
          setProfile({
            balance: n.balance ?? 0,
            deposit_balance: n.deposit_balance ?? 0,
            earnings_balance: n.earnings_balance ?? 0,
            referral_balance: n.referral_balance ?? 0,
            gift_points: n.gift_points ?? 0,
            vip_level: n.vip_level ?? 0,
            phone: n.phone ?? "",
            referral_code: n.referral_code ?? null,
            full_name: n.full_name ?? null,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { profile, userId, loading };
};
