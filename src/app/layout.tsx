import type { Metadata, Viewport } from "next";
import { Manrope, Rubik, JetBrains_Mono, Pixelify_Sans, Inter } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

// Bitlynn 4.0 UI face: everything a child reads (questions, answers, buttons)
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

// Pixel display face from the Bitlynn underwater-apartment design concept
const pixelify = Pixelify_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bitlynn — підводна квартира програміста",
  description:
    "Мобільне демо Bitlynn для дітей 9+: кімната-лобі, комп’ютер BitOS, режими навчання та аркади з питаннями.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E0F13",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      suppressHydrationWarning
      className={`${manrope.variable} ${rubik.variable} ${jetbrainsMono.variable} ${pixelify.variable} ${inter.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="min-h-dvh overflow-x-clip bg-abyss-950 font-sans text-slate-100 antialiased"
      >
        {children}
      </body>
    </html>
  );
}
