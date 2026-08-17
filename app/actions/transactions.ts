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

  let categoryIsSavings = false;
  if (v.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: v.categoryId, userId: session.user.id },
      select: { isSavings: true },
    });
    if (!cat) return { error: translate(locale, "errCategoryInvalid") };
    categoryIsSavings = cat.isSavings;
  }

  // Tautan ke goal hanya berlaku untuk transaksi kategori tabungan.
  const goalId = categoryIsSavings ? (v.goalId ?? null) : null;
  if (goalId) {
    const owned = await goalBelongsToUser(goalId, session.user.id);
    if (!owned) return { error: translate(locale, "errGoalInvalid") };
  }

  if (v.accountId) {
    const owned = await walletBelongsToUser(v.accountId, session.user.id);
    if (!owned) return { error: translate(locale, "errWalletInvalid") };
  }

  const currency = await resolveCurrency(session.user.id);
  const amountMinor = majorToMinor(v.amount, currency);

  const effect = savingsEffect(
    v.type as TransactionType,
    amountMinor,
    categoryIsSavings
  );

  try {
    await prisma.$transaction(async (tx) => {
      if (goalId && effect < 0) {
        const goal = await tx.goal.findFirst({
          where: { id: goalId, userId: session.user.id },
          select: { currentAmount: true },
        });
        if (!goal) throw new Error("goal");
        if (goal.currentAmount + effect < 0) throw new Error("insufficient");
      }

      await tx.transaction.create({
        data: {
          userId: session.user.id,
          date: new Date(v.date),
          amount: amountMinor,
          type: v.type as TransactionType,
          method: (v.method as PaymentMethod) ?? null,
          description: v.description ?? null,
          categoryId: v.categoryId ?? null,
          accountId: v.accountId ?? null,
          goalId,
        },
      });

      if (goalId && effect !== 0) {
        await tx.goal.update({
          where: { id: goalId },
          data: { currentAmount: { increment: effect } },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "goal") {
      return { error: translate(locale, "errGoalInvalid") };
    }
    if (err instanceof Error && err.message === "insufficient") {
      return { error: translate(locale, "errGoalInsufficient") };
    }
    return { error: translate(locale, "errValidation") };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/goals");
  revalidatePath("/net-worth");
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

  const old = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    include: { category: { select: { isSavings: true } } },
  });
  if (!old) return { error: translate(locale, "errTxId") };

  let categoryIsSavings = false;
  if (v.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: v.categoryId, userId: session.user.id },
      select: { isSavings: true },
    });
    if (!cat) return { error: translate(locale, "errCategoryInvalid") };
    categoryIsSavings = cat.isSavings;
  }

  const goalId = categoryIsSavings ? (v.goalId ?? null) : null;
  if (goalId) {
    const owned = await goalBelongsToUser(goalId, session.user.id);
    if (!owned) return { error: translate(locale, "errGoalInvalid") };
  }

  if (v.accountId) {
    const owned = await walletBelongsToUser(v.accountId, session.user.id);
    if (!owned) return { error: translate(locale, "errWalletInvalid") };
  }

  const currency = await resolveCurrency(session.user.id);
  const amountMinor = majorToMinor(v.amount, currency);

  const oldEffect = savingsEffect(
    old.type,
    old.amount,
    old.category?.isSavings ?? false
  );
  const newEffect = savingsEffect(
    v.type as TransactionType,
    amountMinor,
    categoryIsSavings
  );

  try {
    await prisma.$transaction(async (tx) => {
      if (old.goalId && oldEffect !== 0) {
        await tx.goal.update({
          where: { id: old.goalId },
          data: { currentAmount: { decrement: oldEffect } },
        });
      }

      if (goalId && newEffect !== 0) {
        const goal = await tx.goal.findFirst({
          where: { id: goalId, userId: session.user.id },
          select: { currentAmount: true },
        });
        if (!goal) throw new Error("goal");
        if (goal.currentAmount + newEffect < 0) throw new Error("insufficient");
        await tx.goal.update({
          where: { id: goalId },
          data: { currentAmount: { increment: newEffect } },
        });
      }

      await tx.transaction.update({
        where: { id, userId: session.user.id },
        data: {
          date: new Date(v.date),
          amount: amountMinor,
          type: v.type as TransactionType,
          method: (v.method as PaymentMethod) ?? null,
          description: v.description ?? null,
          categoryId: v.categoryId ?? null,
          accountId: v.accountId ?? null,
          goalId,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "goal") {
      return { error: translate(locale, "errGoalInvalid") };
    }
    if (err instanceof Error && err.message === "insufficient") {
      return { error: translate(locale, "errGoalInsufficient") };
    }
    return { error: translate(locale, "errValidation") };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/goals");
  revalidatePath("/net-worth");
  await recordNetWorthSnapshot(session.user.id);
  return { success: true };
}

export async function deleteTransactionAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const old = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    include: { category: { select: { isSavings: true } } },
  });
  if (!old) return { error: translate(locale, "errTxId") };

  const effect = savingsEffect(
    old.type,
    old.amount,
    old.category?.isSavings ?? false
  );

  if (old.goalId && effect !== 0) {
    await prisma.$transaction([
      prisma.transaction.delete({ where: { id, userId: session.user.id } }),
      prisma.goal.update({
        where: { id: old.goalId },
        data: { currentAmount: { decrement: effect } },
      }),
    ]);
  } else {
    await prisma.transaction.delete({ where: { id, userId: session.user.id } });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/goals");
  revalidatePath("/net-worth");
  await recordNetWorthSnapshot(session.user.id);
  return { success: true };
}

// Efek transaksi terhadap goal tabungan (minor unit):
// EXPENSE berkategori tabungan = setor (+), INCOME = penarikan (−).
function savingsEffect(
  type: TransactionType,
  amount: number,
  categoryIsSavings: boolean
): number {
  if (!categoryIsSavings) return 0;
  return type === "EXPENSE" ? amount : -amount;
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

// Pastikan tujuan tabungan benar-benar milik pengguna.
async function goalBelongsToUser(
  goalId: string,
  userId: string
): Promise<boolean> {
  const g = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  return g !== null;
}
