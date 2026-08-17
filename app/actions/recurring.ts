"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { RecurringSchema } from "@/lib/validation";
import { majorToMinor } from "@/lib/currencies";
import { translate } from "@/lib/i18n";
import { processDueRecurring } from "@/lib/db/recurring";
import {
  TransactionType,
  PaymentMethod,
  RecurringFrequency,
} from "@/lib/generated/prisma/client";

export async function createRecurringAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = RecurringSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  if (v.categoryId && !(await owned("category", v.categoryId, session.user.id))) {
    return { error: translate(locale, "errCategoryInvalid") };
  }
  if (v.accountId && !(await owned("wallet", v.accountId, session.user.id))) {
    return { error: translate(locale, "errWalletInvalid") };
  }

  const currency = await resolveCurrency(session.user.id);
  const amountMinor = majorToMinor(v.amount, currency);
  const startDate = new Date(v.startDate);

  await prisma.recurringTransaction.create({
    data: {
      userId: session.user.id,
      description: v.description,
      amount: amountMinor,
      type: v.type as TransactionType,
      frequency: v.frequency as RecurringFrequency,
      method: (v.method as PaymentMethod) ?? null,
      categoryId: v.categoryId ?? null,
      accountId: v.accountId ?? null,
      startDate,
      nextRunDate: startDate,
    },
  });

  revalidatePath("/recurring");
  return { success: true };
}

export async function updateRecurringAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const id = formData.get("id") as string | null;
  if (!id) return { error: translate(locale, "errRecurringInvalid") };

  const parsed = RecurringSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  if (v.categoryId && !(await owned("category", v.categoryId, session.user.id))) {
    return { error: translate(locale, "errCategoryInvalid") };
  }
  if (v.accountId && !(await owned("wallet", v.accountId, session.user.id))) {
    return { error: translate(locale, "errWalletInvalid") };
  }

  const currency = await resolveCurrency(session.user.id);
  const amountMinor = majorToMinor(v.amount, currency);
  const startDate = new Date(v.startDate);

  // Kalau startDate berubah → jadwal berikutnya dihitung ulang dari awal.
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId: session.user.id },
    select: { startDate: true },
  });
  if (!existing) return { error: translate(locale, "errRecurringInvalid") };
  const resetSchedule =
    existing.startDate.getTime() !== startDate.getTime();

  await prisma.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: {
      description: v.description,
      amount: amountMinor,
      type: v.type as TransactionType,
      frequency: v.frequency as RecurringFrequency,
      method: (v.method as PaymentMethod) ?? null,
      categoryId: v.categoryId ?? null,
      accountId: v.accountId ?? null,
      startDate,
      ...(resetSchedule ? { nextRunDate: startDate } : {}),
    },
  });

  revalidatePath("/recurring");
  return { success: true };
}

export async function toggleRecurringAction(
  id: string,
  isActive: boolean
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  await prisma.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: { isActive },
  });
  revalidatePath("/recurring");
  return { success: true };
}

export async function deleteRecurringAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  await prisma.recurringTransaction.delete({
    where: { id, userId: session.user.id },
  });
  revalidatePath("/recurring");
  return { success: true };
}

export async function processRecurringNowAction(): Promise<{
  error?: string;
  success?: boolean;
  created?: number;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const created = await processDueRecurring(session.user.id);
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true, created };
}

async function owned(
  model: "category" | "wallet",
  id: string,
  userId: string
): Promise<boolean> {
  const row =
    model === "category"
      ? await prisma.category.findFirst({ where: { id, userId }, select: { id: true } })
      : await prisma.wallet.findFirst({ where: { id, userId }, select: { id: true } });
  return row !== null;
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