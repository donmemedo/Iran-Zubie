import type { Locale } from "@/lib/i18n";

/**
 * Persian output uses Persian-Indic digits and the Solar Hijri calendar,
 * which Intl gives us natively for the fa-IR locale.
 */
const numberLocale = (locale: Locale) => (locale === "fa" ? "fa-IR" : "en-US");

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

export function formatDecimal(value: number, locale: Locale, digits = 1): string {
  return formatNumber(value, locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Large toman amounts read better abbreviated than spelled out in full. */
export function formatToman(value: number, locale: Locale): string {
  if (value >= 1_000_000_000) {
    return `${formatDecimal(value / 1_000_000_000, locale, 1)} ${locale === "fa" ? "میلیارد" : "B"}`;
  }
  if (value >= 1_000_000) {
    return `${formatDecimal(value / 1_000_000, locale, 1)} ${locale === "fa" ? "میلیون" : "M"}`;
  }
  if (value >= 1_000) {
    return `${formatNumber(Math.round(value / 1_000), locale)} ${locale === "fa" ? "هزار" : "K"}`;
  }
  return formatNumber(value, locale);
}

export function formatPercent(value: number, locale: Locale, digits = 0): string {
  return `${formatDecimal(value, locale, digits)}٪`.replace("٪", locale === "fa" ? "٪" : "%");
}

export function formatDate(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(numberLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateShort(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(numberLocale(locale), { month: "short", day: "numeric" }).format(date);
}

export function formatTime(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(numberLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  return `${formatDate(value, locale)} · ${formatTime(value, locale)}`;
}

export function formatRelative(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(numberLocale(locale), { numeric: "auto" });
  if (seconds < 60) return formatter.format(-Math.max(seconds, 1), "second");
  if (seconds < 3600) return formatter.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86_400) return formatter.format(-Math.round(seconds / 3600), "hour");
  return formatter.format(-Math.round(seconds / 86_400), "day");
}

/** Pick the Persian or English variant of a bilingual record field. */
export function pick(item: object, field: string, locale: Locale): string {
  const record = item as Record<string, unknown>;
  const faValue = record[`${field}_fa`];
  if (locale === "fa" && typeof faValue === "string" && faValue.length > 0) return faValue;
  const value = record[field];
  return typeof value === "string" ? value : "";
}

export function clsx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
