import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";

import { Providers } from "@/components/providers";
import { getDictionary } from "@/lib/dictionaries";
import { dirOf, isLocale, locales, type Locale } from "@/lib/i18n";
import { themeBootstrapScript } from "@/lib/theme";

import "../globals.css";

// Self-hosted variable fonts (OFL, from @fontsource-variable): no build-time call to Google,
// no third-party request from the browser, and builds work offline or inside Iran.
const latin = localFont({
  src: "../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-latin",
  display: "swap",
});

const persian = localFont({
  src: "../../../node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-persian",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = getDictionary(isLocale(locale) ? locale : "fa");
  return {
    title: { default: dictionary.meta.title, template: `%s · ${dictionary.common.brand}` },
    description: dictionary.meta.description,
    applicationName: dictionary.common.brand,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: dictionary.common.brandShort,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icons/apple-touch-icon.png" }],
    },
    openGraph: {
      title: dictionary.meta.title,
      description: dictionary.meta.description,
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typed = locale as Locale;

  return (
    <html lang={typed} dir={dirOf(typed)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${latin.variable} ${persian.variable} antialiased`}>
        <Providers locale={typed}>{children}</Providers>
      </body>
    </html>
  );
}
