"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/provider";

const ITEMS = [
  { href: "/", key: "nav.home", icon: "🏠" },
  { href: "/live", key: "nav.live", icon: "📍" },
  { href: "/report", key: "nav.report", icon: "✍️" },
  { href: "/favorites", key: "nav.favorites", icon: "⭐" },
  { href: "/profile", key: "nav.profile", icon: "👤" },
] as const;

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.home")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {item.icon}
                </span>
                <span>{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
