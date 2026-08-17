import { z } from "zod/v4";

export const TransactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export const PaymentMethodSchema = z.enum(["CASH", "BANK", "E_WALLET", "CARD"]);

export const TransactionSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  amount: z.coerce
    .number({ error: "Jumlah harus angka" })
    .positive("Jumlah harus lebih besar dari 0"),
  type: TransactionTypeSchema,
  categoryId: z.string().optional(),
  description: z.string().max(500).optional(),
  method: PaymentMethodSchema.optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50),
  type: TransactionTypeSchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  budget: z.coerce
    .number({ error: "Budget harus angka" })
    .nonnegative("Budget tidak boleh negatif")
    .optional(),
});

// Edit kategori: nama/ikon/warna saja (type & budget tidak diubah di sini).
export const CategoryEditSchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const UserSettingsSchema = z.object({
  locale: z.string().min(2),
  currency: z.string().length(3),
  dateFormat: z.string().min(1),
  timeZone: z.string().min(1),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
