"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserSettingsSchema } from "@/lib/validation";
import { translate } from "@/lib/i18n";

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
    return { error: translate(null, "errSessionLogin") };
  }

  const parsed = UserSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: translate(null, "errSettingsInvalid") };
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

export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return { error: translate(null, "errSessionLogin") };
  }

  // Konfirmasi ketik email (dicek lagi di server, bukan hanya UI).
  const typed = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  const expected = (session.user.email ?? "").trim().toLowerCase();
  if (!expected || typed !== expected) {
    return { error: translate(null, "errEmailMismatch") };
  }

  try {
    await auth.api.deleteUser({
      headers: await headers(),
      body: {},
    });
  } catch (err) {
    console.error("deleteAccountAction failed", err);
    return { error: translate(null, "errDeleteAccount") };
  }

  revalidatePath("/");
  return { success: true };
}
