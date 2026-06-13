// Haiti timezone (UTC-5)
export const APP_TIMEZONE = "America/Port-au-Prince";

export const formatDateFR = (d: string | null, options?: Intl.DateTimeFormatOptions): string => {
  if (!d) return "—";
  const defaults: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  };
  return new Date(d).toLocaleDateString("en-US", { ...defaults, ...options });
};

export const formatDateOnlyFR = (d: string | null): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { timeZone: APP_TIMEZONE });
};

export const formatTimeFR = (d: string | null): string => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });
};

export const formatFullDateFR = (d: string | null): string => {
  if (!d) return "—";
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("en-US", { timeZone: APP_TIMEZONE }) +
    " " +
    dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIMEZONE })
  );
};
