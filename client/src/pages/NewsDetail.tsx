import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.get(`/info-items/${id}`).then((data) => {
      setItem(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Announcement Details" showBack />
        <div className="px-4 pt-10 text-center">
          <p className="text-muted-foreground">Article not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Announcement Details" showBack />
      <div className="px-4 pt-6">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-xl mb-5" />
        )}
        <h2 className="text-xl font-bold text-foreground mb-4">{item.title}</h2>
        <div className="space-y-4">
          {(item.description || "").split("\n").filter(Boolean).map((paragraph: string, index: number) => (
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
