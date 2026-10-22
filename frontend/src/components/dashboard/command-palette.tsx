"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Car, CornerDownLeft, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";

import { navItems } from "@/components/dashboard/nav";
import { fade, spring } from "@/components/ui/motion";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import { api } from "@/lib/api";
import { clsx, formatNumber, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  action: () => void;
}

/** ⌘K palette over pages, vehicles and drivers: a modal dialog around a combobox. */
export function CommandPalette({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  /** The control that opened it; the dialog grows out of this point. */
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  const { t, locale, href } = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion();
  const id = useId();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [origin, setOrigin] = useState("50% 0%");
  const dialogRef = useFocusTrap<HTMLDivElement>(open, onClose);

  const { data: vehicles } = useApi(() => api.vehicles(), []);
  const { data: drivers } = useApi(() => api.drivers(), []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  // Transform-origin in the dialog's own coordinates: it is centred, max 560px
  // wide, and sits 12vh from the top. No trigger (⌘K) means top centre.
  useLayoutEffect(() => {
    if (!open) return;
    const box = triggerRef?.current?.getBoundingClientRect();
    if (!box) return setOrigin("50% 0%");
    const left = (window.innerWidth - Math.min(560, window.innerWidth - 32)) / 2;
    setOrigin(`${box.left + box.width / 2 - left}px ${box.bottom - window.innerHeight * 0.12}px`);
  }, [open, triggerRef]);

  const entries = useMemo<Entry[]>(() => {
    const pages: Entry[] = navItems.map((item) => ({
      id: `page:${item.path}`,
      label: item.label(t),
      hint: t.dash.overview,
      icon: item.icon,
      action: () => router.push(href(item.path)),
    }));

    const vehicleEntries: Entry[] = (vehicles ?? []).map((vehicle) => ({
      id: `vehicle:${vehicle.id}`,
      label: pick(vehicle, "name", locale),
      hint: vehicle.plate,
      icon: Car,
      action: () => router.push(href(`/app/vehicles/${vehicle.id}`)),
    }));

    const driverEntries: Entry[] = (drivers ?? []).map((driver) => ({
      id: `driver:${driver.id}`,
      label: pick(driver, "full_name", locale),
      hint: t.drivers.title,
      icon: User,
      action: () => router.push(href("/app/drivers")),
    }));

    const all = [...pages, ...vehicleEntries, ...driverEntries];
    const needle = query.trim().toLowerCase();
    if (!needle) return all.slice(0, 9);
    return all
      .filter(
        (entry) =>
          entry.label.toLowerCase().includes(needle) || entry.hint?.toLowerCase().includes(needle),
      )
      .slice(0, 12);
  }, [query, vehicles, drivers, t, locale, href, router]);

  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    document.getElementById(optionId(cursor))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, entries]);

  const choose = (entry: Entry | undefined) => {
    if (!entry) return;
    entry.action();
    onClose();
  };

  // Focus stays in the input; the list is driven through aria-activedescendant.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((value) => Math.min(value + 1, entries.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(entries[cursor]);
    }
  };

  const hidden = { opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : -6 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="scrim absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.dash.commandHint}
            tabIndex={-1}
            style={{ transformOrigin: origin }}
            initial={hidden}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={hidden}
            transition={reduce ? fade : spring}
            className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-[var(--shadow-pop)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
              <Search aria-hidden="true" className="size-[18px] shrink-0 text-ink-muted" />
              <input
                data-autofocus
                role="combobox"
                aria-expanded="true"
                aria-controls={`${id}-list`}
                aria-autocomplete="list"
                aria-activedescendant={entries[cursor] ? optionId(cursor) : undefined}
                aria-label={t.common.searchPlaceholder}
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursor(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t.common.searchPlaceholder}
                className="h-14 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-muted"
              />
              <kbd className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-ink-muted">
                esc
              </kbd>
            </div>

            <ul
              id={`${id}-list`}
              role="listbox"
              aria-label={t.common.search}
              className="scroll-thin max-h-[52dvh] overflow-y-auto p-2"
            >
              {entries.map((entry, index) => (
                <li
                  key={entry.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === cursor}
                  onMouseMove={() => setCursor(index)}
                  onClick={() => choose(entry)}
                  className={clsx(
                    "touch-target flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-start",
                    index === cursor && "bg-[var(--surface-sunken)]",
                  )}
                >
                  <entry.icon aria-hidden="true" className="size-[18px] shrink-0 text-ink-muted" />
                  <span className="flex-1 truncate text-[13.5px] text-ink">{entry.label}</span>
                  {entry.hint && (
                    <span className="shrink-0 text-[11.5px] text-ink-muted">{entry.hint}</span>
                  )}
                  {index === cursor && (
                    <CornerDownLeft aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" />
                  )}
                </li>
              ))}
            </ul>

            {/* Announces how many matches there are as the query changes. */}
            <p role="status" aria-live="polite" className={entries.length ? "sr-only" : "px-3 py-8 text-center text-[13px] text-ink-muted"}>
              {entries.length ? `${formatNumber(entries.length, locale)} ${t.vehicles.resultCount}` : t.common.none}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
