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
import { LogOut, Menu } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// Tipe pengguna minimal yang diterima dari server layout.
interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null | undefined;
}

export default function DashboardShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const displayName = user?.name?.split(" ")[0] ?? user?.email ?? "Akun";
  const avatarInitial = user?.name?.[0] ?? user?.email?.[0] ?? "A";

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 border-r bg-muted/30 md:block">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          FinansialKit
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
            aria-label="Buka menu navigasi"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <span className="font-semibold md:hidden">FinansialKit</span>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <DropdownMenu>
              {/* Base UI Trigger render <button> — tidak pakai asChild */}
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-within:ring-2 focus-within:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image ?? undefined} />
                  <AvatarFallback>{avatarInitial}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline-block">
                  {displayName}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => {
                    await signOut();
                    router.push("/sign-in");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile sidebar drawer (terkontrol via drawerOpen) */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>FinansialKit</SheetTitle>
            </SheetHeader>
            <SidebarNav onItemClick={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-y-auto bg-muted pb-6 min-h-[calc(100dvh-theme(spacing.14))]">{children}</main>
      </div>
    </div>
  );
}
