// Daftar mata uang yang didukung + minor unit (untuk menghindari bug float).
export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  minorUnit: number; // 0 = tanpa desimal (IDR, JPY), 2 = sen (USD, EUR)
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "IDR", name: "Rupiah Indonesia", symbol: "Rp", minorUnit: 0, locale: "id-ID" },
  { code: "USD", name: "Dolar Amerika Serikat", symbol: "$", minorUnit: 2, locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", minorUnit: 2, locale: "de-DE" },
  { code: "GBP", name: "Pound Sterling", symbol: "£", minorUnit: 2, locale: "en-GB" },
  { code: "JPY", name: "Yen Jepang", symbol: "¥", minorUnit: 0, locale: "ja-JP" },
  { code: "AUD", name: "Dolar Australia", symbol: "A$", minorUnit: 2, locale: "en-AU" },
  { code: "CAD", name: "Dolar Kanada", symbol: "C$", minorUnit: 2, locale: "en-CA" },
  { code: "SGD", name: "Dolar Singapura", symbol: "S$", minorUnit: 2, locale: "en-SG" },
  { code: "THB", name: "Baht Thailand", symbol: "฿", minorUnit: 2, locale: "th-TH" },
  { code: "MYR", name: "Ringgit Malaysia", symbol: "RM", minorUnit: 2, locale: "ms-MY" },
];

const _currencyIndex = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
);

export function getCurrencyMeta(code?: string | null): CurrencyMeta {
  return _currencyIndex[code ?? "IDR"] ?? _currencyIndex["IDR"];
}

// Konversi antara minor unit (yang tersimpan di DB) dan major unit (tampilan).
export function minorToMajor(minor: number, currency: string): number {
  const m = getCurrencyMeta(currency).minorUnit;
  return minor / Math.pow(10, m);
}

export function majorToMinor(major: number, currency: string): number {
  const m = getCurrencyMeta(currency).minorUnit;
  return Math.round(major * Math.pow(10, m));
}

// Format uang: input minor unit (cents/rupiah), kembalikan string terformat.
export function formatMoney(
  minor: number,
  currency: string,
  locale?: string
): string {
  const meta = getCurrencyMeta(currency);
  const major = minorToMajor(minor, currency);
  return new Intl.NumberFormat(locale ?? meta.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: meta.minorUnit,
    maximumFractionDigits: meta.minorUnit,
  }).format(major);
}

export function formatNumber(value: number, locale = "id-ID"): string {
  return new Intl.NumberFormat(locale).format(value);
}
