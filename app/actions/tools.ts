"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { majorToMinor } from "@/lib/currencies";
import { translate } from "@/lib/i18n";
import type { BudgetTier } from "@/lib/generated/prisma/client";

// Terapkan daftar anggaran yang disarankan ke kategori (hasil 50/30/20).
// Nilai `budgetMajor` 0/null → hapus anggaran kategori.
export async function applySuggestedBudgetsAction(
  items: Array<{ categoryId: string; budgetMajor: number }>
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = z
    .array(
      z.object({
        categoryId: z.string().min(1),
        budgetMajor: z.number().nonnegative().max(1e15),
      })
    )
    .max(500)
    .safeParse(items);
  if (!parsed.success) return { error: translate(locale, "errBudgetsInvalid") };

  const currency = await resolveCurrency(session.user.id);
  const ids = parsed.data.map((i) => i.categoryId);

  const owned = await prisma.category.findMany({
    where: { id: { in: ids }, userId: session.user.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((c) => c.id));
  if (ownedIds.size !== ids.length) {
    return { error: translate(locale, "errBudgetsInvalid") };
  }

  await prisma.$transaction(
    parsed.data.map((i) =>
      prisma.category.update({
        where: { id: i.categoryId },
        data: {
          budget:
            i.budgetMajor > 0 ? majorToMinor(i.budgetMajor, currency) : null,
        },
      })
    )
  );

  revalidatePath("/tools");
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { success: true };
}

// Ubah klasifikasi 50/30/20 sebuah kategori ("" = tanpa klasifikasi).
export async function updateCategoryTierAction(
  categoryId: string,
  tier: BudgetTier | ""
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  if (
    tier !== "" &&
    tier !== "NEEDS" &&
    tier !== "WANTS" &&
    tier !== "SAVINGS"
  ) {
    return { error: translate(locale, "errTierInvalid") };
  }

  const cat = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
    select: { isSavings: true },
  });
  if (!cat) return { error: translate(locale, "errCategoryInvalid") };

  await prisma.category.update({
    where: { id: categoryId },
    data: { budgetTier: cat.isSavings ? "SAVINGS" : (tier || null) },
  });

  revalidatePath("/tools");
  revalidatePath("/categories");
  return { success: true };
}

async function resolveCurrency(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { currency: true },
  });
  return settings?.currency ?? "IDR";
}

async function resolveLocale(userId: string): Promise<string | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { locale: true },
  });
  return settings?.locale ?? null;
}
