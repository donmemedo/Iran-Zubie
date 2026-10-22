import type { ReactNode } from "react";

export function PageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-display tracking-display text-ink sm:text-[26px]">{title}</h1>
        {lead && <p className="mt-1.5 text-pretty text-[13.5px] leading-relaxed text-ink-muted">{lead}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">{children}</div>;
}
