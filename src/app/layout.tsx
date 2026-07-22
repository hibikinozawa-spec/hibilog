import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ヒビログ | Hibilog",
    template: "%s | ヒビログ",
  },
  description:
    "野沢ヒビキがGoogleマップに保存したおすすめレストランを、会食・値段・シーンで探せる共有アプリ。AIマッチでTop10を提案します。",
  openGraph: {
    title: "ヒビログ | Hibilog",
    description: "食べログ × 野沢ヒビキ。社員・友人のためのレストランガイド。",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
