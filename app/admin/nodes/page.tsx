import { getAllNodesForAdmin } from "@/lib/data/admin/nodes";
import { createNode, setNodeActive } from "@/lib/actions/admin/nodes";

const NODE_TYPES = ["metro", "bus_stop", "transport_hub", "other"] as const;

export default async function AdminNodesPage() {
  const nodes = await getAllNodesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Transport nodes</h1>

      <form
        action={async (formData: FormData) => {
          "use server";
          await createNode(formData);
        }}
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 className="text-sm font-semibold uppercase text-zinc-500">Add node</h2>
        <input name="nameAz" placeholder="Name (AZ)" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900" />
        <input name="nameRu" placeholder="Name (RU)" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900" />
        <input name="slug" placeholder="slug-like-this" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900" />
        <select name="type" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900">
          {NODE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            name="latitude"
            type="number"
            step="any"
            placeholder="Latitude"
            required
            className="min-h-[44px] w-1/2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="longitude"
            type="number"
            step="any"
            placeholder="Longitude"
            required
            className="min-h-[44px] w-1/2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button type="submit" className="min-h-[44px] rounded-lg bg-emerald-700 px-4 font-semibold text-white">
          Add node
        </button>
      </form>

      <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {nodes.map((node) => (
          <li key={node.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <div className="flex flex-col">
              <span className="font-medium">
                {node.name_az} / {node.name_ru}
              </span>
              <span className="text-xs text-zinc-500">
                {node.slug} · {node.type} {!node.active && "· inactive"}
              </span>
            </div>
            <form action={setNodeActive}>
              <input type="hidden" name="id" value={node.id} />
              <input type="hidden" name="active" value={(!node.active).toString()} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
              >
                {node.active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
