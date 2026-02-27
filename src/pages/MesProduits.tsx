import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

type TabKey = "tous" | "detenir" | "expire";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "detenir", label: "Détenir" },
  { key: "expire", label: "Expiré" },
];

interface Produit {
  nom: string;
  dateReception: string;
  revenuTotal: string;
  revenuObtenu: string;
  periodeValidite: string;
  nombreRecu: number;
  totalFois: number;
  status: "actif" | "expire" | "completed";
}

const mockProduits: Produit[] = [
  {
    nom: "N-1",
    dateReception: "27/02/2026",
    revenuTotal: "5,400.00",
    revenuObtenu: "5,265.00",
    periodeValidite: "40 Jour",
    nombreRecu: 39,
    totalFois: 40,
    status: "actif",
  },
  {
    nom: "Free Trial",
    dateReception: "25/02/2026",
    revenuTotal: "405.00",
    revenuObtenu: "405.00",
    periodeValidite: "3 Jour",
    nombreRecu: 3,
    totalFois: 3,
    status: "completed",
  },
  {
    nom: "N-2",
    dateReception: "10/01/2026",
    revenuTotal: "12,000.00",
    revenuObtenu: "12,000.00",
    periodeValidite: "60 Jour",
    nombreRecu: 60,
    totalFois: 60,
    status: "expire",
  },
];

const MesProduits = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("tous");

  const filtered = mockProduits.filter((p) => {
    if (activeTab === "tous") return true;
    if (activeTab === "detenir") return p.status === "actif";
    if (activeTab === "expire") return p.status === "expire" || p.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Mon produit" showBack />
      <div className="px-4 pt-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Products list */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <p className="text-sm text-muted-foreground">Aucun produit dans cette catégorie</p>
            </div>
          ) : (
            filtered.map((p, idx) => (
              <div key={idx} className="bg-card rounded-xl border border-secondary overflow-hidden">
                {/* Product header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/80 to-primary">
                  <span className="text-sm font-bold text-primary-foreground">{p.nom}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-primary-foreground/80">Heure de réception</span>
                    <span className="text-xs font-semibold text-primary-foreground">
                      {p.status === "completed" || p.status === "expire" ? "Completed" : p.dateReception}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 space-y-2.5">
                  {/* Revenu Total */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Revenu Total</span>
                    <span className="text-lg font-bold text-foreground">
                      {p.revenuTotal} <span className="text-xs font-normal text-muted-foreground">CFA</span>
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Revenu obtenu</span>
                      <span className="text-sm text-foreground">
                        {p.revenuObtenu} <span className="text-xs text-muted-foreground">CFA</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Période de validité</span>
                      <span className="text-sm text-foreground">{p.periodeValidite}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Nombre de fois reçu</span>
                      <span className="text-sm text-foreground">{p.nombreRecu}</span>
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    disabled={p.status === "completed" || p.status === "expire"}
                    className={`w-full py-3 rounded-xl text-sm font-semibold mt-2 transition-colors ${
                      p.status === "actif"
                        ? "gradient-button text-foreground"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    Recevoir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default MesProduits;
