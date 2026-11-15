import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bychick POS — Kasir, Antrian & Analisis Keuangan",
    template: "%s · Bychick POS",
  },
  description:
    "Aplikasi kasir (POS) Bychick Geprek & Burger: transaksi kasir terintegrasi layar antrian TV dan dashboard analisis keuangan.",
  manifest: undefined,
};

export const viewport: Viewport = {
  themeColor: "#221712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${bricolage.variable} ${jakarta.variable} ${grotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}
