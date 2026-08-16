import { type LucideIcon } from "lucide-react";
import {
  Wallet,
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Heart,
  Receipt,
  PiggyBank,
  Gift,
  Book,
  Music,
  Smartphone,
  Plane,
  GraduationCap,
  BriefcaseBusiness,
  Plus,
} from "lucide-react";

export const LOCALES = [
  { value: "id-ID", label: "Bahasa Indonesia" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "de-DE", label: "Deutsch" },
] as const;

export const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
  { value: "MM/dd/yyyy", label: "MM/DD/YYYY" },
  { value: "dd MMMM yyyy", label: "DD Bulan YYYY" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD" },
] as const;

export const TIMEZONES = [
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (ICT)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "Europe/London", label: "Europe/London" },
] as const;

// Ikon kategori default — dipakai di picker ikon kategori.
export const CATEGORY_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "Wallet", icon: Wallet },
  { name: "PiggyBank", icon: PiggyBank },
  { name: "Utensils", icon: Utensils },
  { name: "Car", icon: Car },
  { name: "Home", icon: Home },
  { name: "ShoppingCart", icon: ShoppingCart },
  { name: "Receipt", icon: Receipt },
  { name: "Heart", icon: Heart },
  { name: "Music", icon: Music },
  { name: "Smartphone", icon: Smartphone },
  { name: "Plane", icon: Plane },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "BriefcaseBusiness", icon: BriefcaseBusiness },
  { name: "Gift", icon: Gift },
  { name: "Book", icon: Book },
  { name: "Plus", icon: Plus },
];

export const DEFAULT_CATEGORIES = [
  { name: "Gaji", type: "INCOME" as const, icon: "Wallet", color: "#2ead4b" },
  { name: "Bonus", type: "INCOME" as const, icon: "PiggyBank", color: "#9fe870" },
  { name: "Lainnya", type: "INCOME" as const, icon: "Plus", color: "#38c8ff" },
  { name: "Makanan & Minum", type: "EXPENSE" as const, icon: "Utensils", color: "#f97316" },
  { name: "Transportasi", type: "EXPENSE" as const, icon: "Car", color: "#38c8ff" },
  { name: "Belanja", type: "EXPENSE" as const, icon: "ShoppingCart", color: "#6366f1" },
  { name: "Hiburan", type: "EXPENSE" as const, icon: "Music", color: "#ffd11a" },
  { name: "Kesehatan", type: "EXPENSE" as const, icon: "Heart", color: "#d03238" },
  { name: "Tagihan", type: "EXPENSE" as const, icon: "Receipt", color: "#454745" },
  { name: "Sewa/Rumah", type: "EXPENSE" as const, icon: "Home", color: "#2ead4b" },
  { name: "Pendidikan", type: "EXPENSE" as const, icon: "GraduationCap", color: "#9fe870" },
  { name: "Lainnya", type: "EXPENSE" as const, icon: "Plus", color: "#454745" },
] as const;
