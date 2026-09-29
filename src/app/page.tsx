import Link from "next/link";

// Beranda / Landing (docs/03-design.md §4.1). MVP: navigasi tanpa akun
// (v1 menambah tautan "Papan Peringkat" dan "Masuk", lihat §4.1 & ADR-12).

const CARA_MAIN = [
  {
    title: "Baca Berkas",
    body: "Pelajari kronologi, saksi, dan arahan dari Kepala Unit.",
  },
  {
    title: "Tulis Query",
    body: "Bongkar data warga, kartu akses, kamera, dan log telepon dengan SQL.",
  },
  {
    title: "Tangkap Tersangka",
    body: "Ajukan nama pelaku di laporan polisi. Salah tuduh ada harganya.",
  },
] as const;

const FITUR = [
  {
    title: "SQL Sungguhan",
    body: "Query yang kamu tulis adalah SQL standar, bukan bahasa buatan.",
  },
  {
    title: "Satu Kota, Delapan Kasus",
    body: "Wiralaga, kota pesisir fiktif dengan festival kuliner, posko banjir, kos-kosan, dan pinjol gelap.",
  },
  {
    title: "Bantuan Bertingkat",
    body: "Dari arah umum sampai query lengkap. Setiap petunjuk jelas biayanya.",
  },
  {
    title: "Siap Dunia Kerja",
    body: "Buku Saku menjelaskan beda SQLite, PostgreSQL, dan MySQL.",
  },
] as const;

const STATISTIK = ["3 bab siap dimainkan", "23 tantangan query", "5 bab lagi segera hadir"] as const;

export default function BerandaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border-subtle">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-8 py-4">
          <span className="font-display text-lg font-bold tracking-wide text-text-primary">Detektif SQL</span>
          <div className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
            <a href="#cara-main" className="hover:text-text-primary">
              Cara Main
            </a>
            <Link href="/kasus" className="hover:text-text-primary">
              Daftar Kasus
            </Link>
            <a href="#tentang" className="hover:text-text-primary">
              Tentang
            </a>
          </div>
          <Link
            href="/kasus"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Main Sekarang
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-[1200px] px-8 py-16 md:py-24">
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Divisi Investigasi Data &middot; Wiralaga
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight text-text-primary md:text-6xl">
            Setiap Kejahatan Meninggalkan Jejak di Data.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-text-secondary">
            Baca berkas kasus, tulis query SQL, dan tangkap tersangka sebelum jejaknya hilang. Gratis,
            langsung di browser.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/kasus"
              className="rounded-md bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
            >
              Mulai Investigasi
            </Link>
            <a
              href="#cara-main"
              className="rounded-md border border-border-strong px-6 py-3 font-semibold text-text-primary transition-colors hover:bg-surface-2"
            >
              Lihat Cara Main
            </a>
          </div>
          <p className="mt-4 text-sm text-text-muted">Tanpa instalasi &middot; Gratis penuh &middot; Tanpa iklan</p>
          <p className="mt-1 text-sm text-text-muted">
            Dibuat untuk mahasiswa, calon data analyst, dan penggemar teka-teki.
          </p>
        </section>

        <section id="cara-main" className="border-t border-border-subtle bg-surface-1">
          <div className="mx-auto max-w-[1200px] px-8 py-16">
            <h2 className="font-display text-2xl font-bold text-text-primary">
              Tiga Langkah Menjadi Detektif Data
            </h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {CARA_MAIN.map((step, i) => (
                <li key={step.title} className="rounded-lg border border-border-subtle bg-surface-2 p-6">
                  <span className="font-display text-3xl font-extrabold text-primary">{i + 1}</span>
                  <h3 className="mt-2 text-lg font-bold text-text-primary">{step.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="tentang" className="mx-auto max-w-[1200px] px-8 py-16">
          <h2 className="font-display text-2xl font-bold text-text-primary">Kenapa Detektif SQL?</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {FITUR.map((f) => (
              <div key={f.title} className="rounded-lg border border-border-subtle p-6">
                <h3 className="text-lg font-bold text-text-primary">{f.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border-subtle bg-surface-1">
          <div className="mx-auto flex max-w-[1200px] flex-wrap gap-8 px-8 py-8 text-sm font-semibold text-text-secondary">
            {STATISTIK.map((s) => (
              <span key={s} className="tabular-nums">
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-8 py-16 text-center">
          <p className="text-lg text-text-secondary">Berkas pertamamu sudah di meja.</p>
          <Link
            href="/kasus"
            className="mt-4 inline-block rounded-md bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Buka Bab 1
          </Link>
        </section>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-8 py-6 text-xs text-text-muted">
          <span>&copy; 2026 Detektif SQL</span>
          <span>Semua kasus, tokoh, tempat, dan instansi dalam game ini fiktif.</span>
        </div>
      </footer>
    </div>
  );
}
