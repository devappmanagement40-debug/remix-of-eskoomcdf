import { HelpCircle, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const faqItems = [
  { question: "Comment recharger mon compte ?", answer: "Allez dans Portefeuille > Recharger et suivez les instructions." },
  { question: "Comment retirer mes gains ?", answer: "Allez dans Portefeuille > Retirer et entrez le montant souhaité." },
  { question: "Comment acheter un produit ?", answer: "Allez dans Produits, choisissez un produit et cliquez sur Acheter." },
  { question: "Comment inviter des amis ?", answer: "Partagez votre code de parrainage depuis la page d'accueil." },
  { question: "Comment contacter le support ?", answer: "Envoyez un message au +226 XX XX XX XX sur WhatsApp." },
];

const Aide = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Centre d'aide" showBack />
      <div className="px-4 pt-6 space-y-3">
        {faqItems.map((item, index) => (
          <details key={index} className="bg-card rounded-xl border border-secondary overflow-hidden group">
            <summary className="p-4 flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <HelpCircle size={18} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{item.question}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-4 pb-4 pl-11">
              <p className="text-sm text-muted-foreground">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default Aide;
