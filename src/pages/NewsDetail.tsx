import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";

const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase.from("info_items").select("*").eq("id", id).single().then(({ data }) => {
      setItem(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Détails Annonce" showBack />
        <div className="px-4 pt-10 text-center">
          <p className="text-muted-foreground">Article introuvable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Détails Annonce" showBack />
      <div className="px-4 pt-6">
        {item.image_url && (
          <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover rounded-xl mb-5" />
        )}
        <h2 className="text-xl font-bold text-foreground mb-4">{item.title}</h2>
        <div className="space-y-4">
          {item.description.split("\n").filter(Boolean).map((paragraph: string, index: number) => (
            <p key={index} className="text-sm text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsDetail;
