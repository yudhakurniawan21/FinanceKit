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

  // Tautan ke kewajiban utang (EXPENSE hanya mengubijes pokok).
  const netWorthItemId = v.type === "EXPENSE" ? (v.netWorthItemId ?? null) : null;
  if (netWorthItemId) {
    const owned = await debtBelongsToUser(netWorthItemId, session.user.id);
    if (!owned) return { error: translate(locale, "errDebtInvalid") };
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
  const debtDelta = debtEffect(v.type as TransactionType, amountMinor);

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
          netWorthItemId,
        },
      });

      if (goalId && effect !== 0) {
        await tx.goal.update({
          where: { id: goalId },
          data: { currentAmount: { increment: effect } },
        });
      }

      if (netWorthItemId && debtDelta > 0) {
        await tx.netWorthItem.update({
          where: { id: netWorthItemId },
          data: { value: { decrement: debtDelta } },
        });
      }
    });
  } catch (err) {
    return catchErrors(err, locale);
  }

  return revalidateAndSnapshot(session.user.id);
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

  const oldNetWorthItemId = old.type === "EXPENSE" ? old.netWorthItemId : null;
  const oldDebtDelta = old.type === "EXPENSE" ? old.amount : 0;
  const netWorthItemId = v.type === "EXPENSE" ? (v.netWorthItemId ?? null) : null;
  const debtDelta = debtEffect(v.type as TransactionType, amountMinor);

  if (netWorthItemId) {
    const owned = await debtBelongsToUser(netWorthItemId, session.user.id);
    if (!owned) return { error: translate(locale, "errDebtInvalid") };
  }

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

      // Kembalikan pengurangan pokok utang pada transaksi lama.
      if (oldNetWorthItemId && oldDebtDelta > 0) {
        await tx.netWorthItem.update({
          where: { id: oldNetWorthItemId },
          data: { value: { increment: oldDebtDelta } },
        });
      }
      // Terapkan pengurangan baru.
      if (netWorthItemId && debtDelta > 0) {
        await tx.netWorthItem.update({
          where: { id: netWorthItemId },
          data: { value: { decrement: debtDelta } },
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
          netWorthItemId,
        },
      });
    });
  } catch (err) {
    return catchErrors(err, locale);
  }

  return revalidateAndSnapshot(session.user.id);
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

  // Kembalikan pokok utang jika transaksi adalah pembayaran cicilan.
  const oldNetWorthItemId = old.type === "EXPENSE" ? old.netWorthItemId : null;
  const oldDebtDelta = old.type === "EXPENSE" ? old.amount : 0;

  await prisma.$transaction(async (tx) => {
    if (old.goalId && effect !== 0) {
      await tx.goal.update({
        where: { id: old.goalId },
        data: { currentAmount: { decrement: effect } },
      });
    }
    if (oldNetWorthItemId && oldDebtDelta > 0) {
      await tx.netWorthItem.update({
        where: { id: oldNetWorthItemId },
        data: { value: { increment: oldDebtDelta } },
      });
    }
    await tx.transaction.delete({ where: { id, userId: session.user.id } });
  });

  return revalidateAndSnapshot(session.user.id);
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

// Pengurangan pokok utang (minor unit): hanya pembayaran EXPENSE mengurangi.
function debtEffect(type: TransactionType, amount: number): number {
  return type === "EXPENSE" ? amount : 0;
}

// Pastikan kewajiban benar-benar milik pengguna dan berjenis LIABILITY.
async function debtBelongsToUser(
  netWorthItemId: string,
  userId: string
): Promise<boolean> {
  const d = await prisma.netWorthItem.findFirst({
    where: { id: netWorthItemId, userId, type: "LIABILITY" },
    select: { id: true },
  });
  return d !== null;
}

function catchErrors(
  err: unknown,
  locale: string | null
): { error?: string; success?: boolean } {
  // Log error asli supaya bukan-FK/kesalahan DB lain tidak tersamarkan
  // oleh pesan validasi generik.
  console.error("[createTransactionAction]", err);
  if (err instanceof Error && err.message === "goal") {
    return { error: translate(locale, "errGoalInvalid") };
  }
  if (err instanceof Error && err.message === "insufficient") {
    return { error: translate(locale, "errGoalInsufficient") };
  }
  return { error: translate(locale, "errValidation") };
}

function revalidateAndSnapshot(userId: string): Promise<{
  error?: string;
  success?: boolean;
}> {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/goals");
  revalidatePath("/net-worth");
  revalidatePath("/tools");
  return recordNetWorthSnapshot(userId).then(() => ({ success: true }));
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
