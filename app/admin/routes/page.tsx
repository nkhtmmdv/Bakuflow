import Link from "next/link";
import { getAllRoutesForAdmin } from "@/lib/data/admin/routes";
import { createRoute, setRouteActive } from "@/lib/actions/admin/routes";

const ROUTE_TYPES = ["bus", "express_bus", "metro", "walking", "other"] as const;

export default async function AdminRoutesPage() {
  const routes = await getAllRoutesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Routes</h1>

      <form
        action={async (formData: FormData) => {
          "use server";
          await createRoute(formData);
        }}
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 className="text-sm font-semibold uppercase text-zinc-500">Add route</h2>
        <input name="code" placeholder="Code, e.g. 125" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900" />
        <input name="nameAz" placeholder="Name (AZ)" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900" />
        <input name="nameRu" placeholder="Name (RU)" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900" />
        <select name="type" required className="min-h-[44px] rounded-lg border border-zinc-300 px-3 dark:border-zinc-700 dark:bg-zinc-900">
          {ROUTE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDemo" />
          DEMO route (development testing only — never treat as real transport data)
        </label>
        <button type="submit" className="min-h-[44px] rounded-lg bg-emerald-700 px-4 font-semibold text-white">
          Add route
        </button>
      </form>

      <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {routes.map((route) => (
          <li key={route.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <Link href={`/admin/routes/${route.id}`} className="flex flex-col hover:underline">
              <span className="font-medium">
                {route.code} — {route.name_az}
                {route.is_demo && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">DEMO</span>}
              </span>
              <span className="text-xs text-zinc-500">
                {route.type} {!route.active && "· inactive"}
              </span>
            </Link>
            <form action={setRouteActive}>
              <input type="hidden" name="id" value={route.id} />
              <input type="hidden" name="active" value={(!route.active).toString()} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
              >
                {route.active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
