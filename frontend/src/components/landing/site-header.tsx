"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { LocaleToggle, ThemeToggle } from "@/components/ui/toggles";
import { useAuth } from "@/lib/auth";
import { clsx } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";

export function SiteHeader() {
  const { t, href } = useLocale();
  const { status } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { label: t.nav.features, hash: "#features" },
    { label: t.nav.howItWorks, hash: "#how" },
    { label: t.nav.pricing, hash: "#pricing" },
    { label: t.nav.faq, hash: "#faq" },
  ];

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-[var(--glass-line)] glass" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href={href("/")} className="shrink-0">
          <Logo label={t.common.brand} />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.hash}
              href={link.hash}
              className="rounded-lg px-3 py-2 text-[13.5px] text-ink-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LocaleToggle />
            <ThemeToggle />
          </div>
          <ButtonLink
            href={href(status === "authenticated" ? "/app" : "/login")}
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex"
          >
            {status === "authenticated" ? t.nav.dashboard : t.nav.login}
          </ButtonLink>
          <ButtonLink href="#contact" size="sm" className="hidden md:inline-flex">
            {t.nav.requestDemo}
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-ink lg:hidden"
            aria-label={open ? t.common.close : t.nav.product}
            aria-expanded={open}
          >
            {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="glass border-t border-[var(--glass-line)] lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {links.map((link) => (
              <a
                key={link.hash}
                href={link.hash}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] text-ink-secondary hover:bg-[var(--surface-sunken)] hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <LocaleToggle />
              <ThemeToggle />
              <ButtonLink
                href={href(status === "authenticated" ? "/app" : "/login")}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                {status === "authenticated" ? t.nav.dashboard : t.nav.login}
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
