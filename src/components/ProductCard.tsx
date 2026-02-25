import { Badge } from "@/components/ui/badge";

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
    <div className="bg-card rounded-xl border border-secondary overflow-hidden min-w-[280px] snap-start">
      <div className="flex gap-3 p-3">
        <div className="relative w-28 h-32 rounded-lg overflow-hidden flex-shrink-0">
          <img src={image} alt={name} className="w-full h-full object-cover" />
          {isNew && (
            <Badge className="absolute top-2 left-2 bg-success text-success-foreground text-[10px] px-2 py-0.5">
              nouveau
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex gap-2 items-center flex-wrap">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary text-xs">
              {name}
            </Badge>
            <Badge className="bg-success text-success-foreground text-xs">
              {returnPercent}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
            <div>
              <p className="text-[10px] text-muted-foreground">Total des revenus</p>
              <p className="text-sm font-bold text-primary">{totalRevenue}</p>
              <p className="text-[10px] text-muted-foreground">FCFA</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Revenu Quotidien</p>
              <p className="text-sm font-bold text-primary">{dailyRevenue}</p>
              <p className="text-[10px] text-muted-foreground">FCFA</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Cycles</p>
              <p className="text-sm font-bold text-primary">{cycles}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Prix</p>
              <p className="text-sm font-bold text-primary">{price}</p>
              <p className="text-[10px] text-muted-foreground">FCFA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
