"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Globe, Monitor, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { fade, spring } from "@/components/ui/motion";
import { clsx } from "@/lib/format";
import { switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { useTheme, type ThemeChoice } from "@/lib/theme";

/** Closes on outside press and on Escape (returning focus to the trigger) while open. */
function useDismiss(open: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onDismiss();
      ref.current?.querySelector("button")?.focus();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onDismiss]);
  return ref;
}

const triggerClass =
  "press inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line)] " +
  "bg-[var(--surface)] text-ink-secondary hover:text-ink hover:border-[var(--line-strong)]";

const menuClass =
  "absolute top-[calc(100%+8px)] z-50 min-w-[184px] overflow-hidden rounded-2xl border " +
  "border-[var(--line)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-pop)] " +
  "ltr:right-0 rtl:left-0";

const itemClass =
  "press touch-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-secondary " +
  "hover:bg-[var(--surface-sunken)] hover:text-ink";

const focusChecked = (node: HTMLElement | null) =>
  void (node?.querySelector<HTMLElement>('[aria-checked="true"]') ?? node?.querySelector<HTMLElement>("button"))?.focus();

/**
 * Popover anchored to its trigger: it grows from the trigger's corner and
 * leaves along the same path. Arrow keys move between items.
 */
function Menu({ open, children }: { open: boolean; children: ReactNode }) {
  const { dir } = useLocale();
  const reduce = useReducedMotion();
  const hidden = { opacity: 0, scale: reduce ? 1 : 0.94 };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role^=menuitem]"));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={focusChecked}
          role="menu"
          className={menuClass}
          style={{ transformOrigin: dir === "rtl" ? "top left" : "top right" }}
          onKeyDown={onKeyDown}
          initial={hidden}
          animate={{ opacity: 1, scale: 1 }}
          exit={hidden}
          transition={reduce ? fade : { ...spring, duration: 0.25 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved, setTheme } = useTheme();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: "light", label: t.common.themeLight, icon: Sun },
    { value: "dark", label: t.common.themeDark, icon: Moon },
    { value: "system", label: t.common.themeSystem, icon: Monitor },
  ];

  return (
    <div className={clsx("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={triggerClass}
        aria-label={t.common.theme}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {resolved === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
      </button>
      <Menu open={open}>
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="menuitemradio"
            aria-checked={theme === value}
            onClick={() => {
              setTheme(value);
              setOpen(false);
              ref.current?.querySelector("button")?.focus();
            }}
            className={itemClass}
          >
            <Icon className="size-4" />
            <span className="flex-1 text-start">{label}</span>
            {theme === value && <Check className="size-4 text-[var(--brand)]" />}
          </button>
        ))}
      </Menu>
    </div>
  );
}

const localeNames: Record<Locale, string> = { fa: "فارسی", en: "English" };

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div className={clsx("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={clsx(triggerClass, "w-auto gap-2 px-3")}
        aria-label={t.common.language}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="size-[18px]" />
        <span className="text-[13px] font-medium">{locale === "fa" ? "فا" : "EN"}</span>
      </button>
      <Menu open={open}>
        {(Object.keys(localeNames) as Locale[]).map((value) => (
          <button
            key={value}
            type="button"
            role="menuitemradio"
            aria-checked={locale === value}
            onClick={() => {
              setOpen(false);
              router.push(switchLocalePath(pathname, value));
            }}
            className={itemClass}
          >
            <span className="flex-1 text-start">{localeNames[value]}</span>
            {locale === value && <Check className="size-4 text-[var(--brand)]" />}
          </button>
        ))}
      </Menu>
    </div>
  );
}
