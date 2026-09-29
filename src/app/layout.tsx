import type { Metadata } from "next";
import { Barlow_Condensed, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";

// Tipografi "Berkas Malam" (docs/03-design.md §2.2): Plus Jakarta Sans untuk
// UI, JetBrains Mono untuk kode/data, dan untuk judul besar/nomor bab/stempel
// seharusnya "Big Shoulders Display". Google Fonts sudah menggabungkan
// keluarga itu menjadi "Big Shoulders" (varian variable, tanpa potongan
// "Display" tersendiri) sehingga tidak lagi tersedia lewat next/font/google
// sebagai famili berdiri sendiri. Dipakai fallback yang SUDAH ditulis di
// dokumen itu sendiri: **Barlow Condensed** (§2.2: "Fallback: Barlow
// Condensed").
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono-face",
  display: "swap",
});

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-display-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Detektif SQL",
  description:
    "Baca berkas kasus, tulis query SQL, dan tangkap tersangka sebelum jejaknya hilang. Gratis, langsung di browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      data-theme="dark"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} ${displayFont.variable}`}
    >
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  );
}
