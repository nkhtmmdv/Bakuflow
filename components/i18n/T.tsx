"use client";

import { useT } from "@/lib/i18n/provider";

/** Inline translation for otherwise-server-rendered text nodes. */
export function T({ k, params }: { k: string; params?: Record<string, string | number> }) {
  const t = useT();
  return <>{t(k, params)}</>;
}
