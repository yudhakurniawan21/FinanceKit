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
  },
});
