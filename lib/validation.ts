import { z } from "zod/v4";

// Kolom relasi opsional: "" pada form (select kosong) dipetakan ke null
// supaya tidak lolos sebagai nilai FK non-eksis ("") saat insert/update.
const RelationId = z.string().optional().transform((v) => (v ? v : null));

export const TransactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export const PaymentMethodSchema = z.enum(["CASH", "BANK", "E_WALLET", "CARD"]);

// Klasifikasi 50/30/20: "" = tanpa klasifikasi (dipetakan ke null).
export const BudgetTierSchema = z.union([
  z.enum(["NEEDS", "WANTS", "SAVINGS"]),
  z.literal(""),
]);

export const TransactionSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  amount: z.coerce
    .number({ error: "Jumlah harus angka" })
    .positive("Jumlah harus lebih besar dari 0"),
  type: TransactionTypeSchema,
  categoryId: RelationId,
  description: z.string().max(500).optional(),
  method: PaymentMethodSchema.optional(),
  accountId: RelationId,
  goalId: RelationId,
  netWorthItemId: RelationId,
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
  // Klasifikasi 50/30/20 (opsional; "" = tanpa klasifikasi).
  budgetTier: BudgetTierSchema.optional().transform((v) =>
    v ? v : null
  ),
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
  budgetTier: BudgetTierSchema.optional().transform((v) =>
    v ? v : null
  ),
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
  categoryId: RelationId,
  method: PaymentMethodSchema.optional(),
  accountId: RelationId,
  netWorthItemId: RelationId,
  startDate: z.string().min(1, "Tanggal wajib diisi"),
});

// Prefill dari transaksi → jadwal berulang (tidak ada netWorthItemId/goalId
// karena RecurringSchema sudah menangani semua kolom relasi opsional).
export type RecurringInput = z.infer<typeof RecurringSchema>;

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
  // Ditandai sebagai dana darurat (masuk perhitungan dana darurat).
  isEmergency: z
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
  // Mutasi rekening: catat transaksi otomatis (saldo dompet tercatat).
  linked: z
    .enum(["on", "off"])
    .optional()
    .transform((v) => v === "on"),
  accountId: z.string().optional(),
});

// Sub-tipe kewajiban utang. "" = tanpa klasifikasi (dipetakan ke null).
export const DebtTypeSchema = z.union([
  z.enum(["CREDIT_CARD", "PAYLATER", "MORTGAGE", "VEHICLE", "PERSONAL_LOAN"]),
  z.literal(""),
]);

export const NetWorthItemSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(50),
  type: z.enum(["ASSET", "LIABILITY"]),
  value: z.coerce
    .number({ error: "Nilai harus angka" })
    .nonnegative("Nilai tidak boleh negatif"),
  color: z.string().optional(),
  icon: z.string().optional(),
  // Metadata utang (hanya LIABILITY; opsional).
  debtType: DebtTypeSchema.optional().transform((v) => (v ? v : null)),
  interestRate: z.coerce
    .number({ error: "Bunga harus angka" })
    .min(0)
    .max(100)
    .optional()
    .transform((v) => (v && v > 0 ? v : null)),
  minPayment: z.coerce
    .number({ error: "Cicilan harus angka" })
    .nonnegative("Cicilan tidak boleh negatif")
    .optional(),
  dueDay: z.coerce
    .number({ error: "Tanggal harus angka" })
    .int()
    .min(1)
    .max(31)
    .optional()
    .transform((v) => (v && v >= 1 ? v : null)),
});

export type NetWorthItemInput = z.infer<typeof NetWorthItemSchema>;

export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
