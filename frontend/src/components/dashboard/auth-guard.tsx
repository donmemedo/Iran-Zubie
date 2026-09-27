"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ZubieMark } from "@/components/ui/logo";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const { href, t } = useLocale();

  useEffect(() => {
    if (status === "anonymous") router.replace(href("/login"));
  }, [status, router, href]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--plane)]">
        <ZubieMark size={44} className="animate-pulse" />
        <p className="text-[13px] text-ink-muted">{t.common.loading}</p>
      </div>
    );
  }

  return <>{children}</>;
}
