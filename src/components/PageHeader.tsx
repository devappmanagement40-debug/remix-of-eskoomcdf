import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PageHeader = ({ title, showBack = false }: { title: string; showBack?: boolean }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-center bg-secondary py-3 px-4 relative">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 text-foreground"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
    </header>
  );
};

export default PageHeader;
