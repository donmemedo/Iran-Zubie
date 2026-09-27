import type { Locale } from "@/lib/i18n";
import { en } from "./en";
import { fa, type Dictionary } from "./fa";

const dictionaries: Record<Locale, Dictionary> = { fa, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.fa;
}

export type { Dictionary };
