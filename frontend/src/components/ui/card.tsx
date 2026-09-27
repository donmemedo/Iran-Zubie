import type { ReactNode } from "react";

import { clsx } from "@/lib/format";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={clsx("card", padded && "p-5", className)}>{children}</div>;
}

export function CardHeader({
  title,
  lead,
  action,
  className,
}: {
  title: string;
  lead?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {lead && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
