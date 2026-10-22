"use client";

import { Car } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

import { EmptyState, ErrorState } from "@/components/ui/empty";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { clsx } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

/** Viewers are read-only (the server answers 403 to their writes), so writes are hidden for them. */
export function useCanWrite(): boolean {
  const { user } = useAuth();
  return user?.role === "manager" || user?.role === "admin";
}

/** Localised message for a failed write; the server's English detail is never shown. */
export function useActionError() {
  const { t } = useLocale();
  return (cause: unknown): string => {
    const status = cause instanceof ApiError ? cause.status : 0;
    return status === 403 ? t.common.forbidden : status === 429 ? t.auth.rateLimited : t.common.actionFailed;
  };
}

/** Skeleton on first load, retryable error if it never loaded, otherwise the content. */
export function Async({
  state,
  skeleton,
  children,
}: {
  state: { data: unknown; error: string | null; loading: boolean; reload: () => void };
  skeleton: ReactNode;
  children: ReactNode;
}) {
  if (state.data == null && state.loading) return <>{skeleton}</>;
  if (state.data == null && state.error) return <ErrorState compact onRetry={state.reload} />;
  return <>{children}</>;
}

export interface Message {
  tone: "ok" | "error";
  text: string;
}

/** Always-mounted polite live region, so a message appearing in it is announced. */
export function Notice({ message }: { message: Message | null }) {
  return (
    <div role="status" aria-live="polite">
      {message && (
        <p
          className={clsx(
            "rounded-xl px-3.5 py-2.5 text-[13px]",
            message.tone === "ok"
              ? "bg-[var(--good-soft)] text-[var(--good-text)]"
              : "bg-[var(--critical-soft)] text-[var(--critical-text)]",
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export function ViewOnlyBadge() {
  const { t } = useLocale();
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-sunken)] px-3 py-1.5 text-[12px] text-ink-muted">
      {t.common.viewOnly}
    </span>
  );
}

/** A translucent wash of a CSS colour; hex-alpha suffixes do not work on var(). */
export const tint = (color: string, percent = 12) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

/** A brand-new organization owns no vehicles yet: say so, instead of showing blank charts. */
export function EmptyFleet() {
  const { t } = useLocale();
  return (
    <Card>
      <EmptyState icon={<Car className="size-5" />} title={t.common.emptyFleetTitle} lead={t.common.emptyFleetLead} />
    </Card>
  );
}
