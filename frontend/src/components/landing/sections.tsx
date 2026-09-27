"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BellRing,
  Building2,
  Check,
  ChevronDown,
  Gauge,
  Globe2,
  Handshake,
  Lock,
  MapPinned,
  Plug,
  Trophy,
  Truck,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCountUp } from "@/lib/hooks";
import { clsx, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setSeen(true),
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen]);
  return { ref, seen };
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "center" | "start";
}) {
  return (
    <div className={clsx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-[clamp(1.75rem,3.6vw,2.6rem)] font-bold leading-tight tracking-tight text-ink">
        {title}
      </h2>
      {lead && <p className="mt-4 text-[15.5px] leading-[1.85] text-ink-secondary">{lead}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- stats */

function StatValue({ target, suffix }: { target: number; suffix: string }) {
  const { locale } = useLocale();
  const { ref, seen } = useInView<HTMLParagraphElement>();
  const value = useCountUp(target, 1500, seen);
  return (
    <p ref={ref} className="tnum text-[clamp(2rem,4.4vw,2.9rem)] font-bold leading-none text-ink">
      {formatNumber(Math.round(value), locale)}
      <span className="ms-1 text-[0.5em] font-semibold text-[var(--brand)]">{suffix}</span>
    </p>
  );
}

export function StatsBand() {
  const { t } = useLocale();
  const stats = [
    { target: 1775, suffix: "", label: t.landing.stats.vehiclesLabel },
    { target: 23, suffix: "٪", label: t.landing.stats.savingLabel },
    { target: 4, suffix: "h", label: t.landing.stats.responseLabel },
    { target: 99, suffix: "٫۹٪", label: t.landing.stats.uptimeLabel },
  ];

  return (
    <section className="border-y border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8 lg:py-14">
        {stats.map((stat) => (
          <div key={stat.label}>
            <StatValue target={stat.target} suffix={stat.suffix} />
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ features */

const featureIcons = [MapPinned, Wrench, Trophy];

export function Features() {
  const { t } = useLocale();

  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <SectionHeading
        eyebrow={t.nav.features}
        title={t.landing.featuresTitle}
        lead={t.landing.featuresLead}
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {t.landing.features.map((feature, index) => {
          const Icon = featureIcons[index] ?? MapPinned;
          return (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-7 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
            >
              <div
                className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "linear-gradient(90deg,transparent,var(--brand-bright),transparent)" }}
              />
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Icon className="size-6" />
              </div>
              <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-ink">{feature.title}</h3>
              <p className="mt-3 text-[14.5px] leading-[1.85] text-ink-secondary">{feature.body}</p>
              <ul className="mt-5 space-y-2.5 border-t border-[var(--line)] pt-5">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13.5px] text-ink-secondary">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

const secondaryIcons = [Globe2, BellRing, Activity, Plug, Handshake, Lock];

export function SecondaryGrid() {
  const { t } = useLocale();
  return (
    <section className="border-y border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading title={t.landing.secondaryTitle} />
        <div className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {t.landing.secondary.map((item, index) => {
            const Icon = secondaryIcons[index] ?? Activity;
            return (
              <div key={item.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-[var(--brand)]">
                  <Icon className="size-[18px]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.8] text-ink-muted">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- how it works */

export function HowItWorks() {
  const { t } = useLocale();
  const icons = [Plug, Building2, Gauge];

  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <SectionHeading eyebrow={t.nav.howItWorks} title={t.landing.howTitle} />
      <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
        <div
          className="absolute inset-x-[16%] top-[46px] hidden h-px lg:block"
          style={{ background: "linear-gradient(90deg,transparent,var(--line-strong),transparent)" }}
          aria-hidden="true"
        />
        {t.landing.how.map((step, index) => {
          const Icon = icons[index] ?? Plug;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative text-center"
            >
              <div className="mx-auto flex size-[92px] items-center justify-center rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
                <Icon className="size-8 text-[var(--brand)]" />
                <span className="absolute -top-2 flex size-7 items-center justify-center rounded-full bg-[var(--brand)] text-[12px] font-bold text-[var(--brand-ink)] ltr:right-[calc(50%-52px)] rtl:left-[calc(50%-52px)]">
                  {step.step}
                </span>
              </div>
              <h3 className="mt-6 text-[17px] font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="mx-auto mt-3 max-w-xs text-[14px] leading-[1.85] text-ink-secondary">{step.body}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- FAQ */

export function Faq() {
  const { t } = useLocale();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <SectionHeading title={t.landing.faqTitle} />
      <div className="mt-12 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {t.landing.faq.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-start"
                aria-expanded={expanded}
              >
                <span className="text-[15px] font-medium text-ink">{item.q}</span>
                <ChevronDown
                  className={clsx(
                    "size-5 shrink-0 text-ink-muted transition-transform duration-300",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 text-[14px] leading-[1.9] text-ink-secondary">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- trust band */

export function TrustBand() {
  const { t } = useLocale();
  const names = ["پخش سپهر", "لجستیک آریا", "توزیع مهرگان", "سردخانه پارس", "خدمات میدانی رها", "پیک فردا"];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
      <p className="text-center text-[12.5px] text-ink-muted">{t.landing.trustedBy}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {names.map((name) => (
          <span key={name} className="flex items-center gap-2 text-[14px] font-semibold text-ink-muted opacity-70">
            <Truck className="size-4" />
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
