import type { ReactNode } from "react";

export function EmptyState({ icon, title, lead }: { icon?: ReactNode; title: string; lead?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-sunken)] text-ink-muted">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {lead && <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">{lead}</p>}
    </div>
  );
}
