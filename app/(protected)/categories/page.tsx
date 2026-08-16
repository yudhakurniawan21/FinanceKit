import { getCurrentUser } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/db/categories";
import { CategoryManager } from "@/components/categories/category-manager";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/categories");
  }

  // Seed default bila belum ada (idempoten), lalu kirim ke client.
  const categories = await ensureDefaultCategories(user.user.id);
  const currency = user.settings?.currency ?? "IDR";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">Kategori</h1>
        <p className="text-sm text-muted-foreground">
          Kelola kategori pemasukan & pengeluaran serta anggaran bulanannya.
        </p>
      </div>
      <CategoryManager categories={categories} currency={currency} />
    </div>
  );
}
