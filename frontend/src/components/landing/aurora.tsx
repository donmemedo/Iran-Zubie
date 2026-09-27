/** Soft colour wash behind the hero. Purely decorative. */
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{
        maskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent 100%)",
      }}
    >
      <div
        className="absolute -top-40 start-[-10%] size-[560px] rounded-full blur-[110px] animate-[drift_26s_ease-in-out_infinite_alternate]"
        style={{ background: "var(--aurora-1)" }}
      />
      <div
        className="absolute -top-24 end-[-8%] size-[520px] rounded-full blur-[120px] animate-[drift_32s_ease-in-out_infinite_alternate-reverse]"
        style={{ background: "var(--aurora-2)" }}
      />
      <div
        className="absolute top-[45%] start-[35%] size-[420px] rounded-full blur-[130px] animate-[drift_38s_ease-in-out_infinite_alternate]"
        style={{ background: "var(--aurora-3)" }}
      />
    </div>
  );
}
