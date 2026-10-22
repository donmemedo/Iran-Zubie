import type { ReactNode } from "react";

import { clsx } from "@/lib/format";
import type { Severity, VehicleStatus } from "@/lib/types";

const severityStyles: Record<Severity, string> = {
  good: "bg-[var(--good-soft)] text-[var(--good-text)]",
  warning: "bg-[var(--warning-soft)] text-[var(--ink)]",
  serious: "bg-[var(--serious-soft)] text-[var(--ink)]",
  critical: "bg-[var(--critical-soft)] text-[var(--critical-text)]",
};

const severityDot: Record<Severity, string> = {
  good: "bg-[var(--good)]",
  warning: "bg-[var(--warning)]",
  serious: "bg-[var(--serious)]",
  critical: "bg-[var(--critical)]",
};

/** Status colour never travels alone — every pill carries its label too. */
export function SeverityPill({
  severity,
  label,
  className,
}: {
  severity: Severity;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        severityStyles[severity],
        className,
      )}
    >
      <span className={clsx("size-1.5 rounded-full", severityDot[severity])} />
      {label}
    </span>
  );
}

const statusStyles: Record<VehicleStatus, { dot: string; text: string; bg: string }> = {
  moving: { dot: "bg-[var(--good)]", text: "text-[var(--good-text)]", bg: "bg-[var(--good-soft)]" },
  idle: { dot: "bg-[var(--warning)]", text: "text-ink", bg: "bg-[var(--warning-soft)]" },
  parked: { dot: "bg-[var(--ink-muted)]", text: "text-ink-secondary", bg: "bg-[var(--surface-sunken)]" },
  offline: { dot: "bg-[var(--ink-muted)]", text: "text-ink-muted", bg: "bg-[var(--surface-sunken)]" },
  service: { dot: "bg-[var(--serious)]", text: "text-ink", bg: "bg-[var(--serious-soft)]" },
};

export function StatusPill({
  status,
  label,
  pulse = false,
  className,
}: {
  status: VehicleStatus;
  label: string;
  pulse?: boolean;
  className?: string;
}) {
  const style = statusStyles[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        style.bg,
        style.text,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {pulse && status === "moving" && (
          <span className={clsx("absolute inset-0 rounded-full", style.dot, "animate-[pulse-ring_2.2s_cubic-bezier(0.25,1,0.5,1)_infinite]")} />
        )}
        <span className={clsx("relative size-1.5 rounded-full", style.dot)} />
      </span>
      {label}
    </span>
  );
}

export function Chip({
  children,
  active = false,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={clsx(
        "press touch-target rounded-full px-3.5 py-1.5 text-[13px] font-medium",
        active
          ? "bg-[var(--brand)] text-[var(--brand-ink)]"
          : "bg-[var(--surface-sunken)] text-ink-secondary hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
