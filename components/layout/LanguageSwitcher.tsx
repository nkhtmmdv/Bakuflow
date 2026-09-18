"use client";

import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { useI18n } from "@/lib/i18n/provider";

const LABELS: Record<string, string> = { az: "AZ", ru: "RU" };

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800" role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            locale === code
              ? "bg-emerald-600 text-white"
              : "text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
