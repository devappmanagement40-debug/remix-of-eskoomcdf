import { Globe, Users, TrendingUp, Shield, Zap, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const stats = [
  { label: "Countries covered", value: "12+", icon: MapPin },
  { label: "Active investors", value: "50,000+", icon: Users },
  { label: "Average return", value: "18%", icon: TrendingUp },
  { label: "Funded projects", value: "200+", icon: Zap },
];

const APropos = () => {
  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="About Us" showBack />
      <div className="px-4 pt-6 space-y-6">
        {/* Hero */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">GE Energy</h2>
              <p className="text-xs text-muted-foreground">Investing in African energy</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            GE Energy is an innovative investment platform dedicated to the energy sector in Africa.
            Our mission is to democratize access to investment opportunities in renewable
            energy and industrial infrastructure across the African continent.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Our mission</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            At GE Energy, we firmly believe that Africa holds considerable and largely untapped
            energy potential. Our platform enables every African citizen, regardless of
            income level, to actively participate in the continent's energy development
            and reap concrete benefits.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We offer an accessible, transparent, and profitable investment model,
            designed specifically to meet the economic realities of the African continent.
            Every investment directly contributes to financing solar energy, wind energy,
            and essential technological infrastructure projects.
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
          <h3 className="text-base font-bold text-foreground mb-3">Our expansion in Africa</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Present in several African countries, GE Energy has strategically established itself
            in Central Africa and East Africa. Our network covers
            Haiti, Cameroon, Gabon, and Kenya.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This continental presence allows us to diversify our investments
            and offer our members varied opportunities in different
            fast-growing energy markets. Each country represents a unique potential
            in solar energy, wind energy, and digital infrastructure.
          </p>
        </div>

        {/* Why ESKOM */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Why choose GE Energy?</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Fund security</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your investments are protected by advanced security protocols.
                  Every transaction is verified and every wallet is secured.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Attractive returns</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Our investment products offer competitive returns,
                  with daily income credited directly to your wallet.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Supportive community</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Join a community of over 50,000 African investors
                  who share the same vision of a prosperous, energy-independent continent.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl border border-secondary p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Contact us</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Our support team is available 7 days a week to answer all your questions
            and guide you through your investments.
          </p>
          <p className="text-sm text-muted-foreground">
            📧 support@ge-energy.com
          </p>
          <p className="text-sm text-muted-foreground">
            🌐 www.ge-energy.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default APropos;
