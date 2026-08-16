import prisma from "@/lib/prisma";
import {
  TransactionType,
  type Category,
  type Prisma,
} from "@/lib/generated/prisma/client";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export type CategoryWithCounts = Category & {
  _count?: { transactions: number };
};

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

// Idempotent: hanya isi default bila belum ada kategori sama sekali.
export async function ensureDefaultCategories(
  userId: string
): Promise<Category[]> {
  const count = await prisma.category.count({ where: { userId } });
  if (count === 0) {
    const data: Prisma.CategoryCreateManyInput[] = DEFAULT_CATEGORIES.map(
      (c, i) => ({
        userId,
        name: c.name,
        slug: `${c.type.toLowerCase()}-${slugify(c.name)}`,
        type: c.type as TransactionType,
        icon: c.icon,
        color: c.color,
        sortOrder: i,
      })
    );
    await prisma.category.createMany({ data, skipDuplicates: true });
  }
  return listCategories(userId);
}

export async function listCategories(userId: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getCategory(
  id: string,
  userId: string
): Promise<Category | null> {
  return prisma.category.findFirst({ where: { id, userId } });
}

export async function createCategory(data: {
  userId: string;
  name: string;
  slug: string;
  type: TransactionType;
  icon?: string | null;
  color?: string | null;
  budgetMinor?: number | null;
}) {
  return prisma.category.create({
    data: {
      userId: data.userId,
      name: data.name,
      slug: data.slug,
      type: data.type,
      icon: data.icon,
      color: data.color,
      budget: data.budgetMinor,
    },
  });
}

export async function updateCategoryBudget(
  id: string,
  userId: string,
  budgetMinor: number | null
) {
  return prisma.category.update({
    where: { id, userId },
    data: { budget: budgetMinor },
  });
}

export async function deleteCategory(id: string, userId: string) {
  // Jadikan categoryId NULL pada transaksi yang merujuk kategori ini.
  await prisma.transaction.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });
  return prisma.category.delete({ where: { id, userId } });
}
