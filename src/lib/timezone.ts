// Congo-Kinshasa timezone (UTC+2)
export const APP_TIMEZONE = "Africa/Lubumbashi";

export const formatDateFR = (d: string | null, options?: Intl.DateTimeFormatOptions): string => {
  if (!d) return "—";
  const defaults: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  };
  return new Date(d).toLocaleDateString("fr-FR", { ...defaults, ...options });
};

export const formatDateOnlyFR = (d: string | null): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { timeZone: APP_TIMEZONE });
};

export const formatTimeFR = (d: string | null): string => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });
};

export const formatFullDateFR = (d: string | null): string => {
  if (!d) return "—";
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("fr-FR", { timeZone: APP_TIMEZONE }) +
    " " +
    dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIMEZONE })
  );
};
