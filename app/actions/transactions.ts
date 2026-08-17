"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TransactionSchema } from "@/lib/validation";
import { majorToMinor } from "@/lib/currencies";
import { translate } from "@/lib/i18n";
import { recordNetWorthSnapshot } from "@/lib/db/net-worth";
import { TransactionType, PaymentMethod } from "@/lib/generated/prisma/client";

export async function createTransactionAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  if (v.categoryId) {
    const owned = await categoryBelongsToUser(v.categoryId, session.user.id);
    if (!owned) return { error: translate(locale, "errCategoryInvalid") };
  }

  if (v.accountId) {
    const owned = await walletBelongsToUser(v.accountId, session.user.id);
    if (!owned) return { error: translate(locale, "errWalletInvalid") };
  }

  const currency = await resolveCurrency(session.user.id);
  const amountMinor = majorToMinor(v.amount, currency);

  await prisma.transaction.create({
    data: {
      userId: session.user.id,
      date: new Date(v.date),
      amount: amountMinor,
      type: v.type as TransactionType,
      method: (v.method as PaymentMethod) ?? null,
      description: v.description ?? null,
      categoryId: v.categoryId ?? null,
      accountId: v.accountId ?? null,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  await recordNetWorthSnapshot(session.user.id);
  return { success: true };
}

export async function updateTransactionAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidationShort") };
  }
  const v = parsed.data;
  const id = formData.get("id") as string | null;
  if (!id) return { error: translate(locale, "errTxId") };

  if (v.categoryId) {
    const owned = await categoryBelongsToUser(v.categoryId, session.user.id);
    if (!owned) return { error: translate(locale, "errCategoryInvalid") };
  }

  if (v.accountId) {
    const owned = await walletBelongsToUser(v.accountId, session.user.id);
    if (!owned) return { error: translate(locale, "errWalletInvalid") };
  }

  const currency = await resolveCurrency(session.user.id);
  const amountMinor = majorToMinor(v.amount, currency);

  await prisma.transaction.update({
    where: { id, userId: session.user.id },
    data: {
      date: new Date(v.date),
      amount: amountMinor,
      type: v.type as TransactionType,
      method: (v.method as PaymentMethod) ?? null,
      description: v.description ?? null,
      categoryId: v.categoryId ?? null,
      accountId: v.accountId ?? null,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  await recordNetWorthSnapshot(session.user.id);
  return { success: true };
}

export async function deleteTransactionAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  await prisma.transaction.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  await recordNetWorthSnapshot(session.user.id);
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

// Pastikan kategori benar-benar milik pengguna (cegah cross-tenant IDOR).
async function categoryBelongsToUser(
  categoryId: string,
  userId: string
): Promise<boolean> {
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  return cat !== null;
}

// Pastikan akun benar-benar milik pengguna.
async function walletBelongsToUser(
  walletId: string,
  userId: string
): Promise<boolean> {
  const w = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
    select: { id: true },
  });
  return w !== null;
}
