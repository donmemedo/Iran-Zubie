import { clsx } from "@/lib/format";

/**
 * The mark is the Zubie key: a rounded OBD connector with a signal arc,
 * which doubles as a location pin at small sizes.
 */
export function ZubieMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="zubie-mark" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-bright)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#zubie-mark)" />
      <path
        d="M11 11.5h10L13 20.5h8"
        stroke="var(--brand-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="13" stroke="url(#zubie-mark)" strokeOpacity="0.35" strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({
  className,
  label,
  compact = false,
}: {
  className?: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <span className={clsx("flex items-center gap-2.5", className)}>
      <ZubieMark size={compact ? 28 : 32} />
      {!compact && <span className="text-[17px] font-semibold tracking-title">{label}</span>}
    </span>
  );
}
