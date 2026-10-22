"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Gauge, MapPinned, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Aurora } from "@/components/landing/aurora";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { LocaleToggle, ThemeToggle } from "@/components/ui/toggles";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { clsx } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

const DEMO = { email: "demo@zubie.ir", password: "zubie1234" };
// The demo account and its password are only offered while developing; a production
// build starts with empty fields and never prints credentials on the page.
const SHOW_DEMO = process.env.NODE_ENV === "development";

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-[14px] " +
  "text-ink placeholder:text-ink-muted transition-colors focus:border-[var(--brand)] focus:outline-none";

export function LoginView() {
  const { t, locale, href } = useLocale();
  const { login, register, status } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(SHOW_DEMO ? DEMO.email : "");
  const [password, setPassword] = useState(SHOW_DEMO ? DEMO.password : "");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace(href("/app"));
  }, [status, router, href]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ email, password, full_name: fullName, company });
      }
      router.replace(href("/app"));
    } catch (cause) {
      const status = cause instanceof ApiError ? cause.status : 0;
      // Localised messages only: the server's English detail text is never shown.
      setError(
        status === 401
          ? t.auth.wrongPassword
          : status === 429
            ? t.auth.rateLimited
            : status === 409
              ? t.auth.emailTaken
              : status === 422
                ? t.auth.passwordHint
                : t.common.actionFailed,
      );
    } finally {
      setBusy(false);
    }
  };

  const Arrow = locale === "fa" ? ArrowLeft : ArrowRight;
  const highlights = [
    { icon: MapPinned, text: t.landing.features[0].title },
    { icon: Gauge, text: t.landing.features[1].title },
    { icon: Trophy, text: t.landing.features[2].title },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col lg:flex-row">
      {/* form side */}
      <div className="relative flex flex-1 flex-col px-5 py-6 sm:px-8 lg:px-14">
        <Aurora className="lg:hidden" />

        <div className="relative flex items-center justify-between">
          <Link href={href("/")} className="inline-flex items-center gap-2 text-ink">
            <Logo label={t.common.brand} />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px]"
          >
            <h1 className="text-[28px] font-bold tracking-tight text-ink">
              {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              {mode === "login" ? t.auth.loginLead : t.auth.registerLead}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              {mode === "register" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                      {t.auth.fullName}
                    </span>
                    <input
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                      {t.auth.company}
                    </span>
                    <input
                      required
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                  {t.auth.email}
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  style={{ direction: "ltr" }}
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                  {t.auth.password}
                </span>
                <div className="relative">
                  <input
                    required
                    type={reveal ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={clsx(inputClass, "pe-11")}
                    minLength={mode === "register" ? 10 : undefined}
                    maxLength={72}
                    aria-describedby={mode === "register" ? "password-hint" : undefined}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((value) => !value)}
                    className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-ink-muted hover:text-ink"
                    aria-label={t.auth.password}
                    aria-pressed={reveal}
                  >
                    {reveal ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
                {mode === "register" && (
                  <span id="password-hint" className="mt-1.5 block text-[12px] text-ink-muted">
                    {t.auth.passwordHint}
                  </span>
                )}
              </label>

              {error && (
                <p role="alert" className="rounded-xl bg-[var(--critical-soft)] px-3.5 py-2.5 text-[13px] text-[var(--critical-text)]">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? t.common.loading : mode === "login" ? t.auth.submitLogin : t.auth.submitRegister}
                {!busy && <Arrow className="size-4" />}
              </Button>
            </form>

            {SHOW_DEMO && (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{t.auth.demoTitle}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{t.auth.demoHint}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setMode("login");
                    setEmail(DEMO.email);
                    setPassword(DEMO.password);
                  }}
                >
                  {t.auth.demoFill}
                </Button>
              </div>
              <p className="tnum mt-3 text-[12px] text-ink-muted" style={{ direction: "ltr" }}>
                {DEMO.email} · {DEMO.password}
              </p>
            </div>
            )}

            <p className="mt-6 text-center text-[13px] text-ink-muted">
              {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                }}
                className="font-medium text-[var(--brand)] hover:underline"
              >
                {mode === "login" ? t.auth.goRegister : t.auth.goLogin}
              </button>
            </p>
          </motion.div>
        </div>

        <Link
          href={href("/")}
          className="relative mx-auto text-[12.5px] text-ink-muted transition-colors hover:text-ink"
        >
          {t.auth.backHome}
        </Link>
      </div>

      {/* marketing side */}
      <div className="relative hidden w-[46%] max-w-[620px] overflow-hidden border-s border-[var(--line)] bg-[var(--surface)] lg:block">
        <Aurora />
        <div className="grid-texture absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <h2 className="text-[30px] font-bold leading-tight tracking-tight text-ink">
            {t.auth.marketingTitle}
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-[1.9] text-ink-secondary">
            {t.auth.marketingBody}
          </p>

          <ul className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--plane)] text-[var(--brand)]">
                  <Icon className="size-5" />
                </span>
                <span className="text-[14.5px] text-ink">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
