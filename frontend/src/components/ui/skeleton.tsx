"use client";

import { PageBody } from "@/components/dashboard/page-header";
import { clsx } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx("animate-pulse rounded-xl bg-[var(--surface-sunken)]", className)}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={clsx("card space-y-3 p-5", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

/** Route-level fallback: a title row, optional stat tiles, a list card, optional panels. */
export function PageSkeleton({
  stats = 0,
  rows = 0,
  panels = 0,
  fill = false,
}: {
  stats?: number;
  rows?: number;
  panels?: number;
  /** Full-bleed block for the map route. */
  fill?: boolean;
}) {
  const { t } = useLocale();
  const status = { role: "status", "aria-busy": true, "aria-label": t.common.loading } as const;

  if (fill) {
    return (
      <div {...status}>
        <Skeleton className="h-[calc(100dvh-4rem)] rounded-none" />
      </div>
    );
  }

  return (
    <PageBody>
      <div {...status} className="space-y-6">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {stats > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: stats }, (_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}
        {panels > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: panels }, (_, index) => (
              <Skeleton key={index} className="h-56" />
            ))}
          </div>
        )}
        {rows > 0 && (
          <div className="card space-y-2 p-4">
            {Array.from({ length: rows }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        )}
      </div>
    </PageBody>
  );
}
