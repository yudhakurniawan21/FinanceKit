import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { User, UserSettings } from "@/lib/generated/prisma/client";

// Dapatkan pengguna + pengaturannya dari server (memakai cookie session yang ada).
// Dibungkus `cache()` React: dalam satu request, panggilan berulang (layout +
// page) hanya melakukan 1x session check + 1x query DB.
export const getCurrentUser = cache(async (): Promise<{
  user: User;
  settings: UserSettings | null;
} | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.userSettings.findUnique({ where: { userId: session.user.id } }),
  ]);

  return user ? { user, settings } : null;
});
