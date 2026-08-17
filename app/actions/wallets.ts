"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { WalletSchema, TransferSchema } from "@/lib/validation";
import { majorToMinor } from "@/lib/currencies";
import { translate } from "@/lib/i18n";
import { WalletType } from "@/lib/generated/prisma/client";

export async function createWalletAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = WalletSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  const count = await prisma.wallet.count({ where: { userId: session.user.id } });
  await prisma.wallet.create({
    data: {
      userId: session.user.id,
      name: v.name,
      type: v.type as WalletType,
      icon: v.icon ?? null,
      color: v.color ?? null,
      isDefault: count === 0,
      sortOrder: count,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateWalletAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const id = formData.get("id") as string | null;
  if (!id) return { error: translate(locale, "errWalletInvalid") };

  const parsed = WalletSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  await prisma.wallet.update({
    where: { id, userId: session.user.id },
    data: {
      name: v.name,
      type: v.type as WalletType,
      icon: v.icon ?? null,
      color: v.color ?? null,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteWalletAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };

  // Transfer yang melibatkan akun ini dihapus lebih dulu (FK Restrict).
  await prisma.$transaction([
    prisma.transfer.deleteMany({
      where: {
        userId: session.user.id,
        OR: [{ fromAccountId: id }, { toAccountId: id }],
      },
    }),
    prisma.wallet.delete({ where: { id, userId: session.user.id } }),
  ]);

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createTransferAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = TransferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  if (v.fromAccountId === v.toAccountId) {
    return { error: translate(locale, "errSameWallet") };
  }

  const owned = await Promise.all([
    prisma.wallet.findFirst({
      where: { id: v.fromAccountId, userId: session.user.id },
      select: { id: true },
    }),
    prisma.wallet.findFirst({
      where: { id: v.toAccountId, userId: session.user.id },
      select: { id: true },
    }),
  ]);
  if (!owned[0] || !owned[1]) {
    return { error: translate(locale, "errWalletInvalid") };
  }

  const currency = await resolveCurrency(session.user.id);
  const amountMinor = majorToMinor(v.amount, currency);

  await prisma.transfer.create({
    data: {
      userId: session.user.id,
      fromAccountId: v.fromAccountId,
      toAccountId: v.toAccountId,
      amount: amountMinor,
      date: new Date(v.date),
      description: v.description ?? null,
    },
  });

  revalidatePath("/accounts");
  return { success: true };
}

export async function deleteTransferAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  await prisma.transfer.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/accounts");
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