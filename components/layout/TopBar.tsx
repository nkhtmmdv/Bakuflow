"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function TopBar({ title }: { title?: string }) {
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <Link href="/" className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
        {title ?? t("common.appName")}
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
