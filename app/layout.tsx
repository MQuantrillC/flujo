import type { Metadata } from "next";
import { Onest, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { COOKIE_TEMA } from "@/lib/idioma";
import "./globals.css";

const onest = Onest({ variable: "--font-onest", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flujo",
  description: "Pendientes del equipo, en una línea.",
};

// Sin cookie de tema, manda la preferencia del sistema; se aplica antes de pintar
// para que no haya un destello claro.
const SCRIPT_TEMA = "if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const tema = (await cookies()).get(COOKIE_TEMA)?.value;
  return (
    <html lang={locale} className={`${onest.variable} ${geistMono.variable} h-full antialiased${tema === "dark" ? " dark" : ""}`} suppressHydrationWarning>
      <head>{tema !== "light" && tema !== "dark" && <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />}</head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
