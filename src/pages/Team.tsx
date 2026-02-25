import { Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const Team = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Équipe" />
      <div className="flex flex-col items-center justify-center px-6 pt-20">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Users size={28} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Mon Équipe</h3>
        <p className="text-sm text-muted-foreground text-center">
          Invitez des amis pour constituer votre équipe et gagner des bonus.
        </p>
        <button className="mt-6 gradient-button text-foreground font-semibold py-3 px-8 rounded-xl text-sm transition-opacity hover:opacity-90">
          Inviter des amis
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Team;
