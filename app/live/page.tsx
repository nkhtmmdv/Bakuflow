import { getActiveNodes } from "@/lib/data/nodes";
import { getCrowdAggregates } from "@/lib/data/crowd";
import { LiveList, type LiveItem } from "@/components/features/LiveList";
import { T } from "@/components/i18n/T";

export default async function LivePage() {
  const [nodes, aggregates] = await Promise.all([getActiveNodes(), getCrowdAggregates()]);

  const items: LiveItem[] = nodes.map((node) => {
    const aggregate = aggregates.get(node.id);
    return {
      node,
      crowdLevel: aggregate?.crowdLevel ?? "unknown",
      crowdScore: aggregate?.crowdScore ?? null,
      reportCount: aggregate?.reportCount ?? 0,
      confidence: aggregate?.confidence ?? "unknown",
      lastReportAt: aggregate?.lastReportAt ? aggregate.lastReportAt.toISOString() : null,
    };
  });

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold">
        <T k="live.title" />
      </h1>
      <LiveList initialItems={items} />
    </div>
  );
}
