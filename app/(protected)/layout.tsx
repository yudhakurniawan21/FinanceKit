import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
