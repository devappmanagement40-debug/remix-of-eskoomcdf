import { useState, useEffect } from "react";

export type DisplaySettings = {
  vip_conditions_enabled: boolean;
  vip_progress_bar_enabled: boolean;
  profile_products_display_enabled: boolean;
};

const defaults: DisplaySettings = {
  vip_conditions_enabled: true,
  vip_progress_bar_enabled: true,
  profile_products_display_enabled: true,
};

export const useDisplaySettings = () => {
  const [settings, setSettings] = useState<DisplaySettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const keys = ["vip_conditions_enabled", "vip_progress_bar_enabled", "profile_products_display_enabled"];
        const params = keys.map(k => `filter=eq:key:${k}`).join("&");
        const res = await fetch(`/api/db?table=site_settings&${params}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          const map: Record<string, string> = {};
          (Array.isArray(data) ? data : []).forEach((d: any) => { map[d.key] = d.value; });
          setSettings({
            vip_conditions_enabled: map.vip_conditions_enabled !== "false",
            vip_progress_bar_enabled: map.vip_progress_bar_enabled !== "false",
            profile_products_display_enabled: map.profile_products_display_enabled !== "false",
          });
        }
      } catch {}
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { displaySettings: settings, loading };
};
