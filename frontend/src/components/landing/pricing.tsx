"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

import { SectionHeading } from "@/components/landing/sections";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx, formatNumber } from "@/lib/format";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";

export function Pricing() {
  const { t, locale } = useLocale();
  const { data: plans, loading } = useApi(() => api.plans(), []);

  return (
    <section id="pricing" className="scroll-mt-24 border-y border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow={t.nav.pricing}
          title={t.landing.pricingTitle}
          lead={t.landing.pricingLead}
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {loading &&
            [0, 1, 2].map((index) => <Skeleton key={index} className="h-[520px] rounded-[var(--radius-panel)]" />)}

          {plans?.map((plan, index) => {
            const name = locale === "fa" ? plan.name_fa : plan.name;
            const audience = locale === "fa" ? plan.audience_fa : plan.audience;
            const unit = locale === "fa" ? plan.unit_fa : plan.unit;
            const features = locale === "fa" ? plan.features_fa : plan.features;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={clsx(
                  "relative flex flex-col rounded-[var(--radius-panel)] border p-7 transition-shadow duration-300",
                  plan.popular
                    ? "border-[var(--brand)] bg-[var(--plane)] shadow-[var(--shadow-brand)] lg:-my-3 lg:py-10"
                    : "border-[var(--line)] bg-[var(--plane)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-float)]",
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1 text-[11px] font-semibold text-[var(--brand-ink)] ltr:left-7 rtl:right-7">
                    <Sparkles className="size-3" />
                    {t.landing.pricingPopular}
                  </span>
                )}

                <h3 className="text-[19px] font-semibold tracking-tight text-ink">{name}</h3>
                <p className="mt-1.5 text-[13px] text-ink-muted">{audience}</p>

                <div className="mt-6 flex items-baseline gap-2">
                  {plan.price_toman > 0 ? (
                    <>
                      <span className="tnum text-[34px] font-bold leading-none tracking-tight text-ink">
                        {formatNumber(plan.price_toman, locale)}
                      </span>
                      <span className="text-[13px] text-ink-muted">{t.common.toman}</span>
                    </>
                  ) : (
                    <span className="text-[26px] font-bold leading-none tracking-tight text-ink">
                      {t.landing.pricingCustom}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[12.5px] text-ink-muted">{unit}</p>

                <ul className="mt-7 flex-1 space-y-3 border-t border-[var(--line)] pt-7">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <ButtonLink
                  href="#contact"
                  variant={plan.popular ? "primary" : "secondary"}
                  className="mt-8 w-full"
                >
                  {plan.price_toman > 0 ? t.landing.pricingCta : t.landing.pricingContact}
                </ButtonLink>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[12.5px] text-ink-muted">{t.landing.pricingNote}</p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- lead form */

export function LeadForm() {
  const { t } = useLocale();

  return (
    <section id="contact" className="relative scroll-mt-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="start"
              eyebrow={t.nav.contact}
              title={t.landing.ctaTitle}
              lead={t.landing.ctaLead}
            />
            <ul className="mt-8 space-y-3.5">
              {t.landing.features.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3 text-[14px] text-ink-secondary">
                  <Check className="mt-0.5 size-[18px] shrink-0 text-[var(--accent)]" />
                  {feature.title}
                </li>
              ))}
            </ul>
          </div>

          <LeadFormCard />
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-[14px] " +
  "text-ink placeholder:text-ink-muted transition-colors focus:border-[var(--brand)] focus:outline-none";

function LeadFormCard() {
  const { t } = useLocale();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    phone: "",
    email: "",
    fleet_size: 10,
    message: "",
  });

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({
      ...current,
      [key]: key === "fleet_size" ? Number(event.target.value) : event.target.value,
    }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    try {
      await api.createLead(form);
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)] sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.landing.form.company}>
          <input required value={form.company} onChange={update("company")} className={inputClass} />
        </Field>
        <Field label={t.landing.form.contact}>
          <input required value={form.contact_name} onChange={update("contact_name")} className={inputClass} />
        </Field>
        <Field label={t.landing.form.phone}>
          <input
            required
            value={form.phone}
            onChange={update("phone")}
            inputMode="tel"
            className={`${inputClass} tnum`}
            style={{ direction: "ltr" }}
          />
        </Field>
        <Field label={t.landing.form.fleetSize}>
          <input
            type="number"
            min={1}
            value={form.fleet_size}
            onChange={update("fleet_size")}
            className={`${inputClass} tnum`}
            style={{ direction: "ltr" }}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.landing.form.email}>
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              className={inputClass}
              style={{ direction: "ltr" }}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t.landing.form.message}>
            <textarea rows={3} value={form.message} onChange={update("message")} className={`${inputClass} resize-none`} />
          </Field>
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={state === "sending" || state === "done"}>
        {state === "sending" ? t.landing.form.sending : t.landing.form.submit}
      </Button>

      {state === "done" && (
        <p className="mt-4 rounded-xl bg-[var(--good-soft)] px-3.5 py-2.5 text-[13px] text-[var(--good-text)]">
          {t.landing.form.success}
        </p>
      )}
      {state === "error" && (
        <p className="mt-4 rounded-xl bg-[var(--critical-soft)] px-3.5 py-2.5 text-[13px] text-[var(--critical-text)]">
          {t.landing.form.error}
        </p>
      )}
    </form>
  );
}
