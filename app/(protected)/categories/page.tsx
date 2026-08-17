import { getCurrentUser } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/db/categories";
import { monthSpentByCategory } from "@/lib/db/transactions";
import { monthBounds } from "@/lib/formatting";
import { CategoryManager } from "@/components/categories/category-manager";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/categories");
  }

  // Seed default bila belum ada (idempoten), lalu kirim ke client.
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const { start: mStart, end: mEnd } = monthBounds(new Date(), timeZone);

  const [categories, spentByCategory] = await Promise.all([
    ensureDefaultCategories(user.user.id),
    monthSpentByCategory(user.user.id, mStart, mEnd),
  ]);

  const currency = user.settings?.currency ?? "IDR";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("categoriesTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("catPageDesc")}
        </p>
      </div>
      <CategoryManager
        categories={categories}
        currency={currency}
        spentByCategory={spentByCategory}
      />
    </div>
  );
}
