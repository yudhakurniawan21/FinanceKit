import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import type { ReactNode } from "react";

// Layout yang dilindungi — semua route di grup (protected) memakai ini.
// Guard dilakukan di server (SSR) sehingga tidak ada "flash" halaman sebelum
// redirect. Jika belum terautentikasi → ke /sign-in.
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  return (
    <DashboardShell user={user.user} locale={user.settings?.locale ?? null}>
      {children}
    </DashboardShell>
  );
}
