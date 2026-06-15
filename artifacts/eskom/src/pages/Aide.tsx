import { useState, useEffect } from "react";
import { HelpCircle, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const Aide = () => {
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/db?table=faq_items&filter=eq:is_active:true&order=sort_order:asc")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setFaqItems(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Help Center" showBack />
      <div className="px-4 pt-6 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-10">Loading...</p>
        ) : faqItems.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">No help articles available</p>
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
    </div>
  );
};

export default Aide;
