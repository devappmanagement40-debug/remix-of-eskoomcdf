import { Globe, Users, TrendingUp, Shield, Zap, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const stats = [
  { label: "Pays couverts", value: "12+", icon: MapPin },
  { label: "Investisseurs actifs", value: "50 000+", icon: Users },
  { label: "Rendement moyen", value: "18%", icon: TrendingUp },
  { label: "Projets financés", value: "200+", icon: Zap },
];

const APropos = () => {
  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="À propos de nous" showBack />
      <div className="px-4 pt-6 space-y-6">
        {/* Hero */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">ESKOM Energy</h2>
              <p className="text-xs text-muted-foreground">Investir dans l'énergie africaine</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ESKOM est une plateforme d'investissement innovante dédiée au secteur énergétique en Afrique. 
            Notre mission est de démocratiser l'accès aux opportunités d'investissement dans les 
            énergies renouvelables et les infrastructures industrielles sur le continent africain.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Notre mission</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Chez ESKOM, nous croyons fermement que l'Afrique détient un potentiel énergétique 
            considérable et largement inexploité. Notre plateforme permet à chaque citoyen africain, 
            quel que soit son niveau de revenu, de participer activement au développement 
            énergétique du continent et d'en tirer des bénéfices concrets.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nous proposons un modèle d'investissement accessible, transparent et rentable, 
            conçu spécifiquement pour répondre aux réalités économiques du continent africain. 
            Chaque investissement contribue directement au financement de projets d'énergie 
            solaire, éolienne et d'infrastructures technologiques essentielles.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-secondary p-4 text-center">
              <stat.icon size={22} className="text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Expansion */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Notre expansion en Afrique</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Présent dans plus de 12 pays africains, ESKOM s'est implanté stratégiquement 
            en Afrique de l'Ouest, en Afrique Centrale et en Afrique de l'Est. Notre réseau 
            couvre notamment le Burkina Faso, la Côte d'Ivoire, le Sénégal, le Mali, le Cameroun, 
            la République Démocratique du Congo, le Togo, le Bénin, la Guinée, le Niger, 
            le Gabon et le Kenya.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette présence continentale nous permet de diversifier nos investissements 
            et d'offrir à nos membres des opportunités variées dans différents marchés 
            énergétiques en pleine croissance. Chaque pays représente un potentiel unique 
            en matière d'énergie solaire, éolienne et d'infrastructures numériques.
          </p>
        </div>

        {/* Why ESKOM */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Pourquoi choisir ESKOM ?</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sécurité des fonds</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vos investissements sont protégés par des protocoles de sécurité avancés. 
                  Chaque transaction est vérifiée et chaque portefeuille est sécurisé.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Rendements attractifs</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nos produits d'investissement offrent des rendements compétitifs, 
                  avec des revenus quotidiens versés directement dans votre portefeuille.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Communauté solidaire</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Rejoignez une communauté de plus de 50 000 investisseurs africains 
                  qui partagent la même vision d'un continent prospère et autosuffisant en énergie.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Nous contacter</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Notre équipe de support est disponible 7j/7 pour répondre à toutes vos questions 
            et vous accompagner dans vos investissements.
          </p>
          <p className="text-sm text-muted-foreground">
            📧 support@eskom-energy.com
          </p>
          <p className="text-sm text-muted-foreground">
            🌐 www.eskom-energy.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default APropos;
