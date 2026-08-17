import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.local (konvensi Next.js/Vercel) sebelum env() Prisma membacanya.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Opsional: hanya dipakai oleh `prisma migrate diff` (shadow DB).
    // Jika tidak diset, migrate dev/deploy memakai otomatisasi bawaan.
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
