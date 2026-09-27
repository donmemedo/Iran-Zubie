"use client";

import { Check, Globe, Monitor, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { clsx } from "@/lib/format";
import { switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { useTheme, type ThemeChoice } from "@/lib/theme";

function useDismiss(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onDismiss();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);
  return ref;
}

const triggerClass =
  "inline-flex size-10 items-center justify-center rounded-xl border border-[var(--line)] " +
  "bg-[var(--surface)] text-ink-secondary transition-colors hover:text-ink hover:border-[var(--line-strong)]";

const menuClass =
  "absolute top-[calc(100%+8px)] z-50 min-w-[184px] overflow-hidden rounded-2xl border " +
  "border-[var(--line)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-pop)] " +
  "ltr:right-0 rtl:left-0";

const itemClass =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-secondary " +
  "transition-colors hover:bg-[var(--surface-sunken)] hover:text-ink";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved, setTheme } = useTheme();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));

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
        aria-expanded={open}
      >
        {resolved === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
      </button>
      {open && (
        <div className={menuClass} role="menu">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={itemClass}
            >
              <Icon className="size-4" />
              <span className="flex-1 text-start">{label}</span>
              {theme === value && <Check className="size-4 text-[var(--brand)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const localeNames: Record<Locale, string> = { fa: "فارسی", en: "English" };

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));

  return (
    <div className={clsx("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={clsx(triggerClass, "w-auto gap-2 px-3")}
        aria-label={t.common.language}
        aria-expanded={open}
      >
        <Globe className="size-[18px]" />
        <span className="text-[13px] font-medium">{locale === "fa" ? "فا" : "EN"}</span>
      </button>
      {open && (
        <div className={menuClass} role="menu">
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
        </div>
      )}
    </div>
  );
}
