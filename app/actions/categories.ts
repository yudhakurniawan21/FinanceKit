"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/db/categories";
import { CategorySchema, CategoryEditSchema } from "@/lib/validation";
import { majorToMinor } from "@/lib/currencies";
import { translate } from "@/lib/i18n";
import { TransactionType } from "@/lib/generated/prisma/client";

export async function createCategoryAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = CategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
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
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCategoryAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const id = formData.get("id") as string | null;
  if (!id) return { error: translate(locale, "errCategoryInvalid") };

  const parsed = CategoryEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  await prisma.category.update({
    where: { id, userId: session.user.id },
    data: {
      name: v.name,
      icon: v.icon ?? null,
      color: v.color ?? null,
    },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCategoryBudgetAction(
  id: string,
  budgetMajor: number | null
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
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
  if (!session?.user) return { error: translate(null, "errSession") };
  await prisma.category.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
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

async function resolveLocale(userId: string): Promise<string | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { locale: true },
  });
  return settings?.locale ?? null;
}
