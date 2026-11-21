import type { Metadata, Viewport } from "next";
import { Manrope, Rubik, JetBrains_Mono, Pixelify_Sans } from "next/font/google";
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

// Pixel display face from the Bitlynn underwater-apartment design concept
const pixelify = Pixelify_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bitlynn — Мобільний кібер-клас, ігри та P2P-допомога",
  description:
    "Інтерактивний мобільний вебпрототип для учнів 10–14 років та вчителів: Кібер-Шибениця, Zero-Repeat Бліц, Кібер-Екіпаж 15–18, P2P-біржа та турніри.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050914",
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
      className={`${manrope.variable} ${rubik.variable} ${jetbrainsMono.variable} ${pixelify.variable} dark`}
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
