"use client";

import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

export function EmptyState({
  icon,
  title,
  lead,
  action,
}: {
  icon?: ReactNode;
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && (
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-sunken)] text-ink-muted"
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {lead && <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">{lead}</p>}
      {action}
    </div>
  );
}

/** A failed load. Always offers a retry; the raw server message is not shown. */
export function ErrorState({ onRetry, compact = false }: { onRetry?: () => void; compact?: boolean }) {
  const { t } = useLocale();
  return (
    <div
      role="alert"
      className={clsx(
        "flex flex-col items-center justify-center gap-3 px-6 text-center",
        compact ? "py-8" : "py-14",
      )}
    >
      <div
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-2xl bg-[var(--critical-soft)] text-[var(--critical-text)]"
      >
        <TriangleAlert className="size-5" />
      </div>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-secondary">{t.common.loadError}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}
