import az from "@/locales/az.json";
import ru from "@/locales/ru.json";

export const SUPPORTED_LOCALES = ["az", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "az";

/** Deep dictionary shape all locale files must match. */
export type Messages = typeof az;

export const messagesByLocale: Record<Locale, Messages> = { az, ru };

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
