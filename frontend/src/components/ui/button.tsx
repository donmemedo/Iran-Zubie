"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { clsx } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "glass";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 " +
  "active:scale-[0.975] disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-ink)] shadow-[var(--shadow-brand)] hover:bg-[var(--brand-bright)] hover:-translate-y-px",
  secondary:
    "bg-[var(--surface)] text-ink border border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)] shadow-[var(--shadow-sm)]",
  ghost: "text-[var(--ink-secondary)] hover:text-ink hover:bg-[var(--surface-sunken)]",
  danger: "bg-[var(--critical)] text-white hover:brightness-110",
  glass: "glass text-ink hover:bg-[var(--surface-raised)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={clsx(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}
