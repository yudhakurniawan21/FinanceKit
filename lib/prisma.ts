import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // Allow global `prisma` var in dev to avoid hot-reload creating new clients.
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    // Log queries in dev for debugging; silent in prod.
    log: process.env.NODE_ENV === "production" ? [] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
