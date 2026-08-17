"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GoalSchema, GoalAdjustSchema } from "@/lib/validation";
import { majorToMinor } from "@/lib/currencies";
import { translate } from "@/lib/i18n";
import { slugify } from "@/lib/db/categories";

export async function createGoalAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  const currency = await resolveCurrency(session.user.id);
  const count = await prisma.goal.count({ where: { userId: session.user.id } });

  await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.create({
      data: {
        userId: session.user.id,
        name: v.name,
        targetAmount: majorToMinor(v.targetAmount, currency),
        deadline: v.deadline ? new Date(v.deadline) : null,
        color: v.color ?? null,
        icon: v.icon ?? null,
        sortOrder: count,
      },
    });

    // Toggle (default aktif): goal baru juga membuat kategori tabungan
    // tertaut agar bisa langsung dipakai di dialog transaksi.
    if (v.createCategory) {
      const baseSlug = `expense-${slugify(v.name)}`;
      let slug = baseSlug;
      let i = 1;
      while (
        await tx.category.findFirst({
          where: { userId: session.user.id, slug },
        })
      ) {
        slug = `${baseSlug}-${i++}`;
      }
      await tx.category.create({
        data: {
          userId: session.user.id,
          name: v.name,
          slug,
          type: "EXPENSE",
          icon: v.icon ?? "PiggyBank",
          color: v.color ?? null,
          isSavings: true,
          goalId: goal.id,
        },
      });
    }
  });

  revalidatePath("/goals");
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateGoalAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const id = formData.get("id") as string | null;
  if (!id) return { error: translate(locale, "errGoalInvalid") };

  const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  const currency = await resolveCurrency(session.user.id);
  await prisma.$transaction(async (tx) => {
    await tx.goal.update({
      where: { id, userId: session.user.id },
      data: {
        name: v.name,
        targetAmount: majorToMinor(v.targetAmount, currency),
        deadline: v.deadline ? new Date(v.deadline) : null,
        color: v.color ?? null,
        icon: v.icon ?? null,
      },
    });

    // Sinkronkan nama kategori tabungan yang tertaut ke goal ini.
    await tx.category.updateMany({
      where: { goalId: id, userId: session.user.id },
      data: { name: v.name },
    });
  });

  revalidatePath("/goals");
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function adjustGoalAmountAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  const locale = await resolveLocale(session.user.id);

  const parsed = GoalAdjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(locale, "errValidation") };
  }
  const v = parsed.data;

  const currency = await resolveCurrency(session.user.id);
  const deltaMinor =
    (v.direction === "DEPOSIT" ? 1 : -1) * majorToMinor(v.amount, currency);

  const goal = await prisma.goal.findFirst({
    where: { id: v.id, userId: session.user.id },
    select: { currentAmount: true },
  });
  if (!goal) return { error: translate(locale, "errGoalInvalid") };

  const next = Math.max(0, goal.currentAmount + deltaMinor);
  await prisma.goal.update({
    where: { id: v.id },
    data: { currentAmount: next },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
  return { success: true };
}

export async function deleteGoalAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: translate(null, "errSession") };
  await prisma.$transaction([
    prisma.category.deleteMany({
      where: { goalId: id, userId: session.user.id },
    }),
    prisma.goal.delete({ where: { id, userId: session.user.id } }),
  ]);
  revalidatePath("/goals");
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
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