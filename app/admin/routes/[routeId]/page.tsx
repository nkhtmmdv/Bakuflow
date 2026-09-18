import { notFound } from "next/navigation";
import { getRouteDetail } from "@/lib/data/admin/routes";
import { getAllNodesForAdmin } from "@/lib/data/admin/nodes";
import { addRouteNode, removeRouteNode } from "@/lib/actions/admin/routes";

export default async function AdminRouteDetailPage({
  params,
}: PageProps<"/admin/routes/[routeId]">) {
  const { routeId } = await params;
  const [detail, nodes] = await Promise.all([getRouteDetail(routeId), getAllNodesForAdmin()]);

  if (!detail) notFound();
  const { route, stops } = detail;

  const nextSequence = stops.length > 0 ? stops[stops.length - 1].sequence + 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">
          {route.code} — {route.name_az}
        </h1>
        <p className="text-sm text-zinc-500">{route.type}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">Stops</h2>
        {stops.length === 0 ? (
          <p className="text-sm text-zinc-500">No stops yet.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {stops.map((stop) => (
              <li key={stop.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  #{stop.sequence} — {stop.node.name_az}{" "}
                  <span className="text-zinc-500">(+{stop.estimated_minutes_from_previous} min)</span>
                </span>
                <form action={removeRouteNode}>
                  <input type="hidden" name="id" value={stop.id} />
                  <input type="hidden" name="routeId" value={route.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-800 dark:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form
        action={async (formData: FormData) => {
          "use server";
          await addRouteNode(formData);
        }}
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 className="text-sm font-semibold uppercase text-zinc-500">Add stop</h2>
        <input type="hidden" name="routeId" value={route.id} />
        <select name="nodeId" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">Select node…</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name_az}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            name="sequence"
            type="number"
            defaultValue={nextSequence}
            required
            placeholder="Sequence"
            className="min-h-[44px] w-1/2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="estimatedMinutesFromPrevious"
            type="number"
            min={0}
            defaultValue={0}
            required
            placeholder="Minutes from previous stop"
            className="min-h-[44px] w-1/2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <p className="text-xs text-zinc-500">
          The first stop should have sequence 0 and 0 minutes. Sequence must be unique per route.
        </p>
        <button type="submit" className="min-h-[44px] rounded-lg bg-emerald-700 px-4 font-semibold text-white">
          Add stop
        </button>
      </form>
    </div>
  );
}
