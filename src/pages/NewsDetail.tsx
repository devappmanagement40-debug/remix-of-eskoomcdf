import { useParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import newsAudit from "@/assets/news-audit.jpg";
import newsCertificat from "@/assets/news-certificat.jpg";

const newsData: Record<string, { title: string; image: string; content: string[] }> = {
  "controle-fiscal": {
    title: "Contrôle fiscal en cours..",
    image: newsAudit,
    content: [
      "Chers membres d'ESKOM,",
      "Suite au récent contrôle de conformité financière et fiscale, ESKOM a reçu une notification officielle des autorités réglementaires et fiscales nationales compétentes exigeant un examen progressif des processus de règlement de l'entreprise.",
      "Afin de coopérer pleinement avec les autorités fiscales et de garantir la légalité, la conformité et le développement stable à long terme des opérations de l'entreprise, ESKOM a temporairement suspendu ses activités et le règlement des paiements, conformément aux procédures réglementaires, dans l'attente de la conclusion du contrôle.",
      "Soyez assurés que la situation est la suivante :",
      "1️⃣ Les fonds de tous les membres sont actuellement en sécurité dans les portefeuilles ESKOM et il n'y a eu aucune perte, aucun détournement ni aucun transfert anormal.",
      "2️⃣ Cette suspension est une étape nécessaire à la vérification des processus fiscaux et financiers et n'indique en aucun cas l'arrêt du projet ou un dysfonctionnement de la plateforme.",
      "3️⃣ Dès que les services compétents auront terminé la vérification et rétabli l'accès aux comptes, l'entreprise reprendra immédiatement le traitement normal de toutes les opérations, y compris les retraits et les règlements.",
      "Nous comprenons l'inquiétude et l'impatience de chaque membre. Nous vous assurons que l'équipe ESKOM travaille activement avec les autorités pour accélérer le processus d'examen et rétablir le service complet dans les plus brefs délais.",
      "Nous vous remercions pour votre patience et votre confiance. Nous restons à votre disposition pour toute question via notre service client.",
      "L'équipe ESKOM Energy"
    ],
  },
  "certificat-officiel": {
    title: "ESKOM reçoit un certificat officiel",
    image: newsCertificat,
    content: [
      "Chers membres d'ESKOM,",
      "Nous avons le plaisir de vous annoncer qu'ESKOM Energy a officiellement reçu un certificat de conformité délivré par la Direction Générale des Impôts (DGI), une agence nationale relevant du ministère des Finances.",
      "Ce certificat atteste que notre plateforme respecte l'ensemble des normes réglementaires et fiscales en vigueur, confirmant ainsi la transparence et la légitimité de nos opérations sur le territoire national.",
      "Cette reconnaissance officielle renforce notre engagement envers nos membres :",
      "1️⃣ Conformité totale : ESKOM opère dans le strict respect des lois et réglementations fiscales. Tous nos processus financiers sont audités et vérifiés par les autorités compétentes.",
      "2️⃣ Protection des investisseurs : Ce certificat garantit que les fonds de nos membres sont gérés selon les normes les plus strictes de sécurité financière et de transparence comptable.",
      "3️⃣ Développement durable : Cette certification nous permet d'étendre nos activités dans de nouveaux marchés africains avec une base réglementaire solide, ouvrant la voie à de nouvelles opportunités d'investissement pour nos membres.",
      "4️⃣ Crédibilité renforcée : La reconnaissance par la DGI positionne ESKOM comme un acteur de confiance dans le secteur de l'investissement énergétique en Afrique, attirant de nouveaux partenaires institutionnels et investisseurs.",
      "Nous remercions tous nos membres pour leur confiance continue. Ce certificat est le fruit de notre engagement constant envers l'excellence opérationnelle et la conformité réglementaire.",
      "Pour toute question, n'hésitez pas à contacter notre service client disponible 7j/7.",
      "L'équipe ESKOM Energy"
    ],
  },
};

const NewsDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const news = slug ? newsData[slug] : null;

  if (!news) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Détails Information" showBack />
        <div className="px-4 pt-10 text-center">
          <p className="text-muted-foreground">Article introuvable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Détails Information" showBack />
      <div className="px-4 pt-6">
        <img src={news.image} alt={news.title} className="w-full h-48 object-cover rounded-xl mb-5" />
        <h2 className="text-xl font-bold text-foreground mb-4">{news.title}</h2>
        <div className="space-y-4">
          {news.content.map((paragraph, index) => (
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
