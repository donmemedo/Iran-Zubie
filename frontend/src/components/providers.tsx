"use client";

import type { ReactNode } from "react";

import { ServiceWorkerRegistrar } from "@/components/service-worker";
import { AuthProvider } from "@/lib/auth";
import { LocaleProvider } from "@/lib/locale-context";
import { ThemeProvider } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider locale={locale}>
        <AuthProvider>
          <ServiceWorkerRegistrar />
          {children}
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
