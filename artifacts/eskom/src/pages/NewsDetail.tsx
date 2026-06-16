import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    fetch(`/api/info-items/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setItem(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Détails de l'annonce" showBack />
        <div className="px-4 pt-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Information non disponible</p>
          <p className="text-sm text-muted-foreground">Cette annonce est introuvable ou a été supprimée.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const imageUrl = item.imageUrl ?? item.image_url;
  const description: string = item.description ?? "";
  const paragraphs = description.split("\n").filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Détails de l'annonce" showBack />
      <div className="px-4 pt-6">
        {imageUrl && (
          <img src={imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-xl mb-5" />
        )}
        <h2 className="text-xl font-bold text-foreground mb-4">{item.title}</h2>
        <div className="space-y-4">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph: string, index: number) => (
              <p key={index} className="text-sm text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        {(item.created_at || item.createdAt) && (
          <p className="text-xs text-muted-foreground/60 mt-6">
            Publié le {new Date(item.created_at ?? item.createdAt).toLocaleDateString("fr-FR", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default NewsDetail;
