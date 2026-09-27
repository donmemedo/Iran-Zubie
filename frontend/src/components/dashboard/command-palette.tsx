"use client";

import { Car, CornerDownLeft, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { navItems } from "@/components/dashboard/nav";
import { api } from "@/lib/api";
import { clsx, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useLocale } from "@/lib/locale-context";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  action: () => void;
}

/** ⌘K palette over pages, vehicles and drivers. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale, href } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: vehicles } = useApi(() => api.vehicles(), []);
  const { data: drivers } = useApi(() => api.drivers(), []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return onClose();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((value) => Math.min(value + 1, entries.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((value) => Math.max(value - 1, 0));
      }
      if (event.key === "Enter" && entries[cursor]) {
        event.preventDefault();
        entries[cursor].action();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, entries, cursor, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
          <Search className="size-[18px] shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            placeholder={t.common.searchPlaceholder}
            className="h-14 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-muted"
          />
          <kbd className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-ink-muted">
            esc
          </kbd>
        </div>

        <ul className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
          {entries.length === 0 && (
            <li className="px-3 py-8 text-center text-[13px] text-ink-muted">{t.common.none}</li>
          )}
          {entries.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => {
                  entry.action();
                  onClose();
                }}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
                  index === cursor ? "bg-[var(--surface-sunken)]" : "",
                )}
              >
                <entry.icon className="size-[18px] shrink-0 text-ink-muted" />
                <span className="flex-1 truncate text-[13.5px] text-ink">{entry.label}</span>
                {entry.hint && (
                  <span className="shrink-0 text-[11.5px] text-ink-muted">{entry.hint}</span>
                )}
                {index === cursor && <CornerDownLeft className="size-3.5 shrink-0 text-ink-muted" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
