---
name: Berkas Malam — Detektif SQL
colors:
  background: '#0D1220'
  on-background: '#E9EDF5'
  surface: '#141A2A'
  surface-dim: '#0D1220'
  surface-bright: '#232D45'
  surface-container-lowest: '#0A0F1B'
  surface-container-low: '#141A2A'
  surface-container: '#1B2336'
  surface-container-high: '#232D45'
  surface-container-highest: '#232D45'
  surface-variant: '#1B2336'
  on-surface: '#E9EDF5'
  on-surface-variant: '#A9B2C6'
  outline: '#2E3A56'
  outline-variant: '#2E3A56'
  primary: '#F2B84B'
  on-primary: '#1A1407'
  error: '#FF5A5F'
  error-container: '#C8323A'
  on-error-container: '#FFFFFF'
  editor: '#0A0F1B'
  surface-raised: '#1B2336'
  surface-hover: '#232D45'
  outline-strong: '#5A6890'
  muted: '#909BB2'
  primary-hover: '#F7C96E'
  primary-tint: '#2F2D2E'
  danger: '#FF5A5F'
  danger-container: '#C8323A'
  on-danger-container: '#FFFFFF'
  success: '#34D39E'
  on-success: '#06251A'
  info: '#6AA5FF'
  hint: '#B99AFF'
  on-hint: '#1B1030'
  paper: '#EBDDBF'
  on-paper: '#2A2112'
  paper-muted: '#6B5A3A'
  stamp-red: '#B3261E'
  stamp-green: '#1E6B4F'
typography:
  display-xl:
    fontFamily: Big Shoulders Display
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 72px
  display-md:
    fontFamily: Big Shoulders Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  headline:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  code:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  data:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  badge:
    fontFamily: Big Shoulders Display
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  report-input:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 28px
rounded:
  paper: 2px
  xs: 4px
  sm: 8px
  DEFAULT: 10px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 64px
---

## Overview
"Berkas Malam" (Night Files): a detective's desk at night. Calm, modern dark UI for long sessions of reading tables and writing SQL; manila paper and red rubber stamps appear only at narrative moments (briefing, police report, arrest, case summary). Audience: adults (university students, aspiring data analysts, mystery gamers). All UI copy is Bahasa Indonesia. Every case happens in the fictional coastal city Wiralaga; the investigating agency is fictional ("Divisi Investigasi Data"); never use real police symbols or real cities as crime scenes. Chapters 1-3 are non-violent, chapter 4 is darker without violence, and chapters 5-8 may involve murder that always happens off-screen. Later chapters may feel darker (dimmer desk lamp, heavier vignette, deeper ink shadows) using the same tokens only.

Desktop-first (min 1024px). Chapters 5-8 carry a "Tema Dewasa" content label; violence always stays off-screen. Optional accounts and per-chapter leaderboards arrive in v1.

## Colors
80% neutral ink-navy surfaces, one functional accent (turmeric amber #F2B84B) for primary actions and focus, semantic red for errors and stamps, teal for success, lavender reserved for hints, blue for info, SQL dialect notes and the "online features unavailable" banner. Manila paper #EBDDBF only for in-story documents. The "Tema Dewasa" label is deliberately neutral (reversed ink or reversed light), never red or amber. The player's own leaderboard row uses primary-tint #2F2D2E (amber 12% over the panel) with a 3px amber left edge.

## Typography
Plus Jakarta Sans for UI, JetBrains Mono (ligatures off) for SQL and every table cell, Big Shoulders Display bold uppercase for chapter numbers, big titles and stamps. Table headers keep the exact lowercase column names from the database.

## Layout
Desktop-first, minimum 1024px; below that a "Layar Terlalu Kecil" screen offers "Tetap Lanjutkan". Content pages: 12-column grid, 1200px max. Investigation room: full-bleed, 320px left panel (mission steps), flexible center (editor over results), 320px right panel with tabs Skema, Bantuan, Buku Saku. All data sheets of a chapter are visible from the start. v1 account pages are desktop content pages: sign-in as one centered 440px card, leaderboard up to 960px, profile up to 720px. Mobile layouts are post-MVP.

## Elevation & Depth
Elevation is shown mainly by lighter surfaces; shadows are soft and dark. Paper documents cast a deep shadow as if lying on a desk.

## Shapes
10px buttons and cards, 16px panels and modals, 8px inputs, 2px paper documents with a folder tab.

## Components
Primary amber buttons, outline secondary buttons, SQL editor, dense data table, step cards (done, active, locked), four-level hint cards (Arah free, Sheet & Kolom −10%, Kerangka −30%, Query Lengkap −60% with warning label), automatic assistant row that translates SQL errors, Buku Saku SQL pocket reference with SQLite vs PostgreSQL/MySQL dialect notes, schema accordion, saved-note cards with colored label edge, toasts, modals, a two-field police report form (case number, suspect name), rubber stamps (DITANGKAP, SELESAI, RAHASIA, BUKAN DIA, DITOLAK, KASUS DITUTUP).
Content label: "TEMA DEWASA" badge (Big Shoulders Display 13px, 4px radius, no icon) plus a one-line caption with the exact text from the chapter list, shown on chapter cards and briefings for chapters 5-8 only.
Final chapter: a police report variant with three name fields "DALANG", "PERANTARA 1", "PERANTARA 2" laid out as a mini org chart, without autocomplete; a wrong-report alert that never reveals how many names are correct (report thumbnail stamped "DITOLAK"); an arrest scene with three mugshot cards stamped "DITANGKAP" one after another, the mastermind last and largest.
Accounts and leaderboard (v1, optional login): "Masuk dengan Google" button (the only sign-in method), "Main tanpa akun" link, leaderboard table (Peringkat, Nama Tampilan, Skor, Waktu) with tabs "Semua" and "Tanpa Bantuan" and a highlighted own row, opt-in toggle "Tampilkan namaku di Papan Peringkat" (off by default), sync status chip, and a friendly "Fitur online sedang tidak tersedia" banner that never blocks play.

### Component tokens
- button-primary: bg primary #F2B84B, text on-primary #1A1407, typography label, radius md 10px, height 40px, padding 0 16px; hover bg primary-hover #F7C96E.
- button-danger: bg danger-container #C8323A, text on-danger-container #FFFFFF, radius md 10px.
- input: bg background #0D1220, text on-surface #E9EDF5, radius sm 8px, height 40px.
- card: bg surface-raised #1B2336, text on-surface, radius md 10px, padding 16px.
- panel: bg surface #141A2A, radius lg 16px.
- sql-editor: bg editor #0A0F1B, text on-surface, typography code.
- data-table-cell: text on-surface, typography data, height 40px.
- paper-document: bg paper #EBDDBF, text on-paper #2A2112, radius paper 2px.
- hint-card: bg surface-raised, text hint #B99AFF, radius md 10px.
- pocket-reference-dialect-note: bg surface-raised, text info #6AA5FF, radius sm 8px.
- badge-mature-on-paper: bg on-paper #2A2112, text paper #EBDDBF, typography badge, radius xs 4px, height 22px, padding 0 8px.
- badge-mature-on-dark: bg on-surface #E9EDF5, text background #0D1220, typography badge, radius xs 4px, height 22px, padding 0 8px.
- badge-mature-note: text paper-muted #6B5A3A, typography caption.
- report-name-field: bg paper, text on-paper, typography report-input, radius paper 2px.
- leaderboard-row: bg surface, text on-surface, typography data, height 48px.
- leaderboard-row-self: bg primary-tint #2F2D2E, text on-surface, typography data, height 48px.
- sync-status-chip: bg surface-raised, text on-surface-variant #A9B2C6, typography label, radius full, height 28px.
- online-unavailable-banner: bg surface-raised, text on-surface, typography body, radius md 10px, padding 12px 16px.

## Do's and Don'ts
Do keep data tables and the editor visually dominant in the investigation room. Do pair every status color with an icon and text. Do show hint costs before opening. Do keep login optional everywhere and keep the game fully playable when online features are down. Don't auto-open hints; only offer them. Don't use neon glows, pixel art, childish styling, or textures behind data. Don't imitate real police logos, uniforms, ranks, or emergency numbers, and don't redraw real brand logos (use a neutral placeholder for the Google sign-in logo in mockups). Don't show blood, injuries, weapons, or bodies; crime-scene photos show only empty places. Don't reveal how many names are correct in the final-chapter report. Don't put real final-chapter answers in mockups; use placeholder names.
