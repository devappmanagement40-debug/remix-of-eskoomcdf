import { Users, TrendingUp, Shield, Zap, MapPin, Leaf } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAppImages } from "@/contexts/AppImagesContext";

const stats = [
  { label: "Countries covered", value: "12+", icon: MapPin },
  { label: "Active investors", value: "50,000+", icon: Users },
  { label: "Average return", value: "18%", icon: TrendingUp },
  { label: "Funded projects", value: "200+", icon: Zap },
];

const APropos = () => {
  const { appLogo } = useAppImages();
  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="About Us" showBack />
      <div className="px-4 pt-6 space-y-6">

        {/* Hero — Logo + Nom */}
        <div className="bg-card rounded-xl border border-secondary p-6 flex flex-col items-center text-center gap-4">
          <img
            src={appLogo}
            alt="GE Energy"
            className="w-24 h-24 rounded-full object-cover shadow-lg"
          />
          <div>
            <h2 className="text-xl font-bold text-foreground">GE Energy</h2>
            <p className="text-xs text-primary font-medium mt-1">Powering Africa's Future</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            GE Energy is a global investment platform dedicated to the energy sector.
            Our mission is to democratize access to profitable investment opportunities
            in renewable energy and industrial infrastructure, accessible to everyone.
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

        {/* Mission */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <div className="flex items-center gap-2 mb-3">
            <Leaf size={18} className="text-primary" />
            <h3 className="text-base font-bold text-foreground">Our Mission</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            At GE Energy, we firmly believe that the world holds considerable and largely
            untapped energy potential. Our platform enables every citizen, regardless of
            income level, to actively participate in energy development and reap concrete benefits.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We offer an accessible, transparent, and profitable investment model.
            Every investment directly contributes to financing solar energy, wind energy,
            and essential technological infrastructure projects.
          </p>
        </div>

        {/* Expansion */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={18} className="text-primary" />
            <h3 className="text-base font-bold text-foreground">Our Global Presence</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Present in several countries, GE Energy has strategically established itself
            in Africa, Central America, and beyond. Our network covers
            Haiti, Cameroon, Gabon, Kenya, and more.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This international presence allows us to diversify our investments
            and offer our members varied opportunities across fast-growing
            energy markets. Each region represents unique potential
            in solar, wind, and digital infrastructure.
          </p>
        </div>

        {/* Why GE Energy */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-4">Why choose GE Energy?</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Fund Security</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your investments are protected by advanced security protocols.
                  Every transaction is verified and every wallet is secured.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Attractive Returns</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Our investment products offer competitive returns,
                  with daily income credited directly to your wallet.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Supportive Community</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Join a community of over 50,000 investors who share the same
                  vision of a prosperous, energy-independent future.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Instant Payouts</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Withdraw your earnings anytime, directly to your crypto wallet,
                  with fast and reliable processing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Contact Us</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Our support team is available 7 days a week to answer all your questions
            and guide you through your investments.
          </p>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">📧 support@ge-energy.com</p>
            <p className="text-sm text-muted-foreground">🌐 www.ge-energy.com</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default APropos;
