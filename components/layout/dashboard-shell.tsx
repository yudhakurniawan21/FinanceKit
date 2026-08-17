"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LogOut, Menu, Settings } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { I18nProvider, useI18n } from "@/lib/i18n/client";

// Tipe pengguna minimal yang diterima dari server layout.
interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null | undefined;
}

export default function DashboardShell({
  user,
  locale,
  children,
}: {
  user: AuthUser;
  locale?: string | null;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider locale={locale}>
      <ShellContent user={user}>{children}</ShellContent>
    </I18nProvider>
  );
}

function ShellContent({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName = user?.name?.split(" ")[0] ?? user?.email ?? t("account");
  const avatarInitial = user?.name?.[0] ?? user?.email?.[0] ?? "A";

  async function handleLogout() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 border-r bg-muted/30 md:sticky md:top-0 md:block md:h-dvh md:overflow-y-auto">
        <div className="flex h-14 items-center border-b px-4">
          <Logo />
        </div>
        <SidebarNav />
      </aside>

      <div className="flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/80 backdrop-blur px-4 shadow-sm sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("menuOpen")}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Logo className="md:hidden" markClassName="h-6 w-6" />

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />

            {/* Mobile: avatar membuka bottom sheet */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label={t("account")}
              className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback>{avatarInitial}</AvatarFallback>
              </Avatar>
            </button>

            {/* Desktop: dropdown biasa */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-within:ring-2 focus-within:ring-ring">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image ?? undefined} />
                    <AvatarFallback>{avatarInitial}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{displayName}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("navSettings")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Menu profil mobile (bottom sheet) */}
            <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
              <SheetContent
                side="bottom"
                className="gap-0 rounded-t-2xl p-0 pb-2"
              >
                <SheetHeader className="border-b p-4">
                  <SheetTitle className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.image ?? undefined} />
                      <AvatarFallback>{avatarInitial}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold">
                        {displayName}
                      </p>
                      <p className="truncate text-xs font-normal text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Settings className="h-4 w-4" />
                    {t("navSettings")}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("logout")}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Mobile sidebar drawer (terkontrol via drawerOpen) */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>
                <Logo markClassName="h-6 w-6" />
              </SheetTitle>
            </SheetHeader>
            <SidebarNav onItemClick={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-y-auto bg-muted pb-6 min-h-[calc(100dvh-theme(spacing.14))]">{children}</main>
      </div>
    </div>
  );
}
