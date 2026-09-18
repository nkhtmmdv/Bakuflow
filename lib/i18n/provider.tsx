"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  messagesByLocale,
  type Locale,
} from "@/lib/i18n/locales";

const STORAGE_KEY = "bakuflow.locale";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readMessage(locale: Locale, key: string): string | undefined {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = messagesByLocale[locale];
  for (const part of parts) {
    if (node == null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

// No cross-tab reactivity needed: this only powers the *initial* locale
// detection, so the subscription is a no-op (nothing ever re-triggers it).
function subscribeNever() {
  return () => {};
}

function detectLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
    const browserLang = window.navigator.language.slice(0, 2);
    if (isLocale(browserLang)) return browserLang;
  } catch {
    // localStorage unavailable (private mode etc.) - fall back to default.
  }
  return DEFAULT_LOCALE;
}

function getServerLocale(): Locale {
  return DEFAULT_LOCALE;
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  // useSyncExternalStore (not a state+effect pair) gives the SSR-safe value
  // on the first render and the real detected value right after hydration,
  // without ever calling setState from inside an effect.
  const detectedLocale = useSyncExternalStore(subscribeNever, detectLocale, getServerLocale);
  const [userOverride, setUserOverride] = useState<Locale | null>(null);

  const locale = initialLocale ?? userOverride ?? detectedLocale;

  const setLocale = useCallback((next: Locale) => {
    setUserOverride(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; language just won't persist across visits.
    }
    document.documentElement.lang = next;
  }, []);

  const t = useCallback<TranslateFn>(
    (key, params) => {
      const message = readMessage(locale, key) ?? readMessage(DEFAULT_LOCALE, key) ?? key;
      return interpolate(message, params);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export function useT(): TranslateFn {
  return useI18n().t;
}
