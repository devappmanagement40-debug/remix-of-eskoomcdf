import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "vip_conditions_enabled",
          "vip_progress_bar_enabled",
          "profile_products_display_enabled",
        ]);
      if (cancelled) return;
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => { map[d.key] = d.value; });
        setSettings({
          vip_conditions_enabled: map.vip_conditions_enabled !== "false",
          vip_progress_bar_enabled: map.vip_progress_bar_enabled !== "false",
          profile_products_display_enabled: map.profile_products_display_enabled !== "false",
        });
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { displaySettings: settings, loading };
};
