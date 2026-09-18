"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { nodeName } from "@/components/features/NodeSelect";
import { deleteFavorite } from "@/lib/actions/favorites";
import { getOrCreateAnonymousSessionId } from "@/lib/anonymousSession";
import type { Favorite, TransportNode } from "@/types/database";

export function FavoritesList({
  favorites,
  nodesById,
  showDelete = false,
}: {
  favorites: Favorite[];
  nodesById: Map<string, TransportNode>;
  showDelete?: boolean;
}) {
  const { t, locale } = useI18n();

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {favorites.map((fav) => {
        const origin = nodesById.get(fav.origin_node_id);
        const destination = nodesById.get(fav.destination_node_id);
        return (
          <li key={fav.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <Link
              href={`/trip?origin=${fav.origin_node_id}&destination=${fav.destination_node_id}&sid=${
                typeof window !== "undefined" ? getOrCreateAnonymousSessionId() : ""
              }`}
              className="flex flex-col"
            >
              <span className="font-medium">{fav.title}</span>
              <span className="text-xs text-zinc-500">
                {origin ? nodeName(origin, locale) : "?"} → {destination ? nodeName(destination, locale) : "?"}
              </span>
            </Link>
            {showDelete && (
              <form action={deleteFavorite}>
                <input type="hidden" name="id" value={fav.id} />
                <button
                  type="submit"
                  aria-label={t("favorites.delete")}
                  className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
