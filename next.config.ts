import type { NextConfig } from "next";

/**
 * Detektif SQL dirilis sebagai situs statis (ADR-01, P1): tidak ada server
 * aplikasi. Semua state permainan hidup di browser pemain (IndexedDB), dan
 * mesin SQL berjalan di Web Worker lewat @sqlite.org/sqlite-wasm (ADR-02).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: {
    // Situs statis tanpa image optimization server (tidak ada server Next.js di produksi).
    unoptimized: true,
  },
};

export default nextConfig;
