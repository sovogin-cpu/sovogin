import { Metadata } from "next";
import { ContentChannelPage } from "@/components/content/public/ContentChannelPage";

export const metadata: Metadata = {
  title: "Innovación | SOVOGIN",
  description:
    "Avances científicos, tecnología médica, investigaciones y publicaciones especializadas en Ginecología y Obstetricia - SOVOGIN.",
};

export default function InnovacionPage() {
  return (
    <ContentChannelPage
      channel="innovation"
      title="Innovación y Conocimiento Científico"
      description="Explora artículos académicos, avances tecnológicos, material descargable e investigaciones especializadas para el desarrollo constante de la Ginecología y Obstetricia."
      basePath="/innovacion"
      headerBannerPosition="INNOVATION_HEADER"
      inlineBannerPosition="INNOVATION_INLINE"
    />
  );
}
