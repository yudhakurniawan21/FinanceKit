"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NetWorthItemSchema } from "@/lib/validation";
import { majorToMinor } from "@/lib/currencies";
import { translate } from "@/lib/i18n";
import { recordNetWorthSnapshot } from "@/lib/db/net-worth";

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

export async function createNetWorthItemAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = NetWorthItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  const currency = await resolveCurrency(session.user.id);
  const count = await prisma.netWorthItem.count({
    where: { userId: session.user.id },
  });

  await prisma.netWorthItem.create({
    data: {
      userId: session.user.id,
      name: v.name,
      type: v.type,
      value: majorToMinor(v.value, currency),
      color: v.color ?? null,
      icon: v.icon ?? null,
      sortOrder: count,
    },
  });

  await recordNetWorthSnapshot(session.user.id);
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateNetWorthItemAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const id = formData.get("id") as string | null;
  if (!id) return { error: translate(locale, "errNetWorthInvalid") };

  const parsed = NetWorthItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  const currency = await resolveCurrency(session.user.id);
  await prisma.netWorthItem.update({
    where: { id, userId: session.user.id },
    data: {
      name: v.name,
      type: v.type,
      value: majorToMinor(v.value, currency),
      color: v.color ?? null,
      icon: v.icon ?? null,
    },
  });

  await recordNetWorthSnapshot(session.user.id);
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteNetWorthItemAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  await prisma.netWorthItem.delete({ where: { id, userId: session.user.id } });

  await recordNetWorthSnapshot(session.user.id);
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
  return { success: true };
}