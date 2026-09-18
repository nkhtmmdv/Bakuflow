import { getActiveNodes } from "@/lib/data/nodes";
import { getCrowdAggregates } from "@/lib/data/crowd";
import { MapViewLoader } from "@/components/features/MapViewLoader";
import type { MapNodeItem } from "@/components/features/MapView";
import { T } from "@/components/i18n/T";

export default async function MapPage() {
  const [nodes, aggregates] = await Promise.all([getActiveNodes(), getCrowdAggregates()]);

  const items: MapNodeItem[] = nodes.map((node) => {
    const aggregate = aggregates.get(node.id);
    return {
      node,
      crowdLevel: aggregate?.crowdLevel ?? "unknown",
      reportCount: aggregate?.reportCount ?? 0,
      confidence: aggregate?.confidence ?? "unknown",
      lastReportAt: aggregate?.lastReportAt ? aggregate.lastReportAt.toISOString() : null,
    };
  });

  return (
    <div className="flex flex-col gap-3 px-4 py-6">
      <h1 className="text-xl font-bold">
        <T k="map.title" />
      </h1>
      <MapViewLoader items={items} />
    </div>
  );
}
