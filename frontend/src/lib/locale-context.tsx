"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import { dirOf, type Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  /** Prefix a route with the active locale. */
  href: (path: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: dirOf(locale),
      t: getDictionary(locale),
      href: (path: string) => `/${locale}${path.startsWith("/") ? path : `/${path}`}`,
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
