"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserSettingsSchema } from "@/lib/validation";

export type SettingsState = {
  success?: boolean;
  error?: string;
} | null;

export async function upsertUserSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Sesi tidak ditemukan. Silakan masuk kembali." };
  }

  const parsed = UserSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Data pengaturan tidak valid. Periksa kembali." };
  }

  const data = parsed.data;
  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      locale: data.locale,
      currency: data.currency,
      dateFormat: data.dateFormat,
      timeZone: data.timeZone,
    },
    update: {
      locale: data.locale,
      currency: data.currency,
      dateFormat: data.dateFormat,
      timeZone: data.timeZone,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export type DeleteAccountState = {
  success?: boolean;
  error?: string;
} | null;

export async function deleteAccountAction(): Promise<DeleteAccountState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Sesi tidak ditemukan. Silakan masuk kembali." };
  }

  try {
    await auth.api.deleteUser({
      headers: await headers(),
      body: {},
    });
  } catch (err) {
    console.error("deleteAccountAction failed", err);
    return { error: "Gagal menghapus akun. Coba lagi." };
  }

  revalidatePath("/");
  return { success: true };
}
