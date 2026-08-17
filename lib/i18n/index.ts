import { DICTIONARIES, type DictKey } from "./dictionaries";
import { LOCALES } from "@/lib/constants";

export type Locale = (typeof LOCALES)[number]["value"];

const DEFAULT_LOCALE: Locale = "id-ID";

export function resolveLocale(locale?: string | null): Locale {
  if (locale && (DICTIONARIES[locale] || LOCALES.some((l) => l.value === locale))) {
    return locale as Locale;
  }
  return DEFAULT_LOCALE;
}

// Kode bahasa pendek untuk Intl.NumberFormat / Intl.DateTimeFormat.
export function langCode(locale?: string | null): string {
  const resolved = resolveLocale(locale);
  if (resolved === "en-GB") return "en-GB";
  return resolved.split("-")[0] ?? "id";
}

export function translate(
  locale: string | null | undefined,
  key: DictKey,
  vars?: Record<string, string | number>
): string {
  const dict = DICTIONARIES[resolveLocale(locale)] ?? DICTIONARIES[DEFAULT_LOCALE];
  let text: string = dict[key] ?? DICTIONARIES[DEFAULT_LOCALE][key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function createTranslator(locale: string | null | undefined) {
  return (key: DictKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
}

export type Translator = ReturnType<typeof createTranslator>;