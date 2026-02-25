const EskomLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: { icon: 32, text: "text-xl" },
    md: { icon: 48, text: "text-3xl" },
    lg: { icon: 64, text: "text-4xl" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-3 justify-center">
      <div
        className="rounded-xl overflow-hidden flex items-center justify-center"
        style={{ width: s.icon, height: s.icon }}
      >
        <svg viewBox="0 0 48 48" width={s.icon} height={s.icon}>
          <rect width="48" height="48" rx="10" fill="#0ED3CF" />
          <circle cx="20" cy="24" r="12" fill="#F5A623" />
          <circle cx="28" cy="24" r="12" fill="#2ECC71" opacity="0.85" />
        </svg>
      </div>
      <span className={`${s.text} font-extrabold tracking-tight text-foreground`}>
        ESKOM
      </span>
    </div>
  );
};

export default EskomLogo;
