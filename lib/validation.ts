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
  accountId: z.string().optional(),
  goalId: z.string().optional(),
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
  isSavings: z
    .enum(["on", "off"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "on")),
  goalId: z.string().optional(),
});

// Edit kategori: nama/ikon/warna/budget + penanda tabungan saja
// (type tidak diubah di sini).
export const CategoryEditSchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50),
  icon: z.string().optional(),
  color: z.string().optional(),
  budget: z.coerce
    .number({ error: "Budget harus angka" })
    .nonnegative("Budget tidak boleh negatif")
    .optional(),
  isSavings: z
    .enum(["on", "off"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "on")),
});

export const UserSettingsSchema = z.object({
  locale: z.string().min(2),
  currency: z.string().length(3),
  dateFormat: z.string().min(1),
  timeZone: z.string().min(1),
});

export const WalletSchema = z.object({
  name: z.string().min(1, "Nama akun wajib diisi").max(50),
  type: z.enum(["CASH", "BANK", "E_WALLET", "CARD"]),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const TransferSchema = z.object({
  fromAccountId: z.string().min(1, "Akun asal wajib dipilih"),
  toAccountId: z.string().min(1, "Akun tujuan wajib dipilih"),
  amount: z.coerce
    .number({ error: "Jumlah harus angka" })
    .positive("Jumlah harus lebih besar dari 0"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  description: z.string().max(500).optional(),
});

export const RecurringFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);

export const RecurringSchema = z.object({
  description: z.string().min(1, "Deskripsi wajib diisi").max(500),
  amount: z.coerce
    .number({ error: "Jumlah harus angka" })
    .positive("Jumlah harus lebih besar dari 0"),
  type: TransactionTypeSchema,
  frequency: RecurringFrequencySchema,
  categoryId: z.string().optional(),
  method: PaymentMethodSchema.optional(),
  accountId: z.string().optional(),
  startDate: z.string().min(1, "Tanggal wajib diisi"),
});

export const GoalSchema = z.object({
  name: z.string().min(1, "Nama tujuan wajib diisi").max(50),
  targetAmount: z.coerce
    .number({ error: "Target harus angka" })
    .positive("Target harus lebih besar dari 0"),
  deadline: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  // Buat kategori tabungan tertaut secara otomatis (default aktif di UI).
  createCategory: z
    .enum(["on", "off"])
    .optional()
    .transform((v) => v === "on"),
});

export const GoalAdjustSchema = z.object({
  id: z.string().min(1),
  amount: z.coerce
    .number({ error: "Jumlah harus angka" })
    .positive("Jumlah harus lebih besar dari 0"),
  direction: z.enum(["DEPOSIT", "WITHDRAW"]),
});

export const NetWorthItemSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(50),
  type: z.enum(["ASSET", "LIABILITY"]),
  value: z.coerce
    .number({ error: "Nilai harus angka" })
    .nonnegative("Nilai tidak boleh negatif"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
