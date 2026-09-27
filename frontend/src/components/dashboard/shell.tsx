"use client";

import { LogOut, Menu, Radio, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CommandPalette } from "@/components/dashboard/command-palette";
import { navItems } from "@/components/dashboard/nav";
import { Logo } from "@/components/ui/logo";
import { LocaleToggle, ThemeToggle } from "@/components/ui/toggles";
import { useAuth } from "@/lib/auth";
import { clsx } from "@/lib/format";
import { useTelemetry } from "@/lib/hooks";
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
  const { t, locale, href } = useLocale();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { connected } = useTelemetry(true);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  const strip = (path: string) => path.replace(/^\/(fa|en)/, "") || "/";
  const current = strip(pathname);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
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

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href={href("/app")}>
          <Logo label={t.common.brand} />
        </Link>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="text-ink-muted hover:text-ink lg:hidden"
          aria-label={t.common.close}
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const active = item.path === "/app" ? current === "/app" : current.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={href(item.path)}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors",
                active
                  ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                  : "text-ink-secondary hover:bg-[var(--surface-sunken)] hover:text-ink",
              )}
            >
              {active && (
                <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-[var(--brand)]" />
              )}
              <item.icon className="size-[18px] shrink-0" />
              {item.label(t)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[13px] font-semibold text-[var(--brand-ink)]">
            {initials(displayName ?? "?")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{displayName}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{orgName}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-ink-muted transition-colors hover:text-[var(--critical)]"
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
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-e border-[var(--line)] bg-[var(--surface)] lg:block">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 start-0 w-[min(288px,84vw)] border-e border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--glass-line)] glass">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-ink lg:hidden"
              aria-label={t.dash.overview}
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
              type="button"
              onClick={() => setPalette(true)}
              className="ms-auto flex h-10 max-w-[320px] flex-1 items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 text-[13px] text-ink-muted transition-colors hover:border-[var(--line-strong)] sm:flex-none sm:w-[280px]"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">{t.dash.commandHint}</span>
              <kbd className="ms-auto hidden rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] sm:block">
                ⌘K
              </kbd>
            </button>

            <span
              className={clsx(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex",
                connected
                  ? "bg-[var(--good-soft)] text-[var(--good-text)]"
                  : "bg-[var(--warning-soft)] text-ink",
              )}
            >
              <Radio className="size-3" />
              {connected ? t.dash.connected : t.dash.reconnecting}
            </span>

            <LocaleToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>

        {/* phone bottom bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--glass-line)] glass lg:hidden">
          <div className="flex items-stretch">
            {navItems
              .filter((item) => item.primary)
              .map((item) => {
                const active = item.path === "/app" ? current === "/app" : current.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => router.push(href(item.path))}
                    className={clsx(
                      "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                      active ? "text-[var(--brand)]" : "text-ink-muted",
                    )}
                  >
                    <item.icon className="size-[19px]" />
                    <span className="max-w-full truncate px-1">{item.label(t)}</span>
                  </button>
                );
              })}
          </div>
        </nav>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
