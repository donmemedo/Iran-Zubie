"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, Menu, Radio, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { CommandPalette } from "@/components/dashboard/command-palette";
import { isActive, navItems } from "@/components/dashboard/nav";
import { Logo } from "@/components/ui/logo";
import { fade, spring } from "@/components/ui/motion";
import { LocaleToggle, ThemeToggle } from "@/components/ui/toggles";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import { useAuth } from "@/lib/auth";
import { clsx } from "@/lib/format";
import { useTelemetryStatus } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { t, locale, dir, href } = useLocale();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  // Only the connection flag: the full telemetry context ticks every couple of
  // seconds and would re-render the whole chrome with it.
  const { connected } = useTelemetryStatus();
  const reduce = useReducedMotion();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const drawerRef = useFocusTrap<HTMLElement>(drawer, () => setDrawer(false));

  const current = pathname.replace(/^\/(fa|en)/, "") || "/";

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDrawer(false);
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t.dash.greetingMorning;
    if (hour < 17) return t.dash.greetingAfternoon;
    if (hour < 21) return t.dash.greetingEvening;
    return t.dash.greetingNight;
  })();

  const displayName = locale === "fa" ? user?.full_name_fa || user?.full_name : user?.full_name;
  const orgName = locale === "fa" ? user?.organization.name_fa : user?.organization.name;

  // The drawer leaves from the start edge: left in LTR, right in RTL.
  const offscreen = reduce ? "0%" : dir === "rtl" ? "100%" : "-100%";
  const hidden = { x: offscreen, opacity: reduce ? 0 : 1 };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href={href("/app")} className="press">
          <Logo label={t.common.brand} />
        </Link>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="press inline-flex size-11 items-center justify-center rounded-xl text-ink-muted hover:text-ink lg:hidden"
          aria-label={t.common.close}
        >
          <X className="size-5" />
        </button>
      </div>

      <nav aria-label={t.dash.navLabel} className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const active = isActive(item, current);
          return (
            <Link
              key={item.path}
              href={href(item.path)}
              aria-current={active ? "page" : undefined}
              data-autofocus={active || undefined}
              className={clsx(
                "press touch-target group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px]",
                active
                  ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                  : "text-ink-secondary hover:bg-[var(--surface-sunken)] hover:text-ink",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-[var(--brand)]"
                />
              )}
              <item.icon className="size-[18px] shrink-0" />
              {item.label(t)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[13px] font-semibold text-[var(--brand-ink)]"
          >
            {initials(displayName ?? "?")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{displayName}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{orgName}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="press inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:text-[var(--critical-text)]"
            aria-label={t.dash.logout}
            title={t.dash.logout}
          >
            <LogOut className="size-[18px] rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-[var(--plane)]">
      <a
        href="#main"
        className="fixed start-3 top-3 z-[80] -translate-y-20 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-[13px] font-medium text-[var(--brand-ink)] focus:translate-y-0"
      >
        {t.common.skipToContent}
      </a>

      {/* desktop sidebar */}
      <aside className="chrome sticky top-0 hidden h-dvh w-64 shrink-0 border-e border-[var(--glass-line)] [--chrome-tint:var(--surface)] lg:block">
        {sidebar}
      </aside>

      {/* mobile drawer: springs in from the start edge, leaves the same way */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="scrim absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              onClick={() => setDrawer(false)}
              aria-hidden="true"
            />
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={t.dash.navLabel}
              tabIndex={-1}
              initial={hidden}
              animate={{ x: "0%", opacity: 1 }}
              exit={hidden}
              transition={reduce ? fade : spring}
              className="chrome absolute inset-y-0 start-0 w-[min(288px,84vw)] border-e border-[var(--glass-line)] shadow-[var(--shadow-pop)] [--chrome-tint:var(--surface)]"
            >
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="chrome edge-top sticky top-0 z-40">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="press inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-ink lg:hidden"
              aria-label={t.dash.openMenu}
              aria-haspopup="dialog"
              aria-expanded={drawer}
            >
              <Menu className="size-[18px]" />
            </button>

            <div className="hidden min-w-0 md:block">
              <p className="truncate text-[13px] text-ink-muted">
                {greeting}
                {displayName ? `${locale === "fa" ? "، " : ", "}${displayName}` : ""}
              </p>
              <p className="truncate text-[14px] font-semibold text-ink">
                {t.dash.fleetOf} {orgName}
              </p>
            </div>

            <button
              ref={paletteTrigger}
              type="button"
              onClick={() => setPalette(true)}
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
              className="press ms-auto flex h-11 max-w-[320px] flex-1 items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 text-[13px] text-ink-muted hover:border-[var(--line-strong)] sm:w-[280px] sm:flex-none"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">{t.dash.commandHint}</span>
              <kbd className="ms-auto hidden rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] sm:block">
                ⌘K
              </kbd>
            </button>

            {/* Live region: always mounted so connection changes are announced; the
                label is visually hidden on phones where the header is tight. */}
            <span role="status" aria-live="polite" className="sr-only sm:not-sr-only">
              <span
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  connected
                    ? "bg-[var(--good-soft)] text-[var(--good-text)]"
                    : "bg-[var(--warning-soft)] text-ink",
                )}
              >
                <Radio aria-hidden="true" className="size-3" />
                {connected ? t.dash.connected : t.dash.reconnecting}
              </span>
            </span>

            <LocaleToggle />
            <ThemeToggle />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 pb-20 outline-none lg:pb-0">
          {children}
        </main>

        {/* phone bottom bar */}
        <nav
          aria-label={t.dash.navLabel}
          className="chrome edge-bottom fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <div className="flex items-stretch">
            {navItems
              .filter((item) => item.primary)
              .map((item) => {
                const active = isActive(item, current);
                return (
                  <Link
                    key={item.path}
                    href={href(item.path)}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "press flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px]",
                      active ? "font-medium text-[var(--brand)]" : "text-ink-muted",
                    )}
                  >
                    <item.icon className="size-[19px]" />
                    <span className="max-w-full truncate px-1">{item.label(t)}</span>
                  </Link>
                );
              })}
          </div>
        </nav>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} triggerRef={paletteTrigger} />
    </div>
  );
}
