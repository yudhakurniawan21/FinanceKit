"use client";

import { createContext, useContext, useMemo } from "react";
import { resolveLocale, translate, type Locale } from "./index";
import { type DictKey } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "id-ID",
  t: (key) => key,
});

export function I18nProvider({
  locale,
  children,
}: {
  locale?: string | null;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const resolved = resolveLocale(locale);
    return {
      locale: resolved,
      t: (key, vars) => translate(resolved, key, vars),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}