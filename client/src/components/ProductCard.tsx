import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  image: string;
  name: string;
  returnPercent: string;
  totalRevenue: string;
  dailyRevenue: string;
  cycles: number;
  price: string;
  isNew?: boolean;
}

const ProductCard = ({
  image,
  name,
  returnPercent,
  totalRevenue,
  dailyRevenue,
  cycles,
  price,
  isNew,
}: ProductCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-secondary overflow-hidden min-w-[260px] snap-start flex flex-col">
      <div className="flex gap-3 p-3">
        <div className="relative w-24 h-28 rounded-lg overflow-hidden flex-shrink-0">
          <img src={image} alt={name} className="w-full h-full object-cover" />
          {isNew && (
            <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5">
              nouveau
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex gap-1.5 items-center flex-wrap">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary text-[10px]">
              {name}
            </Badge>
            <Badge className="bg-success text-success-foreground text-[10px]">
              {returnPercent}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
            <div>
              <p className="text-[9px] text-muted-foreground">Total des revenus</p>
              <p className="text-xs font-bold text-primary">{totalRevenue}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Quotidien</p>
              <p className="text-xs font-bold text-primary">{dailyRevenue}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Cycles</p>
              <p className="text-xs font-bold text-primary">{cycles}j</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Prix</p>
              <p className="text-xs font-bold text-primary">{price}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3">
        <Button className="gradient-button w-full h-8 text-xs font-semibold gap-1.5">
          <ShoppingCart size={14} />
          Acheter
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
