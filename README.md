# FinansialKit

Aplikasi pencatatan keuangan pribadi (mobile-first) dengan AI insights. Catat transaksi, atur anggaran per kategori, pantau pola pengeluaran lewat dashboard, dan dapatkan rekomendasi cerdas dari AI.

## Fitur

- **Autentikasi Google** (BetterAuth) — login sekali klik, sesi aman
- **Transaksi** — tambah/edit/hapus, pencarian, filter jenis, kolom sortable, pagination
- **Kategori & Anggaran** — kategori pemasukan/pengeluaran dengan ikon & warna, anggaran bulanan per kategori (autosave debounce)
- **Akun & Transfer** — kelola dompet/rekening, transfer antar akun
- **Net Worth** — pantau total aset, liabilitas, dan nilai bersih; kontribusi tabungan (termasuk dana darurat)
- **Tabungan Goals** — target dengan deadline & setoran bulanan yang disarankan; bisa ditandai sebagai **dana darurat**
- **Transaksi Berulang** — jadwal otomatis (harian/mingguan/bulanan) dengan pembuatan transaksi idempoten + daftar jatuh tempo
- **Financial Health** — skor kesehatan keuangan 0–100 dari 6 metrik (dana darurat, rasio tabungan, rasio utang, disiplin anggaran, arus kas, progres goals) + action items
- **Dashboard** — kartu ringkasan bulanan, skor kesehatan, tren 6 bulan, pengeluaran per kategori, transaksi terbaru
- **Laporan Bulanan** — ringkasan pemasukan/pengeluaran/net, perbandingan bulan sebelumnya, rincian per kategori & harian
- **AI Insights** — ringkasan bulanan, saran hemat, dan cek anggaran via Poolside (streaming)
- **Multi-mata uang** — 10 mata uang (IDR, USD, EUR, GBP, JPY, dll.) dengan minor-unit integer (bebas bug float)
- **Multi-bahasa (i18n)** — Indonesia, English (US/UK), Deutsch; format tanggal & zona waktu
- **Preferensi** — mata uang, bahasa, format tanggal, zona waktu; dark mode
- **Desain Wise-inspired** — Tailwind v4 + shadcn (Base UI), responsif mobile-first

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19) |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), Recharts |
| Database | PostgreSQL (Prisma 7 ORM) |
| Auth | BetterAuth v1 (Google OAuth) |
| AI | Poolside (OpenAI-compatible API, streaming) |

## Menjalankan di Lokal

### 1. Prasyarat

- Node.js 20+
- PostgreSQL (mis. Docker):

```bash
docker run -d --name wallet-postgres -e POSTGRES_PASSWORD=walletpass -e POSTGRES_DB=wallet -p 5432:5432 postgres:16
```

### 2. Environment variables

Salin `.env.example` menjadi `.env.local` lalu isi:

```bash
DATABASE_URL=postgresql://postgres:walletpass@localhost:5432/wallet
BETTER_AUTH_SECRET=<buat dengan: openssl rand -base64 48>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<dari Google Cloud Console>
GOOGLE_CLIENT_SECRET=<dari Google Cloud Console>
POOLSIDE_API_KEY=<dari inference.poolside.ai>
```

> Google OAuth: tambahkan redirect URI `http://localhost:3000/api/auth/callback/google` di Google Cloud Console.

### 3. Migrasi database & jalankan

```bash
npm install
npx prisma migrate dev   # jalankan migrasi awal
npm run dev              # buka http://localhost:3000
```

## Script

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npx prisma migrate dev` | Migrasi DB |
| `npx prisma studio` | Browser DB viewer |

## Struktur Proyek

```
app/
  (protected)/        # Halaman ber-otentikasi (dashboard, transaksi, akun, dst.)
  actions/            # Server actions (transaksi, kategori, goals, pengaturan)
  api/                # Route handlers (auth, health, insights AI)
  page.tsx            # Landing page
components/
  accounts/           # Manajemen akun & transfer
  categories/         # Manajemen kategori & anggaran
  dashboard/          # Ringkasan, skor kesehatan, chart Recharts
  goals/              # Tabungan goals & dana darurat
  insights/           # Panel AI streaming
  net-worth/          # Aset, liabilitas, nilai bersih
  recurring/          # Transaksi berulang
  reports/            # Laporan bulanan
  transactions/       # Tabel, dialog, pagination
  layout/             # Shell, sidebar, theme toggle
  ui/                 # Komponen shadcn (Base UI)
lib/
  db/                 # Query Prisma
  ai.ts               # Klien Poolside (lazy init)
  auth.ts             # Konfigurasi BetterAuth
  currencies.ts       # Mata uang & konversi minor-unit
  financial-health.ts # Skor kesehatan keuangan & action items
  i18n/               # Kamus terjemahan & helper
  validation.ts       # Skema Zod
prisma/schema.prisma  # Skema database
```

## Deploy di Vercel

1. Buat database PostgreSQL — disarankan [Neon](https://neon.tech) via Vercel Marketplace.
2. Import repo di Vercel, lalu set environment variables di dashboard Vercel (sama dengan `.env.local`, dengan `DATABASE_URL` produksi ber-`sslmode=require`).
3. Jalankan migrasi: `npx prisma migrate deploy` (via terminal proyek Vercel atau CI).
4. Tambahkan redirect URI `https://<app>.vercel.app/api/auth/callback/google` di Google Cloud Console.

## Keamanan

- Semua server action & route memverifikasi sesi dan kepemilikan data (`userId`)
- Validasi input dengan Zod; jumlah uang disimpan sebagai integer minor unit
- Endpoint AI dilindungi sesi + batas panjang payload
- `.env.local` tidak pernah di-commit

## Lisensi

Proyek pribadi — bebas digunakan untuk pembelajaran.