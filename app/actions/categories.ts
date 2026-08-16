"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/db/categories";
import { CategorySchema } from "@/lib/validation";
import { majorToMinor } from "@/lib/currencies";
import { TransactionType } from "@/lib/generated/prisma/client";

export async function createCategoryAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "Sesi tidak ditemukan." };

  const parsed = CategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Validasi gagal. Periksa kembali isian." };
  }
  const v = parsed.data;

  const currency = await resolveCurrency(session.user.id);
  const budgetMinor =
    v.budget && v.budget > 0
      ? majorToMinor(v.budget, currency)
      : null;

  const baseSlug = `${v.type.toLowerCase()}-${slugify(v.name)}`;
  let slug = baseSlug;
  let i = 1;
  while (await prisma.category.findFirst({ where: { userId: session.user.id, slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  await prisma.category.create({
    data: {
      userId: session.user.id,
      name: v.name,
      slug,
      type: v.type as TransactionType,
      icon: v.icon ?? null,
      color: v.color ?? null,
      budget: budgetMinor,
    },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateCategoryBudgetAction(
  id: string,
  budgetMajor: number | null
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "Sesi tidak ditemukan." };
  const currency = await resolveCurrency(session.user.id);
  const budgetMinor = budgetMajor && budgetMajor > 0 ? majorToMinor(budgetMajor, currency) : null;
  await prisma.category.update({
    where: { id, userId: session.user.id },
    data: { budget: budgetMinor },
  });
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCategoryAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "Sesi tidak ditemukan." };
  await prisma.category.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { success: true };
}

// Helper: dapatkan currency user (untuk konversi major<->minor unit).
async function resolveCurrency(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { currency: true },
  });
  return settings?.currency ?? "IDR";
}
