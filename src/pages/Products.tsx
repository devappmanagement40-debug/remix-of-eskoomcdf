import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import productServer from "@/assets/product-server.jpg";
import productSolar from "@/assets/product-solar.jpg";
import productWind from "@/assets/product-wind.jpg";

const products = [
  {
    image: productServer,
    name: "TC 500",
    returnPercent: "1560.0%",
    totalRevenue: "78 000,00",
    dailyRevenue: "200,00",
    cycles: 365,
    price: "5 000,00",
    isNew: true,
  },
  {
    image: productSolar,
    name: "TC 1000",
    returnPercent: "1820.0%",
    totalRevenue: "182 000,00",
    dailyRevenue: "500,00",
    cycles: 365,
    price: "10 000,00",
  },
  {
    image: productWind,
    name: "TC 2500",
    returnPercent: "2100.0%",
    totalRevenue: "525 000,00",
    dailyRevenue: "1 438,00",
    cycles: 365,
    price: "25 000,00",
    isNew: true,
  },
];

const Products = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Produits" />
      <div className="px-4 pt-4 space-y-4">
        {products.map((product) => (
          <ProductCard key={product.name} {...product} />
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default Products;
