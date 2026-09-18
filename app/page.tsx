import { getActiveNodes } from "@/lib/data/nodes";
import { getCrowdAggregates } from "@/lib/data/crowd";
import { getCurrentUserFavorites } from "@/lib/data/favorites";
import { HomeSearchForm } from "@/components/features/HomeSearchForm";
import { FavoritesList } from "@/components/features/FavoritesList";
import { CityNowSnapshot, type CityNowItem } from "@/components/features/CityNowSnapshot";
import { T } from "@/components/i18n/T";

const CITY_NOW_LIMIT = 4;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const initialOriginId = typeof params.origin === "string" ? params.origin : undefined;
  const initialDestinationId = typeof params.destination === "string" ? params.destination : undefined;

  const [nodes, favorites, aggregates] = await Promise.all([
    getActiveNodes(),
    getCurrentUserFavorites(),
    getCrowdAggregates(),
  ]);

  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  const cityNowItems: CityNowItem[] = [...aggregates.entries()]
    .flatMap(([nodeId, agg]) => {
      const node = nodesById.get(nodeId);
      return node && agg.reportCount > 0 ? [{ node, agg }] : [];
    })
    .sort((a, b) => (b.agg.crowdScore ?? -1) - (a.agg.crowdScore ?? -1))
    .slice(0, CITY_NOW_LIMIT)
    .map(({ node, agg }) => ({
      node,
      crowdLevel: agg.crowdLevel,
      reportCount: agg.reportCount,
      lastReportAt: agg.lastReportAt ? agg.lastReportAt.toISOString() : null,
    }));

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <section className="flex flex-col gap-1 text-center">
        <h1 className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-400">
          <T k="home.title" />
        </h1>
        <p className="text-sm text-zinc-500">
          <T k="home.subtitle" />
        </p>
      </section>

      <section>
        <HomeSearchForm
          nodes={nodes}
          initialOriginId={initialOriginId}
          initialDestinationId={initialDestinationId}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          <T k="home.favoritesTitle" />
        </h2>
        {favorites.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            <T k="home.noFavorites" />
          </p>
        ) : (
          <FavoritesList favorites={favorites} nodesById={nodesById} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          <T k="home.cityNowTitle" />
        </h2>
        <CityNowSnapshot items={cityNowItems} />
      </section>
    </div>
  );
}
