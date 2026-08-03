import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/layout/AppChrome";
import { createClient } from "@/utils/supabase/server";

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata() {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('data').eq('id', 'general').single();
  const settings = data?.data || { name: "SOVOGIN" };
  
  return {
    title: `${settings.name} | Sociedad de Ginecología y Obstetricia`,
    description: "Plataforma oficial de la Sociedad de Ginecología y Obstetricia. Recursos académicos, eventos y beneficios para asociados.",
    keywords: ["ginecología", "obstetricia", "salud", "médicos", "colombia", "sovogin"],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('data').eq('id', 'general').single();
  const settings = data?.data || null;

  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans font-heading-wrapper">
        <AppChrome settings={settings}>{children}</AppChrome>
      </body>
    </html>
  );
}
