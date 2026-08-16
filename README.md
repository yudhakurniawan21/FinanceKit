# FinansialKit

Aplikasi pencatatan keuangan pribadi (mobile-first) dengan AI insights. Catat transaksi, atur anggaran per kategori, pantau pola pengeluaran lewat dashboard, dan dapatkan rekomendasi cerdas dari AI.

## Fitur

- **Autentikasi Google** (BetterAuth) — login sekali klik, sesi aman
- **Transaksi** — tambah/edit/hapus, pencarian, filter jenis, kolom sortable, pagination
- **Kategori & Anggaran** — kategori pemasukan/pengeluaran dengan ikon & warna, anggaran bulanan per kategori (autosave debounce)
- **Dashboard** — kartu ringkasan bulanan, tren 6 bulan, pengeluaran per kategori, transaksi terbaru
- **AI Insights** — ringkasan bulanan, saran hemat, dan cek anggaran via Poolside (streaming)
- **Multi-mata uang** — 10 mata uang (IDR, USD, EUR, GBP, JPY, dll.) dengan minor-unit integer (bebas bug float)
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
  (protected)/        # Halaman ber-otentikasi (dashboard, transaksi, dst.)
  actions/            # Server actions (transaksi, kategori, pengaturan)
  api/                # Route handlers (auth, health, insights AI)
  page.tsx            # Landing page
components/
  categories/         # Manajemen kategori & anggaran
  dashboard/          # Ringkasan, chart Recharts
  insights/           # Panel AI streaming
  transactions/       # Tabel, dialog, pagination
  layout/             # Shell, sidebar, theme toggle
  ui/                 # Komponen shadcn (Base UI)
lib/
  db/                 # Query Prisma
  ai.ts               # Klien Poolside (lazy init)
  auth.ts             # Konfigurasi BetterAuth
  currencies.ts       # Mata uang & konversi minor-unit
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