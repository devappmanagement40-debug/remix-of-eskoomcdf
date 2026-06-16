import { useState, useEffect } from "react";
import { HelpCircle, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const Aide = () => {
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faq")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setFaqItems(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Centre d'aide" showBack />
      <div className="px-4 pt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : faqItems.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <HelpCircle size={28} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Aucun article disponible</p>
            <p className="text-xs text-muted-foreground">Les articles d'aide seront bientôt disponibles.</p>
          </div>
        ) : (
          faqItems.map((item) => (
            <details key={item.id} className="bg-card rounded-xl border border-secondary overflow-hidden group">
              <summary className="p-4 flex items-center justify-between cursor-pointer list-none">
                <div className="flex items-center gap-3">
                  <HelpCircle size={18} className="text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">{item.question}</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 pl-11">
                <p className="text-sm text-muted-foreground whitespace-pre-line">{item.answer}</p>
              </div>
            </details>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Aide;
