import eskomLogo from "@/assets/eskom-logo.png";

const EskomLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: "h-10",
    md: "h-16",
    lg: "h-24",
  };

  return (
    <div className="flex items-center justify-center">
      <img src={eskomLogo} alt="ESKOM" className={`${sizes[size]} w-auto object-contain`} />
    </div>
  );
};

export default EskomLogo;
