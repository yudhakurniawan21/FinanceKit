"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Tags,
  BarChart3,
  Wallet,
  RefreshCcw,
  PiggyBank,
  FileChartColumn,
  Scale,
  Calculator,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";

const nav: Array<{
  label: Extract<
    DictKey,
    | "navDashboard"
    | "navTransactions"
    | "navCategories"
    | "navAccounts"
    | "navRecurring"
    | "navGoals"
    | "navReports"
    | "navInsights"
    | "navNetWorth"
    | "navTools"
  >;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match: string;
}> = [
  { label: "navDashboard", href: "/dashboard", icon: LayoutDashboard, match: "/dashboard" },
  { label: "navTransactions", href: "/transactions", icon: ReceiptText, match: "/transactions" },
  { label: "navCategories", href: "/categories", icon: Tags, match: "/categories" },
  { label: "navAccounts", href: "/accounts", icon: Wallet, match: "/accounts" },
  { label: "navRecurring", href: "/recurring", icon: RefreshCcw, match: "/recurring" },
  { label: "navGoals", href: "/goals", icon: PiggyBank, match: "/goals" },
  { label: "navTools", href: "/tools", icon: Calculator, match: "/tools" },
  { label: "navReports", href: "/reports", icon: FileChartColumn, match: "/reports" },
  { label: "navNetWorth", href: "/net-worth", icon: Scale, match: "/net-worth" },
  { label: "navInsights", href: "/insights", icon: BarChart3, match: "/insights" },
];

export function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {nav.map((n) => {
        const active = pathname === n.href || (pathname === "/" && n.href === "/dashboard");
        return (
          <button
            key={n.href}
            type="button"
            onClick={() => {
              router.push(n.href);
              onItemClick?.();
            }}
            className={
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
              (active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
            }
          >
            <n.icon className="h-4 w-4" />
            <span>{t(n.label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
