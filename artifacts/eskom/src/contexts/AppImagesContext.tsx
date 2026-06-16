import { createContext, useContext, useEffect, useState, ReactNode } from "react";

import fallbackAppLogo from "@/assets/ge-energy-logo.jpg";
import fallbackEmma from "@/assets/emma-avatar.jpg";
import fallbackBgDepot from "@/assets/bg-depot.png";
import fallbackBgGains from "@/assets/bg-gains.png";
import fallbackBgParrainage from "@/assets/bg-parrainage.png";
import fallbackBgTodayEarnings from "@/assets/bg-today-earnings.png";
import fallbackBgTotalRevenue from "@/assets/bg-total-revenue.png";
import fallbackBgTotalDeposit from "@/assets/bg-total-deposit.png";
import fallbackBgTotalWithdraw from "@/assets/bg-total-withdraw.png";

export type AppImages = {
  appLogo: string;
  emmaAvatar: string;
  bgDepot: string;
  bgGains: string;
  bgParrainage: string;
  bgTodayEarnings: string;
  bgTotalRevenue: string;
  bgTotalDeposit: string;
  bgTotalWithdraw: string;
};

const defaultImages: AppImages = {
  appLogo:           fallbackAppLogo,
  emmaAvatar:        fallbackEmma,
  bgDepot:           fallbackBgDepot,
  bgGains:           fallbackBgGains,
  bgParrainage:      fallbackBgParrainage,
  bgTodayEarnings:   fallbackBgTodayEarnings,
  bgTotalRevenue:    fallbackBgTotalRevenue,
  bgTotalDeposit:    fallbackBgTotalDeposit,
  bgTotalWithdraw:   fallbackBgTotalWithdraw,
};

const KEY_MAP: Record<string, keyof AppImages> = {
  img_app_logo:           "appLogo",
  img_emma_avatar:        "emmaAvatar",
  img_bg_depot:           "bgDepot",
  img_bg_gains:           "bgGains",
  img_bg_parrainage:      "bgParrainage",
  img_bg_today_earnings:  "bgTodayEarnings",
  img_bg_total_revenue:   "bgTotalRevenue",
  img_bg_total_deposit:   "bgTotalDeposit",
  img_bg_total_withdraw:  "bgTotalWithdraw",
};

const AppImagesContext = createContext<AppImages>(defaultImages);

export const AppImagesProvider = ({ children }: { children: ReactNode }) => {
  const [images, setImages] = useState<AppImages>(defaultImages);

  useEffect(() => {
    const keys = Object.keys(KEY_MAP);
    const params = keys.map(k => `filter=eq:key:${k}`).join("&");
    fetch(`/api/db?table=site_settings&${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!Array.isArray(data) || !data.length) return;
        const overrides: Partial<AppImages> = {};
        for (const row of data) {
          const field = KEY_MAP[row.key];
          if (field && row.value) overrides[field] = row.value;
        }
        setImages((prev) => ({ ...prev, ...overrides }));
      })
      .catch(() => {});
  }, []);

  return (
    <AppImagesContext.Provider value={images}>
      {children}
    </AppImagesContext.Provider>
  );
};

export const useAppImages = () => useContext(AppImagesContext);
