import { useAppImages } from "@/contexts/AppImagesContext";

const EskomLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const { appLogo } = useAppImages();
  const sizes = {
    sm: "h-10",
    md: "h-16",
    lg: "h-24",
  };

  return (
    <div className="flex items-center justify-center">
      <img src={appLogo} alt="GE Energy" className={`${sizes[size]} w-auto object-contain`} />
    </div>
  );
};

export default EskomLogo;
