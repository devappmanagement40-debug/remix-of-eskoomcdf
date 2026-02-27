import { ArrowDownLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const mockRetraits = [
  {
    orderNo: "60224234103739061",
    montantRetrait: "3,600.00",
    montantRecu: "3,348.00",
    beneficiaire: "Hassane",
    banque: "ORANGE",
    audit: "Approuvé",
    comptePaiement: "2250703837940",
    heureDemande: "24/02/2026 23:41:03",
    etatPaiement: "Réussi",
    heurePaiement: "25/02/2026 08:27:33",
  },
  {
    orderNo: "60223222147307606",
    montantRetrait: "3,700.00",
    montantRecu: "3,441.00",
    beneficiaire: "Hassane",
    banque: "ORANGE",
    audit: "Approuvé",
    comptePaiement: "2250703837940",
    heureDemande: "23/02/2026 22:21:47",
    etatPaiement: "Réussi",
    heurePaiement: "24/02/2026 10:48:06",
  },
];

const DetailRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-secondary/50 last:border-b-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
  </div>
);

const HistoriqueRetraits = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Historique des retraits" showBack />
      <div className="px-4 pt-4 space-y-4">
        {mockRetraits.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <ArrowDownLeft size={40} className="text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Aucun retrait pour le moment</p>
          </div>
        ) : (
          mockRetraits.map((r) => (
            <div key={r.orderNo} className="bg-card rounded-xl border border-secondary overflow-hidden">
              {/* Order header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-secondary to-secondary/60">
                <span className="text-sm font-mono font-semibold text-foreground">{r.orderNo}</span>
                <span className="text-xs font-bold text-background bg-primary px-3 py-1 rounded-full">Order No.</span>
              </div>

              <div className="px-4 pt-2 pb-3">
                {/* Montants side by side */}
                <div className="grid grid-cols-2 gap-4 py-3 border-b border-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Montant du retrait</p>
                    <p className="text-lg font-bold text-foreground">{r.montantRetrait} <span className="text-xs font-normal text-muted-foreground">CFA</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Montant réel reçu</p>
                    <p className="text-lg font-bold text-foreground">{r.montantRecu} <span className="text-xs font-normal text-muted-foreground">CFA</span></p>
                  </div>
                </div>

                {/* Details */}
                <DetailRow label="Bénéficiaire" value={r.beneficiaire} />
                <DetailRow label="Nom de la Banque" value={r.banque} />
                <DetailRow label="État de l'audit" value={r.audit} highlight />
                <DetailRow label="Numéro de compte de paiement" value={r.comptePaiement} />
                <DetailRow label="Heure de la demande" value={r.heureDemande} />
                <DetailRow label="État du paiement" value={r.etatPaiement} highlight />
                <DetailRow label="Heure de paiement" value={r.heurePaiement} />
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default HistoriqueRetraits;
